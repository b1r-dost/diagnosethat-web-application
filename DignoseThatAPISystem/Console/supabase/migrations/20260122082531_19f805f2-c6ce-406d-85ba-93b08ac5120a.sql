-- ============================================
-- DiagnoseThat - Phase 1: Complete Database Schema
-- ============================================

-- 1. ENUM DEFINITIONS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.company_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.radiograph_type AS ENUM ('panoramic', 'bitewing', 'periapical', 'unsupported_image_type');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled');

-- 2. PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- 3. USER ROLES TABLE (separate for security)
-- ============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 4. COMPANIES TABLE
-- ============================================
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status public.company_status NOT NULL DEFAULT 'active',
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 5. COMPANY MEMBERS TABLE
-- ============================================
CREATE TABLE public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check company membership
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.company_members
        WHERE user_id = _user_id
          AND company_id = _company_id
    )
$$;

-- Helper function to check company ownership
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.companies
        WHERE id = _company_id
          AND owner_id = _user_id
    )
$$;

-- Companies RLS policies
CREATE POLICY "Members can view their companies"
    ON public.companies FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Owners can update their companies"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create companies"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all companies"
    ON public.companies FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Company members RLS policies
CREATE POLICY "Members can view company members"
    ON public.company_members FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can manage company members"
    ON public.company_members FOR ALL
    TO authenticated
    USING (public.is_company_owner(auth.uid(), company_id));

CREATE POLICY "Admins can manage all company members"
    ON public.company_members FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 6. API KEYS TABLE
-- ============================================
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    rate_limit INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company API keys"
    ON public.api_keys FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can manage company API keys"
    ON public.api_keys FOR ALL
    TO authenticated
    USING (public.is_company_owner(auth.uid(), company_id));

CREATE POLICY "Admins can manage all API keys"
    ON public.api_keys FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 7. JOBS TABLE (Analysis Queue)
-- ============================================
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    request_id TEXT NOT NULL,
    image_path TEXT NOT NULL,
    status public.job_status NOT NULL DEFAULT 'pending',
    radiograph_type public.radiograph_type,
    result_json JSONB,
    error_message TEXT,
    inference_version TEXT,
    worker_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    -- Idempotency constraint (prevents race conditions)
    CONSTRAINT jobs_company_request_unique UNIQUE (company_id, request_id)
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Index for job queue processing
CREATE INDEX idx_jobs_pending ON public.jobs (created_at) WHERE status = 'pending';
CREATE INDEX idx_jobs_company ON public.jobs (company_id, created_at DESC);

CREATE POLICY "Members can view company jobs"
    ON public.jobs FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage all jobs"
    ON public.jobs FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 8. API LOGS TABLE
-- ============================================
CREATE TABLE public.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    clinic_ref TEXT,
    doctor_ref TEXT,
    patient_ref TEXT,
    request_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    response_timestamp TIMESTAMPTZ,
    status_code INTEGER,
    error_message TEXT,
    is_billable BOOLEAN DEFAULT true
);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_api_logs_company ON public.api_logs (company_id, request_timestamp DESC);
CREATE INDEX idx_api_logs_job ON public.api_logs (job_id) WHERE job_id IS NOT NULL;

CREATE POLICY "Members can view company logs"
    ON public.api_logs FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage all logs"
    ON public.api_logs FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 9. PRICING SETTINGS TABLE
-- ============================================
CREATE TABLE public.pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    price_per_analysis DECIMAL(10, 4) NOT NULL DEFAULT 0.50,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- NULL company_id means default pricing
    UNIQUE (company_id)
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company pricing"
    ON public.pricing_settings FOR SELECT
    TO authenticated
    USING (company_id IS NULL OR public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage pricing"
    ON public.pricing_settings FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 10. INVOICES TABLE
-- ============================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_analyses INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 4) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_invoices_company ON public.invoices (company_id, period_start DESC);

CREATE POLICY "Members can view company invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- 11. DATABASE FUNCTIONS
-- ============================================

-- Job claiming function with row locking (FOR UPDATE SKIP LOCKED)
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
    
    IF claimed_job.id IS NOT NULL THEN
        UPDATE public.jobs
        SET status = 'processing',
            started_at = now(),
            worker_id = p_worker_id
        WHERE id = claimed_job.id;
        
        -- Re-fetch to get updated values
        SELECT * INTO claimed_job
        FROM public.jobs
        WHERE id = claimed_job.id;
    END IF;
    
    RETURN claimed_job;
END;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_settings_updated_at
    BEFORE UPDATE ON public.pricing_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('radiographs', 'radiographs', false);

-- Storage RLS: Only service role can access (API Gateway uses service role)
CREATE POLICY "Service role full access"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'radiographs');

-- 14. INSERT DEFAULT PRICING
-- ============================================
INSERT INTO public.pricing_settings (company_id, price_per_analysis, currency)
VALUES (NULL, 0.50, 'USD');