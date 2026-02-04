-- 1) jobs tablosuna result_path ekle
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS result_path TEXT;

COMMENT ON COLUMN public.jobs.result_path IS 'Path to result JSON file in storage (results bucket)';

-- 2) results storage bucket oluştur (100MB limit, private)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('results', 'results', false, 104857600)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    public = EXCLUDED.public;

-- 3) service_role için results bucket full access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role full access on results'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Service role full access on results"
      ON storage.objects
      FOR ALL
      TO service_role
      USING (bucket_id = 'results')
      WITH CHECK (bucket_id = 'results');
    $pol$;
  END IF;
END $$;