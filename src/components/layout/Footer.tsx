import { useI18n } from '@/lib/i18n';

export function Footer() {
  const { language } = useI18n();
  
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>
          © 2026 Erentir Sağlık Çözümleri Anonim Şirketi. {language === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
        </p>
      </div>
    </footer>
  );
}
