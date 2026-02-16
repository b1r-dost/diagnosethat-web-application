import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Heart } from 'lucide-react';
import { toast } from 'sonner';

export function SupportPrompt() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    checkVisibility();
  }, [user]);

  const checkVisibility = async () => {
    try {
      const now = new Date();
      const currentMonth = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
      const currentYear = now.getFullYear();
      const todayStr = now.toISOString().split('T')[0];

      // Check active subscription for current month
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .eq('package_month', currentMonth)
        .eq('package_year', currentYear)
        .limit(1);

      if (activeSub && activeSub.length > 0) {
        setLoading(false);
        return;
      }

      // Check if dismissed today
      const { data: dismissed } = await supabase
        .from('dismissed_prompts')
        .select('id')
        .eq('user_id', user!.id)
        .eq('prompt_type', 'support_prompt')
        .eq('dismissed_at', todayStr)
        .limit(1);

      if (dismissed && dismissed.length > 0) {
        setLoading(false);
        return;
      }

      setVisible(true);
    } catch (err) {
      console.error('Error checking support prompt visibility:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await supabase.from('dismissed_prompts').insert({
      user_id: user.id,
      prompt_type: 'support_prompt',
      dismissed_at: todayStr,
    });
  };

  const handleBuyClick = () => {
    toast.info(
      t.settings.subscription.developing
    );
  };

  if (loading || !visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">{t.support.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.support.message}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="w-full mt-3 gradient-primary"
            size="sm"
            onClick={handleBuyClick}
          >
            <Heart className="h-4 w-4 mr-1" />
            {t.support.button}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
