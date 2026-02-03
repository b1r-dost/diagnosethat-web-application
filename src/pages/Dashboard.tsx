import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserPlus, Bell, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { t } = useI18n();
  const { user, profile, isLoading, isDentist, isPatient, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, isLoading, navigate]);

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
          
          {/* Support badge placeholder */}
          {false && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Award className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">{t.dashboard.supportBadge}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recent Patients - Dentist only */}
          {isDentist && (
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t.dashboard.recentPatients}
                  </CardTitle>
                  <CardDescription>{t.dashboard.noPatients}</CardDescription>
                </div>
                <Button asChild>
                  <Link to="/patients/new">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t.dashboard.addPatient}
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t.dashboard.noPatients}
                </p>
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
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t.dashboard.noAnnouncements}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
