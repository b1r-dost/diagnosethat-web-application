import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Scan } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function HomeHeader() {
  const { t, brandName } = useI18n();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-md">
            <Scan className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">{brandName}</span>
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20">
            Demo
          </span>
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
  );
}
