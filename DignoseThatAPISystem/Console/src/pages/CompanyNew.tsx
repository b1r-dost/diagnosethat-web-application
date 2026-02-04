import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const companySchema = z.object({
  name: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır').max(100, 'Firma adı en fazla 100 karakter olabilir'),
});

export default function CompanyNew() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      companySchema.parse({ name });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }

    if (!user) {
      setError('Oturum açmanız gerekiyor');
      return;
    }

    setLoading(true);

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name,
        owner_id: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (companyError) {
      setError(companyError.message);
      setLoading(false);
      return;
    }

    // Add owner as company member
    await supabase.from('company_members').insert({
      company_id: company.id,
      user_id: user.id,
      role: 'owner',
    });

    setLoading(false);
    navigate(`/companies/${company.id}/api-keys`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/companies">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yeni Firma</h1>
          <p className="text-muted-foreground">
            API kullanımı için yeni bir firma oluşturun.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Firma Bilgileri</CardTitle>
          <CardDescription>
            Firma adını girin. API anahtarını daha sonra oluşturabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Firma Adı</Label>
              <Input
                id="name"
                type="text"
                placeholder="Örnek: ABC Diş Kliniği"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/companies')}>
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Firma Oluştur
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
