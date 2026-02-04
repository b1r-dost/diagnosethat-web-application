import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Copy, Check, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateApiKey } from '@/lib/apiKeyUtils';

interface Company {
  id: string;
  name: string;
}

interface ApiKeyData {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeys() {
  const { company } = useOutletContext<{ company: Company }>();
  const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApiKey();
  }, [company.id]);

  async function fetchApiKey() {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setApiKey(data);
    setLoading(false);
  }

  async function regenerateApiKey() {
    setRegenerating(true);

    try {
      const { apiKey: newKey, keyPrefix, keyHash } = await generateApiKey();

      if (apiKey) {
        const { error } = await supabase
          .from('api_keys')
          .update({
            key_hash: keyHash,
            key_prefix: keyPrefix,
            is_active: true,
          })
          .eq('id', apiKey.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('api_keys').insert({
          company_id: company.id,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          name: 'Varsayılan API Anahtarı',
          is_active: true,
        });

        if (error) throw error;
      }

      setNewKeyValue(newKey);
      setRegenerateDialogOpen(true);
      fetchApiKey();
      toast({
        title: 'Başarılı',
        description: 'API anahtarı yenilendi.',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'API anahtarı yenilenemedi.',
        variant: 'destructive',
      });
    }

    setRegenerating(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeRegenerateDialog() {
    setRegenerateDialogOpen(false);
    setNewKeyValue(null);
    setShowKey(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Anahtarı</CardTitle>
        <CardDescription>
          Bu firmanın API istekleri için kullandığı anahtarı görüntüleyin ve yönetin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ) : !apiKey ? (
          <div className="text-center py-12">
            <Key className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">API anahtarı bulunamadı</h3>
            <p className="mt-2 text-sm text-muted-foreground mb-4">
              API istekleri yapmak için bir anahtar oluşturmanız gerekiyor.
            </p>
            <Button onClick={regenerateApiKey} disabled={regenerating}>
              <Key className="mr-2 h-4 w-4" />
              {regenerating ? 'Oluşturuluyor...' : 'API Anahtarı Oluştur'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{apiKey.name}</h4>
                  <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                    {apiKey.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Yenile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>API Anahtarını Yenile</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mevcut API anahtarı geçersiz hale gelecek ve yeni bir anahtar oluşturulacak.
                        Bu anahtarı kullanan tüm uygulamaları güncellemeniz gerekecektir.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>İptal</AlertDialogCancel>
                      <AlertDialogAction onClick={regenerateApiKey}>
                        Yenile
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">API Anahtarı</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {apiKey.key_prefix}••••••••••••••••••••••••••••••••••••••••••••••••••••••
                </div>
                <p className="text-xs text-muted-foreground">
                  Oluşturulma: {new Date(apiKey.created_at).toLocaleDateString('tr-TR')}
                  {apiKey.last_used_at && (
                    <> • Son kullanım: {new Date(apiKey.last_used_at).toLocaleDateString('tr-TR')}</>
                  )}
                </p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Güvenlik nedeniyle API anahtarının tamamı yalnızca oluşturulduğunda gösterilir.
                Anahtarınızı kaybettiyseniz <strong>"Yenile"</strong> butonuyla yeni bir anahtar oluşturabilirsiniz.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>

      {/* New Key Display Dialog */}
      <Dialog open={regenerateDialogOpen && newKeyValue !== null} onOpenChange={closeRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni API Anahtarınız</DialogTitle>
            <DialogDescription>
              Bu anahtarı güvenli bir yerde saklayın. Bir daha gösterilmeyecektir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bu pencereyi kapattıktan sonra anahtarı bir daha göremeyeceksiniz.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>API Anahtarı</Label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={newKeyValue || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(newKeyValue || '')}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={closeRegenerateDialog}>Kapat</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
