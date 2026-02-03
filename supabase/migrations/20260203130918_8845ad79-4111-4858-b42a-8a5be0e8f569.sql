-- Create role enum for the application
CREATE TYPE public.app_role AS ENUM ('admin', 'dentist', 'patient');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'dentist' THEN 2 
      WHEN 'patient' THEN 3 
    END
  LIMIT 1
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    patient_ref TEXT UNIQUE,
    doctor_ref TEXT UNIQUE,
    institution_name TEXT,
    institution_logo_url TEXT,
    country TEXT,
    phone TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Generate unique reference numbers
CREATE OR REPLACE FUNCTION public.generate_patient_ref()
RETURNS TEXT
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.generate_doctor_ref()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Trigger to auto-generate refs on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.patient_ref IS NULL THEN
        NEW.patient_ref := generate_patient_ref();
    END IF;
    IF NEW.doctor_ref IS NULL THEN
        NEW.doctor_ref := generate_doctor_ref();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Patients table (for dentist's patients)
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    identity_number TEXT,
    phone TEXT,
    address TEXT,
    birth_date DATE,
    patient_ref TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Generate patient ref for dentist's patients
CREATE OR REPLACE FUNCTION public.generate_unique_patient_ref()
RETURNS TEXT
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.handle_new_patient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.patient_ref IS NULL OR NEW.patient_ref = '' THEN
        NEW.patient_ref := generate_unique_patient_ref();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_patient_created
    BEFORE INSERT ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_patient();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Radiographs table
CREATE TABLE public.radiographs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    original_filename TEXT,
    file_size INTEGER,
    radiograph_type TEXT,
    job_id TEXT,
    analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed', 'unsupported')),
    analysis_result JSONB,
    analysis_result_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT radiograph_owner CHECK (owner_user_id IS NOT NULL OR patient_id IS NOT NULL)
);

ALTER TABLE public.radiographs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_radiographs_updated_at
    BEFORE UPDATE ON public.radiographs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Subscriptions / Support packages
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_month TEXT NOT NULL,
    package_year INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    payment_provider TEXT,
    payment_reference TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Suggestions / Tickets
CREATE TYPE public.suggestion_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TABLE public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    status suggestion_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_suggestions_updated_at
    BEFORE UPDATE ON public.suggestions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Suggestion responses (admin replies)
CREATE TABLE public.suggestion_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestion_responses ENABLE ROW LEVEL SECURITY;

-- Announcements
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_tr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    content_tr TEXT NOT NULL,
    content_en TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Roadmap items
CREATE TABLE public.roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_tr TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_tr TEXT,
    description_en TEXT,
    icon TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_roadmap_items_updated_at
    BEFORE UPDATE ON public.roadmap_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Dismissed prompts (for support package popup)
CREATE TABLE public.dismissed_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL,
    dismissed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, prompt_type, dismissed_at)
);

ALTER TABLE public.dismissed_prompts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Patients policies
CREATE POLICY "Dentists can view their own patients"
ON public.patients FOR SELECT
TO authenticated
USING (auth.uid() = dentist_id);

CREATE POLICY "Admins can view all patients"
ON public.patients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dentists can insert their own patients"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = dentist_id AND public.has_role(auth.uid(), 'dentist'));

CREATE POLICY "Dentists can update their own patients"
ON public.patients FOR UPDATE
TO authenticated
USING (auth.uid() = dentist_id);

CREATE POLICY "Dentists can delete their own patients"
ON public.patients FOR DELETE
TO authenticated
USING (auth.uid() = dentist_id);

-- Radiographs policies
CREATE POLICY "Users can view their own radiographs"
ON public.radiographs FOR SELECT
TO authenticated
USING (
    auth.uid() = owner_user_id OR
    patient_id IN (SELECT id FROM public.patients WHERE dentist_id = auth.uid())
);

CREATE POLICY "Admins can view all radiographs"
ON public.radiographs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert radiographs"
ON public.radiographs FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = owner_user_id OR
    patient_id IN (SELECT id FROM public.patients WHERE dentist_id = auth.uid())
);

