-- Performans İyileştirmesi: Sık kullanılan sorgular için indeksler

-- Patients: dentist_id ile filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_patients_dentist_created 
ON public.patients(dentist_id, created_at DESC);

-- Radiographs: owner_user_id ile filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_radiographs_owner_created 
ON public.radiographs(owner_user_id, created_at DESC);

-- Radiographs: patient_id ile filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_radiographs_patient_created 
ON public.radiographs(patient_id, created_at DESC);

-- Radiographs: analysis_status filtreleme (pending count için)
CREATE INDEX IF NOT EXISTS idx_radiographs_analysis_status 
ON public.radiographs(analysis_status);

-- Announcements: is_active filtreleme + priority/created_at sıralama
CREATE INDEX IF NOT EXISTS idx_announcements_active_priority 
ON public.announcements(is_active, priority DESC, created_at DESC);

-- Suggestions: user_id filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_suggestions_user_created 
ON public.suggestions(user_id, created_at DESC);

-- Subscriptions: user_id filtreleme
CREATE INDEX IF NOT EXISTS idx_subscriptions_user 
ON public.subscriptions(user_id);

-- User roles: user_id filtreleme (has_role fonksiyonu için)
CREATE INDEX IF NOT EXISTS idx_user_roles_user 
ON public.user_roles(user_id);