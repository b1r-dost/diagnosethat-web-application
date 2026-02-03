import { useI18n } from '@/lib/i18n';
import { Link } from 'react-router-dom';

export function Footer() {
  const { t, brandName } = useI18n();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">{brandName}</h3>
            <p className="text-sm text-muted-foreground">
              {t.brand.tagline}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t.nav.home}</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.home}
              </Link>
              <Link to="/guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.guide}
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t.footer.terms}</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.footer.privacy}
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.footer.terms}
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t.footer.contact}</h4>
            <nav className="flex flex-col space-y-2">
              <a 
                href="mailto:info@diagnosethat.net" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                info@diagnosethat.net
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {brandName}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
