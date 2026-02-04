import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  owner_id: string;
}

interface Stats {
  totalCompanies: number;
  totalUsers: number;
  totalJobs: number;
  totalRevenue: number;
}

interface PricingSettings {
  id: string;
  price_per_analysis: number;
  currency: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700',
  inactive: 'bg-gray-500/10 text-gray-700',
  suspended: 'bg-red-500/10 text-red-700',
};

export default function Admin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    // Fetch all companies
    const { data: companiesData } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    setCompanies(companiesData || []);

    // Fetch stats
    const [companiesCount, usersCount, jobsCount] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
    ]);

    // Calculate total revenue from paid invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid');

    const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;

    setStats({
      totalCompanies: companiesCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalJobs: jobsCount.count || 0,
      totalRevenue,
    });

    // Fetch default pricing
    const { data: pricingData } = await supabase
      .from('pricing_settings')
      .select('*')
      .is('company_id', null)
      .maybeSingle();

    if (pricingData) {
      setPricing(pricingData);
      setNewPrice(pricingData.price_per_analysis.toString());
    }

    setLoading(false);
  }

  async function updateDefaultPricing() {
    if (!pricing) return;

    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      toast({
        title: 'Hata',
        description: 'Geçerli bir fiyat giriniz.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPrice(true);

    const { error } = await supabase
      .from('pricing_settings')
      .update({ price_per_analysis: priceValue })
      .eq('id', pricing.id);

    setSavingPrice(false);

    if (error) {
      toast({
        title: 'Hata',
        description: 'Fiyat güncellenemedi.',
        variant: 'destructive',
      });
    } else {
      setPriceSuccess(true);
      setTimeout(() => setPriceSuccess(false), 3000);
      setPricing({ ...pricing, price_per_analysis: priceValue });
    }
  }

  const statCards = [
    {
      title: 'Toplam Firma',
      value: stats?.totalCompanies || 0,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Toplam Kullanıcı',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Toplam Analiz',
      value: stats?.totalJobs || 0,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Toplam Gelir',
      value: `$${(stats?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Paneli</h1>
        <p className="text-muted-foreground">
          Sistem genelinde yönetim ve istatistikler
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Varsayılan Ücret Ayarları
          </CardTitle>
          <CardDescription>
            Yeni firmalar için varsayılan analiz ücreti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Analiz Başına Ücret (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={updateDefaultPricing} disabled={savingPrice}>
              {savingPrice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Güncelle
            </Button>
            {priceSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Kaydedildi</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tüm Firmalar</CardTitle>
          <CardDescription>Sistemdeki tüm firmaların listesi</CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Henüz firma yok
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma Adı</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[company.status]}>
                          {company.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(company.created_at).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/companies/${company.id}`}>Görüntüle</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
