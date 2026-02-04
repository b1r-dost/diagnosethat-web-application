import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, ArrowRight, Key, FileText } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  _count?: {
    api_keys: number;
    jobs: number;
  };
}

const statusColors = {
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  inactive: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  suspended: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const statusLabels = {
  active: 'Aktif',
  inactive: 'Pasif',
  suspended: 'Askıda',
};

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      if (!user) return;

      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch counts for each company
      if (data) {
        const companiesWithCounts = await Promise.all(
          data.map(async (company) => {
            const [apiKeysCount, jobsCount] = await Promise.all([
              supabase
                .from('api_keys')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id),
              supabase
                .from('jobs')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id),
            ]);

            return {
              ...company,
              _count: {
                api_keys: apiKeysCount.count || 0,
                jobs: jobsCount.count || 0,
              },
            };
          })
        );
        setCompanies(companiesWithCounts);
      }

      setLoading(false);
    }

    fetchCompanies();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Firmalar</h1>
          <p className="text-muted-foreground">
            Tüm firmalarınızı yönetin ve yeni firmalar ekleyin.
          </p>
        </div>
        <Button asChild>
          <Link to="/companies/new">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Firma
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Henüz firma yok</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              API kullanmaya başlamak için ilk firmanızı oluşturun.
            </p>
            <Button asChild className="mt-4">
              <Link to="/companies/new">
                <Plus className="mr-2 h-4 w-4" />
                Firma Oluştur
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <CardDescription>
                      {new Date(company.created_at).toLocaleDateString('tr-TR')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={statusColors[company.status]}>
                    {statusLabels[company.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    {company._count?.api_keys || 0} API Anahtarı
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {company._count?.jobs || 0} Analiz
                  </div>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/companies/${company.id}`}>
                    Yönet
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
