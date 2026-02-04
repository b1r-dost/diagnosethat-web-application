-- Drop unique constraint on (company_id, request_id)
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_company_request_unique;

-- Make request_id nullable for backward compatibility
ALTER TABLE public.jobs ALTER COLUMN request_id DROP NOT NULL;