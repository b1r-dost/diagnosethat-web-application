"""
Inference worker that pulls jobs from Cloudflare Queue
"""

import asyncio
import base64
import json
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from supabase import create_client, Client

from app.config import settings
from app.inference import InferencePipeline


class CloudflareQueueConsumer:
    """Handles communication with Cloudflare Queue HTTP Pull API"""
    
    def __init__(self, account_id: str, queue_id: str, token: str):
        self.pull_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/queues/{queue_id}/messages/pull"
        self.ack_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/queues/{queue_id}/messages/ack"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client
    
    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    async def pull(self, batch_size: int = 5, visibility_timeout_ms: int = 300000) -> tuple[list, int]:
        """
        Pull messages from Cloudflare Queue.
        
        Args:
            batch_size: Maximum number of messages to pull (1-100)
            visibility_timeout_ms: Time before message becomes visible again (min 1000ms)
            
        Returns:
            Tuple of (messages list, backlog count)
        """
        client = await self._get_client()
        
        response = await client.post(
            self.pull_url,
            headers=self.headers,
            json={
                "batch_size": batch_size,
                "visibility_timeout_ms": visibility_timeout_ms,
            },
        )
        response.raise_for_status()
        data = response.json()
        
        messages = data.get("result", {}).get("messages", [])
        backlog = data.get("result", {}).get("message_backlog_count", 0)
        
        return messages, backlog
    
    async def ack(
        self, 
        ack_ids: list[str], 
        retry_ids: list[str] | None = None, 
        retry_delay_seconds: int | None = None
    ):
        """
        Acknowledge or retry messages.
        
        Args:
            ack_ids: List of lease_ids to acknowledge (remove from queue)
            retry_ids: List of lease_ids to retry (make visible again)
            retry_delay_seconds: Delay before retry messages become visible
        """
        payload: dict[str, Any] = {
            "acks": [{"lease_id": lid} for lid in ack_ids],
        }
        
        if retry_ids:
            retries = []
            for lid in retry_ids:
                retry_obj: dict[str, Any] = {"lease_id": lid}
                if retry_delay_seconds is not None:
                    retry_obj["delay_seconds"] = retry_delay_seconds
                retries.append(retry_obj)
            payload["retries"] = retries
        
        client = await self._get_client()
        response = await client.post(
            self.ack_url,
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()


class InferenceWorker:
    """Worker that pulls from Cloudflare Queue and processes inference jobs"""
    
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.running = False
        self.models_loaded = False
        
        # Backoff settings
        self.backoff = settings.poll_interval
        self.max_backoff = settings.max_backoff
        
        # Stats
        self.jobs_processed = 0
        self.jobs_failed = 0
        self.last_job_time: datetime | None = None
        
        # Initialize Cloudflare Queue consumer
        self.queue = CloudflareQueueConsumer(
            account_id=settings.cf_account_id,
            queue_id=settings.cf_queue_id,
            token=settings.cf_queues_token,
        )
        
        # Initialize Supabase client
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
        
        # Initialize inference pipeline
        self.pipeline = InferencePipeline(
            model_path=Path(settings.model_path),
            confidence_threshold=settings.confidence_threshold,
            iou_threshold=settings.iou_threshold,
        )
    
    async def run(self):
        """Main worker loop"""
        self.running = True
        
        # Load models
        print(f"[{self.worker_id}] Loading models...")
        try:
            self.pipeline.load_models()
            self.models_loaded = True
            print(f"[{self.worker_id}] Models loaded successfully")
        except Exception as e:
            print(f"[{self.worker_id}] Failed to load models: {e}")
            return
        
        print(f"[{self.worker_id}] Starting Cloudflare Queue consumer loop")
        print(f"[{self.worker_id}] Queue: {settings.cf_queue_id}, Batch size: {settings.batch_size}")
        
        while self.running:
            try:
                # Pull messages from queue
                messages, backlog = await self.queue.pull(
                    batch_size=settings.batch_size,
                    visibility_timeout_ms=settings.visibility_timeout_ms,
                )
                
                if not messages:
                    # No messages, apply exponential backoff
                    await asyncio.sleep(self.backoff)
                    self.backoff = min(self.backoff * 1.5, self.max_backoff)
                    continue
                
                # Reset backoff on successful pull
                self.backoff = settings.poll_interval
                
                if backlog > 0:
                    print(f"[{self.worker_id}] Pulled {len(messages)} messages, {backlog} in backlog")
                
                # Process batch
                ack_ids: list[str] = []
                retry_ids: list[str] = []
                
                for msg in messages:
                    lease_id = msg["lease_id"]
                    body = msg.get("body", {})
                    
                    # Debug: raw message
                    print(f"[{self.worker_id}] Raw body: {type(body).__name__} = {repr(body)[:150]}")
                    
                    # Parse body - CF Queue HTTP Pull returns base64 encoded body
                    if isinstance(body, str):
                        try:
                            # Base64 decode first
                            decoded_bytes = base64.b64decode(body)
                            body = json.loads(decoded_bytes.decode('utf-8'))
                            print(f"[{self.worker_id}] Decoded body: {body}")
                        except Exception as decode_error:
                            # Fallback: direct JSON parse
                            try:
                                body = json.loads(body)
                            except json.JSONDecodeError:
                                print(f"[{self.worker_id}] Failed to decode message: {decode_error}")
                                ack_ids.append(lease_id)
                                continue
                    
                    job_id = body.get("job_id")
                    if not job_id:
                        print(f"[{self.worker_id}] Missing job_id in message, discarding")
                        ack_ids.append(lease_id)
                        continue
                    
                    # Claim job atomically in database (idempotency)
                    claimed = await self._claim_job(job_id)
                    if not claimed:
                        # Already claimed by another worker or not pending
                        print(f"[{self.worker_id}] Job {job_id} already claimed, skipping")
                        ack_ids.append(lease_id)
                        continue
                    
                    # Process the job
                    try:
                        await self._process_job(job_id, body.get("image_path"))
                        ack_ids.append(lease_id)
                        self.jobs_processed += 1
                        self.last_job_time = datetime.now()
                    except Exception as e:
                        print(f"[{self.worker_id}] Error processing job {job_id}: {e}")
                        traceback.print_exc()
                        # Mark as failed in DB, then ack (don't retry via queue)
                        await self._fail_job(job_id, str(e))
                        ack_ids.append(lease_id)
                        self.jobs_failed += 1
                
                # Acknowledge processed messages
                if ack_ids or retry_ids:
                    try:
                        await self.queue.ack(ack_ids, retry_ids, retry_delay_seconds=30)
                    except Exception as e:
                        print(f"[{self.worker_id}] Error acknowledging messages: {e}")
                    
            except httpx.HTTPStatusError as e:
                print(f"[{self.worker_id}] Queue API error: {e.response.status_code} - {e.response.text}")
                await asyncio.sleep(5.0)
            except Exception as e:
                print(f"[{self.worker_id}] Error in worker loop: {e}")
                traceback.print_exc()
                await asyncio.sleep(1.0)
        
        # Cleanup
        await self.queue.close()
    
    async def _claim_job(self, job_id: str) -> bool:
        """
        Atomically claim a job in the database.
        
        Uses optimistic concurrency: UPDATE ... WHERE status='pending'
        Returns True only if this worker successfully claimed the job.
        """
        try:
            result = self.supabase.from_('jobs').update({
                'status': 'processing',
                'started_at': datetime.now().isoformat(),
                'worker_id': self.worker_id,
            }).eq('id', job_id).eq('status', 'pending').execute()
            
            # Check if any row was updated
            return len(result.data) > 0
            
        except Exception as e:
            print(f"[{self.worker_id}] Error claiming job {job_id}: {e}")
            return False
    
    async def _process_job(self, job_id: str, image_path: str | None = None):
        """Process a claimed job"""
        print(f"[{self.worker_id}] Processing job {job_id}")
        start_time = datetime.now()
        
        # Get image_path from DB if not in message
        if not image_path:
            result = self.supabase.from_('jobs').select('image_path').eq('id', job_id).single().execute()
            image_path = result.data.get('image_path') if result.data else None
        
        if not image_path:
            raise Exception("No image_path found for job")
        
        # Download image from storage
        image_bytes = await self._download_image(image_path)
        if not image_bytes:
            raise Exception("Failed to download image from storage")
        
        # Run inference pipeline
        result = self.pipeline.analyze(image_bytes)
        
        # Update job with results
        await self._complete_job(job_id, result)
        
        duration = (datetime.now() - start_time).total_seconds()
        print(f"[{self.worker_id}] Completed job {job_id} in {duration:.2f}s")
    
    async def _download_image(self, storage_path: str) -> bytes | None:
        """Download image from Supabase storage"""
        try:
            response = self.supabase.storage.from_('radiographs').download(storage_path)
            return response
        except Exception as e:
            print(f"[{self.worker_id}] Error downloading image: {e}")
            return None
    
    async def _complete_job(self, job_id: str, result: dict[str, Any]):
        """Mark job as completed with results stored in Supabase Storage"""
        # Upload result JSON to storage (avoids large DB writes)
        result_json_bytes = json.dumps(result, ensure_ascii=False).encode('utf-8')
        result_path = f"jobs/{job_id}/result.json"
        
        self.supabase.storage.from_('results').upload(
            result_path,
            result_json_bytes,
            file_options={"content-type": "application/json"}
        )
        
        print(f"[{self.worker_id}] Result uploaded: {result_path} ({len(result_json_bytes)} bytes)")
        
        # Update database with path and metadata only
        self.supabase.from_('jobs').update({
            'status': 'completed',
            'completed_at': datetime.now().isoformat(),
            'radiograph_type': result.get('radiograph_type'),
            'inference_version': result.get('inference_version', '1.0.0'),
            'result_path': result_path,
        }).eq('id', job_id).execute()
    
    async def _fail_job(self, job_id: str, error_message: str):
        """Mark job as failed"""
        try:
            self.supabase.from_('jobs').update({
                'status': 'failed',
                'completed_at': datetime.now().isoformat(),
                'error_message': error_message[:500],  # Truncate if too long
            }).eq('id', job_id).execute()
        except Exception as e:
            print(f"[{self.worker_id}] Error failing job: {e}")
    
    def stop(self):
        """Stop the worker gracefully"""
        print(f"[{self.worker_id}] Stopping worker...")
        self.running = False
    
    def get_stats(self) -> dict[str, Any]:
        """Get worker statistics"""
        return {
            "worker_id": self.worker_id,
            "models_loaded": self.models_loaded,
            "running": self.running,
            "jobs_processed": self.jobs_processed,
            "jobs_failed": self.jobs_failed,
            "last_job_time": self.last_job_time.isoformat() if self.last_job_time else None,
        }
