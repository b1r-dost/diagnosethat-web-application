"""
DiagnoseThat GPU Inference Service
Main FastAPI application
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from prometheus_client import make_asgi_app, Counter, Histogram, Gauge

from app.config import settings
from app.worker import InferenceWorker

# Prometheus metrics
JOBS_PROCESSED = Counter(
    'inference_jobs_processed_total',
    'Total number of jobs processed',
    ['status', 'radiograph_type']
)
JOB_DURATION = Histogram(
    'inference_job_duration_seconds',
    'Time spent processing a job',
    ['radiograph_type']
)
QUEUE_SIZE = Gauge(
    'inference_queue_size',
    'Current number of pending jobs'
)
GPU_MEMORY_USED = Gauge(
    'inference_gpu_memory_bytes',
    'GPU memory usage in bytes'
)

# Worker instance
worker: InferenceWorker | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global worker
    
    # Startup
    print(f"Starting inference worker: {settings.worker_id}")
    worker = InferenceWorker(
        worker_id=settings.worker_id,
    )
    
    # Start worker in background
    worker_task = asyncio.create_task(worker.run())
    
    yield
    
    # Shutdown
    print("Shutting down inference worker...")
    if worker:
        worker.stop()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="DiagnoseThat Inference Service",
    description="GPU-powered dental radiograph analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# Mount Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    import torch
    
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else None
    
    # Update GPU memory metric
    if gpu_available:
        memory_allocated = torch.cuda.memory_allocated(0)
        GPU_MEMORY_USED.set(memory_allocated)
    
    return {
        "status": "healthy" if gpu_available else "degraded",
        "worker_id": settings.worker_id,
        "gpu": {
            "available": gpu_available,
            "name": gpu_name,
            "memory_allocated": torch.cuda.memory_allocated(0) if gpu_available else 0,
            "memory_reserved": torch.cuda.memory_reserved(0) if gpu_available else 0,
        },
        "models_loaded": worker.models_loaded if worker else False,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "DiagnoseThat Inference",
        "version": "1.0.0",
        "worker_id": settings.worker_id,
    }
