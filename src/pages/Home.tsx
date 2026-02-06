import { AnimatedBackground } from '@/components/home/AnimatedBackground';
import { HomeHeader } from '@/components/home/HomeHeader';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { AboutSection } from '@/components/home/AboutSection';
import { DemoAnalysis } from '@/components/home/DemoAnalysis';
import { Roadmap } from '@/components/home/Roadmap';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Home() {
  const { t } = useI18n();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to dashboard (unless in password recovery flow)
  useEffect(() => {
    if (user && !isLoading) {
      // Check if this is a password recovery redirect
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        // Redirect to auth page with reset mode, preserving the hash
        window.location.assign('/auth?mode=reset' + hash);
        return;
      }
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

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
      <HomeHeader />
      <HeroSection />

      {/* Quick Analysis Demo Section */}
      <section id="demo" className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <DemoAnalysis />
          </div>
        </div>
      </section>

      <FeaturesSection />
      <AboutSection />
      <Roadmap />
      <Footer />
    </div>
  );
}
