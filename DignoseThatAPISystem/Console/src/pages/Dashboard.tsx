import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Key, FileText, BarChart3, Plus, ArrowRight } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalCompanies: number;
  totalApiKeys: number;
  totalJobs: number;
  recentJobs: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      // Fetch companies where user is owner or member
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setCompanies(companiesData || []);

      // Fetch stats
      const [companiesCount, apiKeysCount, jobsCount] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('api_keys').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
      ]);

      // Recent jobs (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentJobsCount } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      setStats({
        totalCompanies: companiesCount.count || 0,
        totalApiKeys: apiKeysCount.count || 0,
        totalJobs: jobsCount.count || 0,
        recentJobs: recentJobsCount || 0,
      });

      setLoading(false);
    }

    fetchData();
  }, [user]);

  const statCards = [
    {
      title: 'Toplam Firma',
      value: stats?.totalCompanies || 0,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'API Anahtarları',
      value: stats?.totalApiKeys || 0,
      icon: Key,
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
      title: 'Son 24 Saat',
      value: stats?.recentJobs || 0,
      icon: BarChart3,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Hoş geldiniz! DiagnoseThat API yönetim panelinize genel bakış.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
          : statCards.map((stat) => (
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
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Companies List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Firmalarınız</CardTitle>
            <CardDescription>
              API anahtarlarını ve kullanım istatistiklerini yönetin
            </CardDescription>
          </div>
          <Button asChild>
            <Link to="/companies/new">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Firma
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Henüz firma yok</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                API kullanmaya başlamak için ilk firmanızı oluşturun.
              </p>
              <Button asChild className="mt-4">
                <Link to="/companies/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Firma Oluştur
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{company.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/companies/${company.id}`}>
                      Yönet
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
              {companies.length >= 5 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/companies">Tüm Firmaları Gör</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
