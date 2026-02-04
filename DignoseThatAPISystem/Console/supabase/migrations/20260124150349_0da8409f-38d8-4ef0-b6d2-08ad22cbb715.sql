-- Eksik FK indeksleri ekle (Disk IO azaltır)
CREATE INDEX IF NOT EXISTS idx_companies_owner_id 
ON public.companies(owner_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_company_id 
ON public.api_keys(company_id);

CREATE INDEX IF NOT EXISTS idx_jobs_api_key_id 
ON public.jobs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_logs_api_key_id 
ON public.api_logs(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_logs_company_id
ON public.api_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id
ON public.jobs(company_id);