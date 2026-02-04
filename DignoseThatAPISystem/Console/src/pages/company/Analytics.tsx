import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface DailyStats {
  date: string;
  count: number;
}

interface StatusStats {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  completed: '#22c55e',
  failed: '#ef4444',
  pending: '#eab308',
  processing: '#3b82f6',
};

export default function Analytics() {
  const { company } = useOutletContext<{ company: Company }>();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
  const [totals, setTotals] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    successRate: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [company.id, dateRange]);

  async function fetchAnalytics() {
    setLoading(true);
    const daysAgo = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
    
    const { data: jobs } = await supabase
      .from('jobs')
      .select('created_at, status')
      .eq('company_id', company.id)
      .gte('created_at', daysAgo.toISOString());

    if (!jobs) {
      setLoading(false);
      return;
    }

    // Calculate daily stats
    const dailyMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
    };

    jobs.forEach((job) => {
      const date = new Date(job.created_at).toLocaleDateString('tr-TR');
      dailyMap[date] = (dailyMap[date] || 0) + 1;
      statusMap[job.status] = (statusMap[job.status] || 0) + 1;
    });

    // Convert to arrays
    const sortedDates = Object.entries(dailyMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, count }));

    const statusArray = Object.entries(statusMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name === 'completed' ? 'Tamamlandı' :
              name === 'failed' ? 'Başarısız' :
              name === 'pending' ? 'Bekliyor' : 'İşleniyor',
        value,
        color: COLORS[name as keyof typeof COLORS],
      }));

    const total = jobs.length;
    const completed = statusMap.completed;
    const failed = statusMap.failed;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    setDailyStats(sortedDates);
    setStatusStats(statusArray);
    setTotals({ total, completed, failed, successRate });
    setLoading(false);
  }

  const statCards = [
    {
      title: 'Toplam Analiz',
      value: totals.total,
      icon: BarChart3,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Başarılı',
      value: totals.completed,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Başarısız',
      value: totals.failed,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Başarı Oranı',
      value: `%${totals.successRate}`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
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
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Son 7 Gün</SelectItem>
            <SelectItem value="30">Son 30 Gün</SelectItem>
            <SelectItem value="90">Son 90 Gün</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
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

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Günlük Kullanım</CardTitle>
            <CardDescription>Son {dateRange} gündeki analiz sayıları</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyStats.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Bu dönemde veri yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Durum Dağılımı</CardTitle>
            <CardDescription>Analiz sonuçlarının dağılımı</CardDescription>
          </CardHeader>
          <CardContent>
            {statusStats.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Bu dönemde veri yok
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
