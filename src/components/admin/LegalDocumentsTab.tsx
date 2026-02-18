import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Check, Loader2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LegalDoc {
  id: string;
  document_type: string;
  file_url: string | null;
  original_filename: string | null;
  content: string | null;
  updated_at: string;
}

const DOCUMENT_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'pre_information',
  'distance_sales',
] as const;

const PLACEHOLDERS = ['{{AD}}', '{{SOYAD}}', '{{AD_SOYAD}}', '{{EMAIL}}', '{{TARIH}}'];

export function LegalDocumentsTab() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contentDrafts, setContentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    const { data } = await supabase
      .from('legal_documents')
      .select('*');
    const docsData = (data || []) as LegalDoc[];
    setDocs(docsData);
    // Initialize drafts from existing content
    const drafts: Record<string, string> = {};
    for (const doc of docsData) {
      drafts[doc.document_type] = doc.content || '';
    }
    setContentDrafts(prev => ({ ...drafts, ...prev }));
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

  const handleSave = async (type: string) => {
    if (!user) return;
    setSaving(type);

    try {
      const content = contentDrafts[type] || '';
      const existing = getDoc(type);

      if (existing) {
        const { error } = await supabase
          .from('legal_documents')
          .update({
            content,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('legal_documents')
          .insert({
            document_type: type,
            content,
            updated_by: user.id,
          });
        if (error) throw error;
      }

      toast.success(language === 'tr' ? 'Belge kaydedildi' : 'Document saved');
      await fetchDocs();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || t.common.error);
    } finally {
      setSaving(null);
    }
  };

  const toggleExpand = (type: string) => {
    setExpanded(prev => prev === type ? null : type);
  };

  const insertPlaceholder = (type: string, placeholder: string) => {
    setContentDrafts(prev => ({
      ...prev,
      [type]: (prev[type] || '') + placeholder,
    }));
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
            ? 'Hukuki belgeleri HTML şablon olarak düzenleyin. Yer tutucular gösterim anında kullanıcı verisiyle doldurulur.'
            : 'Edit legal documents as HTML templates. Placeholders are filled with user data at display time.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_TYPES.map(type => {
          const doc = getDoc(type);
          const isOpen = expanded === type;
          const hasContent = !!(doc?.content || contentDrafts[type]);

          return (
            <div key={type} className="border rounded-lg overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                onClick={() => toggleExpand(type)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{getDocLabel(type)}</p>
                    {doc?.updated_at && hasContent ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          {language === 'tr' ? 'İçerik mevcut' : 'Content available'}
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
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {/* Editor */}
              {isOpen && (
                <div className="border-t p-4 space-y-3 bg-muted/20">
                  {/* Placeholder chips */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'tr' ? 'Kullanılabilir yer tutucular (tıklayarak ekleyin):' : 'Available placeholders (click to insert):'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLACEHOLDERS.map(ph => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => insertPlaceholder(type, ph)}
                          className="px-2 py-1 text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors"
                        >
                          {ph}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    value={contentDrafts[type] || ''}
                    onChange={(e) => setContentDrafts(prev => ({ ...prev, [type]: e.target.value }))}
                    placeholder={
                      language === 'tr'
                        ? 'Belge içeriğini buraya girin. HTML etiketleri kullanabilirsiniz (<p>, <b>, <br>, <ul>, <li> vb.)'
                        : 'Enter document content here. You can use HTML tags (<p>, <b>, <br>, <ul>, <li> etc.)'
                    }
                    className="min-h-[300px] font-mono text-sm"
                  />

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={saving === type}
                      onClick={() => handleSave(type)}
                    >
                      {saving === type ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      {t.common.save}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
