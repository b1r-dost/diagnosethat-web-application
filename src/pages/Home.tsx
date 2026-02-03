import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedBackground } from '@/components/home/AnimatedBackground';
import { DemoAnalysis } from '@/components/home/DemoAnalysis';
import { Roadmap } from '@/components/home/Roadmap';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Zap, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

export default function Home() {
  const { t } = useI18n();
  const { user, isLoading, primaryRole } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  return (
    <MainLayout>
      <AnimatedBackground />
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              {t.home.hero.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.home.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link to="/auth?mode=signup">
                  {t.nav.signup}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#demo">{t.home.hero.tryDemo}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{t.home.features.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">{t.home.features.aiAnalysis}</h3>
              <p className="text-muted-foreground">{t.home.features.aiAnalysisDesc}</p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">{t.home.features.secure}</h3>
              <p className="text-muted-foreground">{t.home.features.secureDesc}</p>
            </div>
            <div className="text-center space-y-4 p-6">
              <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold">{t.home.features.fast}</h3>
              <p className="text-muted-foreground">{t.home.features.fastDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20">
        <div className="container">
          <DemoAnalysis />
        </div>
      </section>

      {/* Roadmap Section */}
      <Roadmap />
    </MainLayout>
  );
}
