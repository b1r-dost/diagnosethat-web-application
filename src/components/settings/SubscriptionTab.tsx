import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { CreditCard, Heart, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Subscription {
  id: string;
  package_month: string;
  package_year: number;
  status: string;
  starts_at: string;
  ends_at: string;
  amount: number;
  currency: string;
}

export function SubscriptionTab() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      setSubscription(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = () => {
    navigate('/payment');
  };

  const monthLabel = (month: string) => {
    if (language === 'tr') {
      const months: Record<string, string> = {
        january: 'Ocak', february: 'Şubat', march: 'Mart', april: 'Nisan',
        may: 'Mayıs', june: 'Haziran', july: 'Temmuz', august: 'Ağustos',
        september: 'Eylül', october: 'Ekim', november: 'Kasım', december: 'Aralık',
      };
      return months[month] || month;
    }
    return month.charAt(0).toUpperCase() + month.slice(1);
  };

  return (
    <TabsContent value="subscription">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.subscription.title}</CardTitle>
          <CardDescription>{t.settings.subscription.monthlyPackage}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">...</div>
          ) : subscription ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Heart className="h-8 w-8 text-primary fill-current" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {monthLabel(subscription.package_month)} {subscription.package_year}
                    </p>
                    <Badge variant="secondary">{t.dashboard.supportBadge}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(new Date(subscription.starts_at), 'dd.MM.yyyy')} - {format(new Date(subscription.ends_at), 'dd.MM.yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t.settings.subscription.noPlan}</p>
              <Button className="mt-4 gradient-primary" onClick={handleBuyClick}>
                <Heart className="h-4 w-4 mr-1" />
                {t.settings.subscription.buyPackage}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
