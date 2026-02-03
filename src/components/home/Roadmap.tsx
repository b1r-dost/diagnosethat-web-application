import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  ShieldCheck, 
  Box, 
  ArrowLeftRight, 
  RotateCcw, 
  Building, 
  Pencil, 
  FlaskConical,
  Sparkles
} from 'lucide-react';

interface RoadmapItem {
  id: string;
  title_tr: string;
  title_en: string;
  description_tr: string | null;
  description_en: string | null;
  icon: string | null;
  display_order: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ChartBar: BarChart3,
  ShieldCheck: ShieldCheck,
  Box: Box,
  ArrowLeftRight: ArrowLeftRight,
  RotateCcw: RotateCcw,
  Building: Building,
  Pencil: Pencil,
  FlaskConical: FlaskConical,
};

export function Roadmap() {
  const { t, language } = useI18n();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmapItems = async () => {
      try {
        const { data, error } = await supabase
          .from('roadmap_items')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching roadmap items:', error);
          return;
        }

        setItems(data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoadmapItems();
  }, []);

  if (isLoading || items.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{t.home.roadmap.title}</h2>
          <p className="text-muted-foreground">{t.home.roadmap.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const IconComponent = item.icon ? iconMap[item.icon] : Sparkles;
            const title = language === 'tr' ? item.title_tr : item.title_en;
            const description = language === 'tr' ? item.description_tr : item.description_en;

            return (
              <Card key={item.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {IconComponent && <IconComponent className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{title}</h3>
                      {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
