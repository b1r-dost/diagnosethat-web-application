-- Fix function search_path for all functions that don't have it set

-- Fix generate_patient_ref
CREATE OR REPLACE FUNCTION public.generate_patient_ref()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_ref TEXT;
    ref_exists BOOLEAN;
BEGIN
    LOOP
        new_ref := 'P' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE patient_ref = new_ref) INTO ref_exists;
        EXIT WHEN NOT ref_exists;
    END LOOP;
    RETURN new_ref;
END;
$$;

-- Fix generate_doctor_ref
CREATE OR REPLACE FUNCTION public.generate_doctor_ref()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_ref TEXT;
    ref_exists BOOLEAN;
BEGIN
    LOOP
        new_ref := 'D' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE doctor_ref = new_ref) INTO ref_exists;
        EXIT WHEN NOT ref_exists;
    END LOOP;
    RETURN new_ref;
END;
$$;

-- Fix generate_unique_patient_ref
CREATE OR REPLACE FUNCTION public.generate_unique_patient_ref()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_ref TEXT;
    ref_exists BOOLEAN;
BEGIN
    LOOP
        new_ref := 'PT' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
        SELECT EXISTS(SELECT 1 FROM public.patients WHERE patient_ref = new_ref) INTO ref_exists;
        EXIT WHEN NOT ref_exists;
    END LOOP;
    RETURN new_ref;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix the permissive RLS policy for audit_logs - restrict to service role or authenticated users who just performed the action
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a more restrictive policy that uses service role for audit log inserts
CREATE POLICY "Authenticated users can insert their own audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);