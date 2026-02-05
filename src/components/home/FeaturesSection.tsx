import { Scan, Shield, Zap, BarChart3 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function FeaturesSection() {
  const { t, language } = useI18n();

  const features = [
    {
      icon: Scan,
      title: language === 'tr' ? 'Akıllı Analiz' : 'AI-Powered Analysis',
      description: language === 'tr' 
        ? 'Panoramik, bitewing ve periapikal röntgenleri otomatik analiz eder'
        : 'Automatic analysis of panoramic, bitewing and periapical radiographs',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      icon: Zap,
      title: language === 'tr' ? 'Hızlı Tespit' : 'Fast Detection',
      description: language === 'tr'
        ? 'Saniyeler içinde diş ve hastalık tespiti'
        : 'Tooth and disease detection within seconds',
      gradient: 'from-amber-500 to-yellow-500',
    },
    {
      icon: Shield,
      title: language === 'tr' ? 'Güvenli Depolama' : 'Secure Storage',
      description: language === 'tr'
        ? 'Hasta verileriniz güvenle saklanır'
        : 'Your patient data is stored securely',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: BarChart3,
      title: language === 'tr' ? 'Detaylı Raporlama' : 'Detailed Reports',
      description: language === 'tr'
        ? 'Profesyonel ve düzenlenebilir raporlar'
        : 'Professional and editable reports',
      gradient: 'from-blue-500 to-cyan-500',
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
            {t.home.features.title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {language === 'tr'
              ? 'Diş hekimliği pratiğinizi bir üst seviyeye taşıyın'
              : 'Take your dental practice to the next level'}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
