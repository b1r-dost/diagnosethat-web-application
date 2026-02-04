import { useEffect, useState } from 'react';
import { useParams, Link, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
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

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompany() {
      if (!id) return;

      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      setCompany(data);
      setLoading(false);
    }

    fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Firma bulunamadı</h2>
        <p className="text-muted-foreground mt-2">
          Bu firma mevcut değil veya erişim yetkiniz yok.
        </p>
        <Button asChild className="mt-4">
          <Link to="/companies">Firmalara Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/companies">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
              <Badge variant="outline" className={statusColors[company.status]}>
                {statusLabels[company.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Oluşturulma: {new Date(company.created_at).toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Outlet context={{ company }} />
    </div>
  );
}
