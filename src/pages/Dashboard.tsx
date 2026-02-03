import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  Users, 
  UserPlus, 
  Bell, 
  Image as ImageIcon,
  TrendingUp,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_ref: string;
  created_at: string;
}

interface Radiograph {
  id: string;
  original_filename: string | null;
  analysis_status: string | null;
  created_at: string;
  patient_id: string | null;
}

interface Stats {
  totalPatients: number;
  totalRadiographs: number;
  pendingAnalyses: number;
  thisMonthPatients: number;
}

interface Announcement {
  id: string;
  title_tr: string;
  title_en: string;
  content_tr: string;
  content_en: string;
  priority: number;
  created_at: string;
}

export default function Dashboard() {
  const { t, language } = useI18n();
  const { user, profile, isLoading, isDentist, isPatient } = useAuth();
  const navigate = useNavigate();
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [recentRadiographs, setRecentRadiographs] = useState<Radiograph[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<Stats>({ 
    totalPatients: 0, 
    totalRadiographs: 0, 
    pendingAnalyses: 0, 
    thisMonthPatients: 0 
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      if (isDentist) {
        fetchDashboardData();
      } else {
        setDataLoading(false);
      }
    } else {
      setDataLoading(false);
    }
  }, [user, isDentist]);

  const fetchAnnouncements = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }

      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch recent patients
      const { data: patients } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentPatients(patients || []);

      // Fetch recent radiographs
      const { data: radiographs } = await supabase
        .from('radiographs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentRadiographs(radiographs || []);

      // Calculate stats
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      const { count: totalRadiographs } = await supabase
        .from('radiographs')
        .select('*', { count: 'exact', head: true });

      const { count: pendingAnalyses } = await supabase
        .from('radiographs')
        .select('*', { count: 'exact', head: true })
        .eq('analysis_status', 'pending');

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { count: thisMonthPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonth.toISOString());

      setStats({
        totalPatients: totalPatients || 0,
        totalRadiographs: totalRadiographs || 0,
        pendingAnalyses: pendingAnalyses || 0,
        thisMonthPatients: thisMonthPatients || 0
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user.email;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {profile?.institution_logo_url && (
              <img 
                src={profile.institution_logo_url} 
                alt="Institution logo" 
                className="h-12 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">
                {t.dashboard.welcome}, {displayName}!
              </h1>
              <p className="text-muted-foreground">
                {isDentist ? t.auth.dentist : isPatient ? t.auth.patient : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Dentist only */}
        {isDentist && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Toplam Hasta' : 'Total Patients'}
                    </p>
                    {dataLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.totalPatients}</p>
                    )}
                  </div>
                  <Users className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Toplam Röntgen' : 'Total Radiographs'}
                    </p>
                    {dataLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.totalRadiographs}</p>
                    )}
                  </div>
                  <ImageIcon className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Bekleyen Analiz' : 'Pending Analyses'}
                    </p>
                    {dataLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.pendingAnalyses}</p>
                    )}
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'tr' ? 'Bu Ay' : 'This Month'}
                    </p>
                    {dataLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stats.thisMonthPatients}</p>
                    )}
                  </div>
                  <Calendar className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recent Patients - Dentist only */}
          {isDentist && (
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t.dashboard.recentPatients}
                  </CardTitle>
                  <CardDescription>
                    {language === 'tr' ? 'Son eklenen hastalar' : 'Recently added patients'}
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link to="/patients/new">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t.dashboard.addPatient}
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentPatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {t.dashboard.noPatients}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentPatients.map(patient => (
                      <div 
                        key={patient.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                            <p className="text-sm text-muted-foreground">{patient.patient_ref}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(patient.created_at), 'dd.MM.yyyy')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full" asChild>
                      <Link to="/patients">
                        {language === 'tr' ? 'Tüm hastaları görüntüle' : 'View all patients'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* My Radiographs - Patient only */}
          {isPatient && !isDentist && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t.patients.detail.radiographs}</CardTitle>
                <CardDescription>{t.patients.detail.noRadiographs}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t.patients.detail.noRadiographs}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t.dashboard.announcements}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t.dashboard.noAnnouncements}
                </p>
              ) : (
                <div className="space-y-4">
                  {announcements.map(announcement => (
                    <div key={announcement.id} className="border-l-4 border-primary pl-4 py-2">
                      <h4 className="font-medium text-sm">
                        {language === 'tr' ? announcement.title_tr : announcement.title_en}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'tr' ? announcement.content_tr : announcement.content_en}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(announcement.created_at), 'dd.MM.yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
