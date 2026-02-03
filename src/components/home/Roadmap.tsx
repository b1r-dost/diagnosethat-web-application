import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface RoadmapItem {
  id: string;
  title_tr: string;
  title_en: string;
  description_tr: string | null;
  description_en: string | null;
  display_order: number;
}

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

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
            {t.home.roadmap.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {language === 'tr'
              ? 'Gelecekte sizler için planladıklarımız'
              : 'What we have planned for you in the future'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {isLoading ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
            </div>
          ) : items.length > 0 ? (
            items.map((item, index) => (
              <div
                key={item.id}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium leading-relaxed">
                    {language === 'tr' ? item.title_tr : item.title_en}
                  </p>
                  {(language === 'tr' ? item.description_tr : item.description_en) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'tr' ? item.description_tr : item.description_en}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-muted-foreground py-8">
              {language === 'tr' ? 'Yol haritası öğeleri yükleniyor...' : 'Loading roadmap items...'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
