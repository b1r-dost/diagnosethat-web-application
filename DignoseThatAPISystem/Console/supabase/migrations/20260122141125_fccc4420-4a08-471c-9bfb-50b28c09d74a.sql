CREATE OR REPLACE FUNCTION public.claim_next_job(p_worker_id TEXT)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claimed_job public.jobs;
BEGIN
    SELECT * INTO claimed_job
    FROM public.jobs
    WHERE status = 'pending'
      AND expires_at > now()
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    -- KRİTİK: job yoksa "boş kayıt" değil, gerçek NULL dön
    IF claimed_job.id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.jobs
    SET status = 'processing',
        started_at = now(),
        worker_id = p_worker_id
    WHERE id = claimed_job.id;

    SELECT * INTO claimed_job
    FROM public.jobs
    WHERE id = claimed_job.id;

    RETURN claimed_job;
END;
$$;