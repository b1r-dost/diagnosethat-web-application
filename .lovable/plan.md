
## What’s happening (step-by-step)

1. **The UI uploads an image and calls the Edge Function**  
   `DemoAnalysis.tsx` sends:
   ```ts
   POST /functions/v1/demo-analysis?action=submit
   body: { image_base64, clinic_ref }
   ```

2. **The Edge Function successfully calls the Gateway API**  
   Your `demo-analysis` edge function submits `multipart/form-data` correctly and the Gateway responds **200** with a payload like:
   ```json
   {
     "success": true,
     "data": {
       "job_id": "....",
       "status": "pending"
     }
   }
   ```
   (This matches your earlier network/edge logs.)

3. **But the frontend expects a different JSON shape**  
   In `DemoAnalysis.tsx`, the code checks:
   ```ts
   if (!submitResult.job_id) throw new Error("No job_id received");
   ```
   However the job id is actually at:
   ```ts
   submitResult.data.job_id
   ```
   So the UI throws, and shows: **“Görüntü yüklenirken hata oluştu.”**

4. **Polling likely has the same “nested data” issue**  
   The UI later expects:
   ```ts
   pollResult.status
   pollResult.result
   ```
   But the Gateway commonly wraps those under `data` as well (e.g. `pollResult.data.status`).

## Fix strategy (robust and future-proof)

### Option A (recommended): Normalize responses inside the Edge Function
Make the edge function always return a consistent, “flat” JSON response to the frontend, regardless of how the Gateway wraps it.

**Changes in `supabase/functions/demo-analysis/index.ts`:**
- For `action=submit`:
  - Extract `job_id` from `submitResult.job_id || submitResult.data?.job_id`
  - Return:
    ```json
    { "job_id": "...", "status": "pending" }
    ```
  - If missing, return 500 with a clear error including the raw Gateway response for debugging.

- For `action=poll`:
  - Extract `status/result/error` from either top-level or `data`
  - Return:
    ```json
    { "status": "...", "result": {...} }
    ```
  - If Gateway returns wrapper fields, unwrap them.

**Why this is best:**  
You keep the frontend simple and stable, and can change Gateway integration without breaking the UI again.

### Option B (also do this for extra safety): Update the frontend to accept both shapes
In `src/components/home/DemoAnalysis.tsx`:
- After `submitResponse.json()`, compute:
  ```ts
  const jobId = submitResult.job_id ?? submitResult.data?.job_id;
  ```
- Use `jobId` for the “No job_id received” check and for polling.
- In polling, read:
  ```ts
  const status = pollResult.status ?? pollResult.data?.status;
  const result = pollResult.result ?? pollResult.data?.result;
  const error = pollResult.error ?? pollResult.data?.error;
  ```
This makes the UI resilient even if someone later changes the edge function response shape.

## Implementation steps (what I will change after you approve)

1. **Edit `supabase/functions/demo-analysis/index.ts`**
   - Add response normalization for both `submit` and `poll`.
   - Improve logging:
     - Log the Gateway response once
     - Log extracted `job_id` and extracted `status`
   - Ensure errors returned to the client are informative but not overly verbose.

2. **Edit `src/components/home/DemoAnalysis.tsx`**
   - Accept both `{ job_id }` and `{ data: { job_id } }` response shapes.
   - Accept both poll shapes similarly.
   - Improve error UI by showing a more specific message when available (while still defaulting to `t.home.demo.uploadError`).

3. **Test end-to-end**
   - Upload a JPG/PNG/WebP on the home page demo.
   - Confirm:
     - “Analiz başlatılıyor…” transitions to “Analiz yapılıyor…”
     - Polling completes and overlays render
     - No “No job_id received” in console

## Notes / related (not required for this fix)
- Your console/network logs show a separate issue: `roadmap_items` query fails with `Invalid schema: public` (only schema `api` exposed). This is unrelated to the demo upload error, but it will keep spamming logs until fixed. If you want, I can plan a second fix for that after the demo analysis is stable.

## Files involved
- `supabase/functions/demo-analysis/index.ts` (normalize Gateway response; better logs)
- `src/components/home/DemoAnalysis.tsx` (read job_id/status from both top-level and nested shapes)

## Acceptance criteria
- Uploading an image no longer shows “Görüntü yüklenirken hata oluştu.”
- The demo reliably receives a `job_id`, polls, and renders results when the Gateway completes
- Console is free of “No job_id received”
