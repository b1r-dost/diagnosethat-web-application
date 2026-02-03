import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function HeroSection() {
  const { t, language } = useI18n();

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/4 left-1/2 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="container relative mx-auto px-4 text-center">
        <div className="animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary border border-primary/20">
            <Sparkles className="h-4 w-4" />
            {language === 'tr' ? 'Yapay Zeka Destekli' : 'AI-Powered'}
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="block">{t.brand.tagline}</span>
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground lg:text-xl leading-relaxed">
            {t.home.hero.subtitle}
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              variant="hero"
              size="xl"
              asChild
              className="min-w-[200px] group"
            >
              <Link to="/auth?mode=signup">
                {t.nav.signup}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="hero-outline"
              size="xl"
              onClick={() => {
                const el = document.getElementById('demo');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="min-w-[200px]"
            >
              {t.home.hero.tryDemo}
            </Button>
          </div>
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">%98</div>
              <div className="text-sm text-muted-foreground">
                {language === 'tr' ? 'Doğruluk' : 'Accuracy'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">&lt;5s</div>
              <div className="text-sm text-muted-foreground">
                {language === 'tr' ? 'Analiz Süresi' : 'Analysis Time'}
              </div>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <div className="text-3xl font-bold text-foreground">24/7</div>
              <div className="text-sm text-muted-foreground">
                {language === 'tr' ? 'Erişim' : 'Access'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
