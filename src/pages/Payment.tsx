import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Payment() {
  const { t, language } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<'one_time' | 'recurring'>('one_time');
  const [acceptPreInfo, setAcceptPreInfo] = useState(false);
  const [acceptDistanceSales, setAcceptDistanceSales] = useState(false);
  const [preInfoContent, setPreInfoContent] = useState<string | null>(null);
  const [distanceSalesContent, setDistanceSalesContent] = useState<string | null>(null);
  const [preInfoDialog, setPreInfoDialog] = useState(false);
  const [distanceSalesDialog, setDistanceSalesDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null);

  useEffect(() => {
    fetchLegalDocs();
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const prepareContent = (content: string): string => {
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
    return hasHtmlTags ? content : content.replace(/\n/g, '<br>');
  };

  const fillPlaceholders = (content: string) => {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    return prepareContent(content)
      .replace(/\{\{AD\}\}/g, firstName)
      .replace(/\{\{SOYAD\}\}/g, lastName)
      .replace(/\{\{AD_SOYAD\}\}/g, `${firstName} ${lastName}`.trim())
      .replace(/\{\{EMAIL\}\}/g, user?.email || '')
      .replace(/\{\{TARIH\}\}/g, dateStr);
  };

  const fetchLegalDocs = async () => {
    const { data } = await supabase
      .from('legal_documents')
      .select('*')
      .in('document_type', ['pre_information', 'distance_sales']);

    if (data) {
      for (const doc of data) {
        const d = doc as { document_type: string; content?: string | null };
        if (d.document_type === 'pre_information' && d.content) {
          setPreInfoContent(d.content);
        } else if (d.document_type === 'distance_sales' && d.content) {
          setDistanceSalesContent(d.content);
        }
      }
    }
  };

  const canPay = acceptPreInfo && acceptDistanceSales;

  const handlePay = () => {
    toast.info(language === 'tr' ? 'Ödeme sistemi yakında aktif olacaktır.' : 'Payment system will be active soon.');
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary" />
          {t.payment.title}
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left - Package Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t.payment.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={plan} onValueChange={(v) => setPlan(v as 'one_time' | 'recurring')} className="space-y-3">
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${plan === 'one_time' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <RadioGroupItem value="one_time" id="one_time" />
                  <Label htmlFor="one_time" className="cursor-pointer flex-1">
                    <div className="font-medium">{t.payment.oneTime}</div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Sadece bu ay için geçerli' : 'Valid for this month only'}
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${plan === 'recurring' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="cursor-pointer flex-1">
                    <div className="font-medium">{t.payment.recurring}</div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Her ay otomatik yenilenir' : 'Automatically renews each month'}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Right - Decoy Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {language === 'tr' ? 'Ödeme Bilgileri' : 'Payment Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t.payment.cardNumber}</Label>
                <Input placeholder="4242 4242 4242 4242" disabled className="bg-muted/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.payment.expiry}</Label>
                  <Input placeholder="12/28" disabled className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>{t.payment.cvv}</Label>
                  <Input placeholder="•••" disabled className="bg-muted/30" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legal Agreements */}
        <Card className="mt-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="pre-info"
                checked={acceptPreInfo}
                onCheckedChange={(v) => setAcceptPreInfo(v === true)}
              />
              <div className="grid gap-1 leading-none">
                <label htmlFor="pre-info" className="text-sm cursor-pointer">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setPreInfoDialog(true)}
                  >
                    {t.legal.preInformation}
                  </button>
                  {' '}{t.legal.acceptTerms}
                </label>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="distance-sales"
                checked={acceptDistanceSales}
                onCheckedChange={(v) => setAcceptDistanceSales(v === true)}
              />
              <div className="grid gap-1 leading-none">
                <label htmlFor="distance-sales" className="text-sm cursor-pointer">
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setDistanceSalesDialog(true)}
                  >
                    {t.legal.distanceSales}
                  </button>
                  {' '}{t.legal.acceptTerms}
                </label>
              </div>
            </div>

            <Button
              className="w-full gradient-primary mt-4"
              size="lg"
              disabled={!canPay}
              onClick={handlePay}
            >
              <Heart className="h-4 w-4 mr-2" />
              {t.payment.payButton}
            </Button>
          </CardContent>
        </Card>

        {/* Pre-Information Dialog */}
        <Dialog open={preInfoDialog} onOpenChange={setPreInfoDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.legal.preInformation}</DialogTitle>
            </DialogHeader>
            {preInfoContent ? (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: fillPlaceholders(preInfoContent) }}
              />
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {language === 'tr' ? 'Belge henüz eklenmemiştir.' : 'Document has not been added yet.'}
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* Distance Sales Dialog */}
        <Dialog open={distanceSalesDialog} onOpenChange={setDistanceSalesDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.legal.distanceSales}</DialogTitle>
            </DialogHeader>
            {distanceSalesContent ? (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: fillPlaceholders(distanceSalesContent) }}
              />
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {language === 'tr' ? 'Belge henüz eklenmemiştir.' : 'Document has not been added yet.'}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