CREATE POLICY "Users can update their own radiographs"
ON public.radiographs FOR UPDATE
TO authenticated
USING (
    auth.uid() = owner_user_id OR
    patient_id IN (SELECT id FROM public.patients WHERE dentist_id = auth.uid())
);

CREATE POLICY "Users can delete their own radiographs"
ON public.radiographs FOR DELETE
TO authenticated
USING (
    auth.uid() = owner_user_id OR
    patient_id IN (SELECT id FROM public.patients WHERE dentist_id = auth.uid())
);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own subscriptions"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Suggestions policies
CREATE POLICY "Users can view their own suggestions"
ON public.suggestions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suggestions"
ON public.suggestions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Dentists can insert suggestions"
ON public.suggestions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'dentist'));

CREATE POLICY "Users can update their own suggestions"
ON public.suggestions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all suggestions"
ON public.suggestions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Suggestion responses policies
CREATE POLICY "Users can view responses to their suggestions"
ON public.suggestion_responses FOR SELECT
TO authenticated
USING (
    suggestion_id IN (SELECT id FROM public.suggestions WHERE user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can insert responses"
ON public.suggestion_responses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Announcements policies (public read)
CREATE POLICY "Anyone can view active announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Roadmap items policies (public read)
CREATE POLICY "Anyone can view active roadmap items"
ON public.roadmap_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage roadmap items"
ON public.roadmap_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Dismissed prompts policies
CREATE POLICY "Users can view their own dismissed prompts"
ON public.dismissed_prompts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dismissed prompts"
ON public.dismissed_prompts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for radiographs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'radiographs',
    'radiographs',
    false,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage bucket for suggestion images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'suggestions',
    'suggestions',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage bucket for institution logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'logos',
    'logos',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
);

-- Storage policies for radiographs
CREATE POLICY "Users can upload their own radiographs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'radiographs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own radiographs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'radiographs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Dentists can view their patients radiographs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'radiographs' AND
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.dentist_id = auth.uid()
        AND (storage.foldername(name))[1] = 'patients'
        AND (storage.foldername(name))[2] = p.id::text
    )
);

CREATE POLICY "Users can delete their own radiographs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'radiographs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for logos
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for suggestions
CREATE POLICY "Users can upload suggestion images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'suggestions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own suggestion images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'suggestions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all suggestion images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'suggestions' AND public.has_role(auth.uid(), 'admin'));

-- Insert initial roadmap items
INSERT INTO public.roadmap_items (title_tr, title_en, description_tr, description_en, icon, display_order) VALUES
('Performans Metrikleri', 'Performance Metrics', 'Uygulamaya ait detaylı performans metriklerinin eklenmesi', 'Adding detailed performance metrics for the application', 'ChartBar', 1),
('Klinik Onaylar', 'Clinical Approvals', 'Klinik kullanım için gerekli onayların alınması', 'Obtaining necessary approvals for clinical use', 'ShieldCheck', 2),
('3D Görüntü Analizi', '3D Image Analysis', '3 boyutlu dental görüntülerin analizi', 'Analysis of 3-dimensional dental images', 'Box', 3),
('Otomatik Sağ-Sol Ayırımı', 'Auto Left-Right Detection', 'Bitewing radyograflar için otomatik sağ sol ayırımı', 'Automatic left-right separation for bitewing radiographs', 'ArrowLeftRight', 4),
('Ters Radyograf Düzeltme', 'Inverted Radiograph Correction', 'Bitewing radyograflar için otomatik ters radyograf düzeltme', 'Automatic inverted radiograph correction for bitewing radiographs', 'RotateCcw', 5),
('Kurumsal Kullanım', 'Enterprise Use', 'Bireysel kullanımın yanında kurumsal kullanım için altyapı düzenlenmesi', 'Infrastructure arrangement for enterprise use alongside individual use', 'Building', 6),
('Manuel Düzeltme', 'Manual Correction', 'Analizler üzerinde el ile tespitleri düzeltme işlevi', 'Manual correction of detections on analyses', 'Pencil', 7),
('Araştırmacı Platformu', 'Researcher Platform', 'Araştırmacılar için Yapay Zeka modellerini test edebilecekleri platform yapılanması', 'Platform structure for researchers to test AI models', 'FlaskConical', 8);