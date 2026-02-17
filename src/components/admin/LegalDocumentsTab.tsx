import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LegalDoc {
  id: string;
  document_type: string;
  file_url: string | null;
  original_filename: string | null;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'pre_information',
  'distance_sales',
] as const;

export function LegalDocumentsTab() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    const { data } = await supabase
      .from('legal_documents')
      .select('*');
    setDocs(data || []);
    setLoading(false);
  };

  const getDocLabel = (type: string) => {
    switch (type) {
      case 'terms_of_service': return t.legal.termsOfService;
      case 'privacy_policy': return t.legal.privacyPolicy;
      case 'pre_information': return t.legal.preInformation;
      case 'distance_sales': return t.legal.distanceSales;
      default: return type;
    }
  };

  const getDoc = (type: string) => docs.find(d => d.document_type === type);

  const handleUpload = async (type: string, file: File) => {
    if (!user) return;
    setUploading(type);

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${type}.${ext}`;

      // Upload to storage (overwrite)
      const { error: uploadError } = await supabase.storage
        .from('legal-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('legal-documents')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      // Upsert in legal_documents table
      const existing = getDoc(type);
      if (existing) {
        await supabase
          .from('legal_documents')
          .update({
            file_url: fileUrl,
            original_filename: file.name,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('legal_documents')
          .insert({
            document_type: type,
            file_url: fileUrl,
            original_filename: file.name,
            updated_by: user.id,
          });
      }

      toast.success(language === 'tr' ? 'Belge yüklendi' : 'Document uploaded');
      await fetchDocs();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || t.common.error);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.legal.title}</CardTitle>
        <CardDescription>
          {language === 'tr'
            ? 'Kullanıcı sözleşmesi, gizlilik politikası ve ödeme sözleşmelerini yönetin'
            : 'Manage terms of service, privacy policy and payment agreements'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_TYPES.map(type => {
          const doc = getDoc(type);
          return (
            <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{getDocLabel(type)}</p>
                  {doc?.original_filename ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {doc.original_filename}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.updated_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">{t.admin.legal.noFile}</p>
                  )}
                </div>
              </div>
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  id={`upload-${type}`}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(type, file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading === type}
                  onClick={() => document.getElementById(`upload-${type}`)?.click()}
                >
                  {uploading === type ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  {t.admin.legal.upload}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
