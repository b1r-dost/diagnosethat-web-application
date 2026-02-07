-- Kritik Güvenlik Düzeltmesi: admin privilege escalation engelleme
-- Tehlikeli policy'yi kaldır
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;

-- Güvenli policy ekle - sadece dentist/patient izinli, tek seferlik
CREATE POLICY "Users can insert safe roles during signup"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND role IN ('dentist', 'patient')
        AND NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );