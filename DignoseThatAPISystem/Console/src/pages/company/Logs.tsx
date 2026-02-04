import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Search, RefreshCw } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface ApiLog {
  id: string;
  job_id: string | null;
  clinic_ref: string | null;
  doctor_ref: string | null;
  patient_ref: string | null;
  request_timestamp: string;
  response_timestamp: string | null;
  status_code: number | null;
  error_message: string | null;
  is_billable: boolean;
  jobs?: {
    status: string;
    radiograph_type: string | null;
  };
}

interface PricingSettings {
  price_per_analysis: number;
  currency: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700',
  processing: 'bg-blue-500/10 text-blue-700',
  completed: 'bg-green-500/10 text-green-700',
  failed: 'bg-red-500/10 text-red-700',
};

export default function Logs() {
  const { company } = useOutletContext<{ company: Company }>();
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pricing, setPricing] = useState<PricingSettings | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [company.id]);

  async function fetchLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('api_logs')
      .select(`
        *,
        jobs (
          status,
          radiograph_type
        )
      `)
      .eq('company_id', company.id)
      .order('request_timestamp', { ascending: false })
      .limit(100);

    setLogs(data || []);

    // Firma özel fiyatlandırmasını çek
    const { data: companyPricing } = await supabase
      .from('pricing_settings')
      .select('price_per_analysis, currency')
      .eq('company_id', company.id)
      .maybeSingle();

    if (companyPricing) {
      setPricing(companyPricing);
    } else {
      // Varsayılan fiyatlandırmayı çek
      const { data: defaultPricing } = await supabase
        .from('pricing_settings')
        .select('price_per_analysis, currency')
        .is('company_id', null)
        .maybeSingle();
      
      setPricing(defaultPricing);
    }

    setLoading(false);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: pricing?.currency || 'USD',
    }).format(amount);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.patient_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.doctor_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.clinic_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.job_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || log.jobs?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Kayıtları</CardTitle>
            <CardDescription>
              Bu firmanın son API çağrılarını görüntüleyin.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hasta, doktor veya klinik ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Durum filtrele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="pending">Bekliyor</SelectItem>
              <SelectItem value="processing">İşleniyor</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
              <SelectItem value="failed">Başarısız</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Henüz kayıt yok</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              API çağrıları yapıldığında burada görünecektir.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Hasta Ref</TableHead>
                  <TableHead>Doktor Ref</TableHead>
                  <TableHead>Klinik Ref</TableHead>
                  <TableHead>Faturalanabilir</TableHead>
                  <TableHead>Ücret</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.request_timestamp).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      {log.jobs?.status && (
                        <Badge
                          variant="outline"
                          className={statusColors[log.jobs.status] || ''}
                        >
                          {log.jobs.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.jobs?.radiograph_type?.replace('_', ' ') || '-'}
                    </TableCell>
                    <TableCell>{log.patient_ref || '-'}</TableCell>
                    <TableCell>{log.doctor_ref || '-'}</TableCell>
                    <TableCell>{log.clinic_ref || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={log.is_billable ? 'default' : 'secondary'}>
                        {log.is_billable ? 'Evet' : 'Hayır'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.is_billable 
                        ? formatCurrency(pricing?.price_per_analysis || 0.50)
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
