import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Receipt, DollarSign, FileText, Calendar } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  period_start: string;
  period_end: string;
  total_analyses: number;
  unit_price: number;
  subtotal: number;
  tax_rate: number;
  total: number;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  created_at: string;
}

interface PricingSettings {
  price_per_analysis: number;
  currency: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-700',
  issued: 'bg-yellow-500/10 text-yellow-700',
  paid: 'bg-green-500/10 text-green-700',
  cancelled: 'bg-red-500/10 text-red-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Taslak',
  issued: 'Gönderildi',
  paid: 'Ödendi',
  cancelled: 'İptal',
};

export default function Billing() {
  const { company } = useOutletContext<{ company: Company }>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [currentMonthStats, setCurrentMonthStats] = useState({
    analyses: 0,
    estimated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, [company.id]);

  async function fetchBillingData() {
    setLoading(true);

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', company.id)
      .order('period_start', { ascending: false });

    setInvoices(invoicesData || []);

    // Fetch pricing (company specific or default)
    const { data: companyPricing } = await supabase
      .from('pricing_settings')
      .select('*')
      .eq('company_id', company.id)
      .maybeSingle();

    if (companyPricing) {
      setPricing(companyPricing);
    } else {
      // Get default pricing
      const { data: defaultPricing } = await supabase
        .from('pricing_settings')
        .select('*')
        .is('company_id', null)
        .maybeSingle();
      
      setPricing(defaultPricing);
    }

    // Calculate current month stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_billable', true)
      .gte('request_timestamp', startOfMonth.toISOString());

    const analysesCount = count || 0;
    const unitPrice = pricing?.price_per_analysis || 0.50;
    
    setCurrentMonthStats({
      analyses: analysesCount,
      estimated: analysesCount * unitPrice,
    });

    setLoading(false);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: pricing?.currency || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
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
      {/* Current Month Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Ay Analiz
            </CardTitle>
            <div className="rounded-lg p-2 bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthStats.analyses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Birim Fiyat
            </CardTitle>
            <div className="rounded-lg p-2 bg-purple-500/10">
              <Receipt className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pricing?.price_per_analysis || 0.50)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ödeyeceğiniz Miktar
            </CardTitle>
            <div className="rounded-lg p-2 bg-green-500/10">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentMonthStats.analyses * (pricing?.price_per_analysis || 0.50))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Faturalar</CardTitle>
          <CardDescription>Geçmiş faturalarınızı görüntüleyin</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Henüz fatura yok</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Faturalar dönem sonunda otomatik olarak oluşturulacaktır.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dönem</TableHead>
                    <TableHead>Analiz</TableHead>
                    <TableHead>Birim Fiyat</TableHead>
                    <TableHead>Toplam</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {new Date(invoice.period_start).toLocaleDateString('tr-TR')} -{' '}
                        {new Date(invoice.period_end).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>{invoice.total_analyses}</TableCell>
                      <TableCell>{formatCurrency(invoice.unit_price)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[invoice.status]}
                        >
                          {statusLabels[invoice.status]}
                        </Badge>
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
