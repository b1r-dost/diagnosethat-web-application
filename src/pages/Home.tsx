import { AnimatedBackground } from '@/components/home/AnimatedBackground';
import { DemoAnalysis } from '@/components/home/DemoAnalysis';
import { Roadmap } from '@/components/home/Roadmap';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Scan, Shield, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  const { t, language, brandName } = useI18n();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const features = [
    {
      icon: Scan,
      title: language === 'tr' ? 'AI Destekli Analiz' : 'AI-Powered Analysis',
      description: language === 'tr' 
        ? 'Panoramik, bitewing ve periapikal röntgenleri otomatik analiz'
        : 'Automatic analysis of panoramic, bitewing and periapical radiographs',
    },
    {
      icon: Zap,
      title: language === 'tr' ? 'Hızlı Tespit' : 'Fast Detection',
      description: language === 'tr'
        ? 'Saniyeler içinde diş ve hastalık tespiti'
        : 'Tooth and disease detection within seconds',
    },
    {
      icon: Shield,
      title: language === 'tr' ? 'Güvenli Depolama' : 'Secure Storage',
      description: language === 'tr'
        ? 'Hasta verileriniz güvenle saklanır'
        : 'Your patient data is stored securely',
    },
    {
      icon: BarChart3,
      title: language === 'tr' ? 'Detaylı Raporlama' : 'Detailed Reports',
      description: language === 'tr'
        ? 'Profesyonel ve düzenlenebilir raporlar'
        : 'Professional and editable reports',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-muted-foreground">{t.common.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />

      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-md">
              <Scan className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">{brandName}</span>
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Demo</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth?mode=login">{t.nav.login}</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/auth?mode=signup">{t.nav.signup}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="animate-slide-up">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t.brand.tagline}
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground lg:text-xl">
              {t.home.hero.subtitle}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                variant="hero"
                size="xl"
                asChild
                className="min-w-[200px]"
              >
                <Link to="/auth?mode=signup">
                  {t.nav.signup}
                  <ArrowRight className="ml-2 h-5 w-5" />
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
          </div>
        </div>
      </section>

      {/* Quick Analysis Demo Section */}
      <section id="demo" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <DemoAnalysis />
          </div>
        </div>
      </section>

      {/* Features Section */}
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
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 lg:py-32 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
            {language === 'tr' ? 'Hakkımızda' : 'About Us'}
          </h2>
          <p className="mx-auto mb-8 max-w-3xl text-lg text-muted-foreground leading-relaxed">
            {language === 'tr'
              ? 'Zor bir meslek icra ediyoruz. Hasta yükümüz altında tam performansımızı sarsılmaz bir şekilde sürdürme zorunluluğumuz bulunuyor. KOSGEB desteği ile iki yıllık bir geliştirme sürecinin ardından hayata geçirdiğimiz DiagnoseThat uygulamasıyla, tüm hastalarınızda hiçbir dental patolojinin gözden kaçmamasına yardımcı olmayı amaçlıyoruz. Sağlığın herkes için ulaşılabilir olması gerektiğine inanıyoruz; bu nedenle uygulamamızın temel fonksiyonlarının her zaman ücretsiz olarak sunacağımızı taahhüt ediyoruz. Ayrıca, son derece saygın kullanıcı kitlemizin verilerini satarak da gelir elde etmiyoruz. Misyonumuzun sürdürülebilirliği için sizden Destek Paketlerimizi satın almanızı umuyoruz.'
              : 'We practice a demanding profession. We must maintain our full performance steadfastly under the burden of our patient load. With the support of KOSGEB and after a two-year development process, we launched DiagnoseThat to help ensure that no dental pathology goes unnoticed in any of your patients. We believe healthcare should be accessible to everyone; therefore, we commit to always offering the core functions of our application for free. Additionally, we do not generate revenue by selling the data of our highly esteemed user base. We hope you will purchase our Support Packages to sustain our mission.'}
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/auth?mode=signup">
              {t.nav.signup}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Roadmap Section */}
      <Roadmap />

      {/* Footer */}
      <Footer />
    </div>
  );
}
