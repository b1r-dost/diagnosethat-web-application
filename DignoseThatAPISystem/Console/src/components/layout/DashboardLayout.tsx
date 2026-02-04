import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Key,
  FileText,
  BarChart3,
  Receipt,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Shield,
  Home,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon, label, isActive, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

interface CurrentCompany {
  id: string;
  name: string;
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<CurrentCompany | null>(null);
  const [allCompanies, setAllCompanies] = useState<CurrentCompany[]>([]);
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: companyId } = useParams();

  // Check if we're on a company detail route
  const isCompanyRoute = location.pathname.startsWith('/companies/') && companyId && companyId !== 'new';

  useEffect(() => {
    async function fetchCompanies() {
      // Fetch all companies for the dropdown
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .order('created_at', { ascending: true });
      
      setAllCompanies(companiesData || []);
      
      // Set current company if on a company route
      if (isCompanyRoute && companyId) {
        const current = companiesData?.find(c => c.id === companyId);
        setCurrentCompany(current || null);
      } else if (companiesData && companiesData.length > 0) {
        // Auto-select the first created company
        setCurrentCompany(companiesData[0]);
      } else {
        setCurrentCompany(null);
      }
    }
    fetchCompanies();
  }, [companyId, isCompanyRoute]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const isExactActive = (path: string) => location.pathname === path;

  const mainNavItems = [
    { to: '/dashboard', icon: <Home className="h-4 w-4" />, label: 'Ana Sayfa' },
    { to: '/guide', icon: <BookOpen className="h-4 w-4" />, label: 'Kullanım Kılavuzu' },
  ];

  const adminNavItems = [
    { to: '/admin', icon: <Shield className="h-4 w-4" />, label: 'Admin Paneli' },
  ];

  const companySubNavItems = currentCompany ? [
    { to: `/companies/${currentCompany.id}/api-keys`, icon: <Key className="h-4 w-4" />, label: 'API Anahtarları' },
    { to: `/companies/${currentCompany.id}/logs`, icon: <FileText className="h-4 w-4" />, label: 'Kayıtlar' },
    { to: `/companies/${currentCompany.id}/analytics`, icon: <BarChart3 className="h-4 w-4" />, label: 'Analitik' },
    { to: `/companies/${currentCompany.id}/billing`, icon: <Receipt className="h-4 w-4" />, label: 'Faturalama' },
    { to: `/companies/${currentCompany.id}/settings`, icon: <Settings className="h-4 w-4" />, label: 'Ayarlar' },
  ] : [];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                DT
              </div>
              DiagnoseThat
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  isActive={item.to === '/companies' ? isExactActive(item.to) : isActive(item.to)}
                  onClick={closeSidebar}
                />
              ))}
            </nav>

            {/* Company Selector - Always visible when there are companies */}
            {allCompanies.length > 0 && (
              <>
                <Separator className="my-4" />

                {/* Company Selector Dropdown */}
                <div className="px-3 mb-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {currentCompany ? currentCompany.name : 'Firma Seç'}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                      <DropdownMenuLabel>Firma Seç</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {allCompanies.map((company) => (
                        <DropdownMenuItem
                          key={company.id}
                          onClick={() => {
                            navigate(`/companies/${company.id}/api-keys`);
                            closeSidebar();
                          }}
                          className={cn(
                            currentCompany?.id === company.id && "bg-accent"
                          )}
                        >
                          <Building2 className="mr-2 h-4 w-4" />
                          {company.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/companies" onClick={closeSidebar}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Tüm Firmalar
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Company Sub Navigation - Only when a company is selected */}
                {currentCompany && (
                  <nav className="space-y-1">
                    {companySubNavItems.map((item) => (
                      <NavItem
                        key={item.to}
                        {...item}
                        isActive={isExactActive(item.to)}
                        onClick={closeSidebar}
                      />
                    ))}
                  </nav>
                )}
              </>
            )}

            {isAdmin && (
              <>
                <Separator className="my-4" />

                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Yönetim
                  </p>
                </div>
                <nav className="space-y-1">
                  {adminNavItems.map((item) => (
                    <NavItem
                      key={item.to}
                      {...item}
                      isActive={isActive(item.to)}
                      onClick={closeSidebar}
                    />
                  ))}
                </nav>
              </>
            )}
          </ScrollArea>

          {/* User section */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium truncate max-w-[120px]">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Ayarlar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
