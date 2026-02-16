
-- Create legal_documents table
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL UNIQUE,
  file_url text,
  original_filename text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can view legal documents"
ON public.legal_documents
FOR SELECT
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert legal documents"
ON public.legal_documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update legal documents"
ON public.legal_documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete legal documents"
ON public.legal_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create legal-documents storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('legal-documents', 'legal-documents', true);

-- Storage policies: anyone can read
CREATE POLICY "Anyone can view legal documents files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'legal-documents');

-- Only admins can upload
CREATE POLICY "Admins can upload legal documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'legal-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update legal documents files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'legal-documents' AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete legal documents files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'legal-documents' AND has_role(auth.uid(), 'admin'::app_role));
