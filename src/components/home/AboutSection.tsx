import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Users, Award } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function AboutSection() {
  const { t, language } = useI18n();

  return (
    <section className="py-20 lg:py-32 gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-3xl" />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="mb-6 text-3xl font-bold text-foreground lg:text-4xl">
              {language === 'tr' ? 'Hakkımızda' : 'About Us'}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
              {language === 'tr'
                ? 'Zor bir meslek icra ediyoruz. Hasta yükümüz altında tam performansımızı sarsılmaz bir şekilde sürdürme zorunluluğumuz bulunuyor. KOSGEB desteği ile iki yıllık bir geliştirme sürecinin ardından hayata geçirdiğimiz DiagnoseThat uygulamasıyla, tüm hastalarınızda hiçbir dental patolojinin gözden kaçmamasına yardımcı olmayı amaçlıyoruz.'
                : 'We practice a demanding profession. We must maintain our full performance steadfastly under the burden of our patient load. With the support of KOSGEB and after a two-year development process, we launched DiagnoseThat to help ensure that no dental pathology goes unnoticed in any of your patients.'}
            </p>
            <p className="mb-8 text-muted-foreground leading-relaxed">
              {language === 'tr'
                ? 'Sağlığın herkes için ulaşılabilir olması gerektiğine inanıyoruz; bu nedenle uygulamamızın temel fonksiyonlarını her zaman ücretsiz olarak sunacağımızı taahhüt ediyoruz.'
                : 'We believe healthcare should be accessible to everyone; therefore, we commit to always offering the core functions of our application for free.'}
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth?mode=signup">
                {t.nav.signup}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {language === 'tr' ? 'Ücretsiz Temel Özellikler' : 'Free Core Features'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'tr' 
                    ? 'Temel analiz özellikleri her zaman ücretsiz' 
                    : 'Basic analysis features are always free'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {language === 'tr' ? 'Veri Gizliliği' : 'Data Privacy'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'tr' 
                    ? 'Kullanıcı verilerinizi satmıyoruz' 
                    : 'We do not sell your user data'}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {language === 'tr' ? 'KOSGEB Destekli' : 'KOSGEB Supported'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'tr' 
                    ? '2 yıllık AR-GE süreci' 
                    : '2 years of R&D process'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
