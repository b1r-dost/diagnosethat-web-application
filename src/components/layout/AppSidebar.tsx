import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Lightbulb, 
  BookOpen, 
  Shield, 
  Settings, 
  LogOut,
  Home
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const { t, brandName } = useI18n();
  const { user, profile, isAdmin, isDentist, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const mainMenuItems = [
    { title: t.nav.home, url: '/', icon: Home, show: !user },
    { title: t.nav.dashboard, url: '/dashboard', icon: LayoutDashboard, show: !!user },
    { title: t.nav.patients, url: '/patients', icon: Users, show: isDentist },
    { title: t.nav.suggestions, url: '/suggestions', icon: Lightbulb, show: isDentist },
    { title: t.nav.guide, url: '/guide', icon: BookOpen, show: !!user },
    { title: t.nav.admin, url: '/admin', icon: Shield, show: isAdmin },
  ].filter(item => item.show);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            {brandName[0]}
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-primary">{brandName}</span>
          )}
        </Link>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{collapsed ? '' : (user ? t.nav.dashboard : 'Menu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link 
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3",
                        isActive(item.url) && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user ? (
          <div className="space-y-3">
            <Separator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive('/settings')}
                  tooltip={t.nav.settings}
                >
                  <Link 
                    to="/settings"
                    className={cn(
                      "flex items-center gap-3",
                      isActive('/settings') && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t.nav.settings}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleSignOut}
                  tooltip={t.nav.logout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.nav.logout}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {!collapsed && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                  <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.first_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth?mode=login">{t.nav.login}</Link>
            </Button>
            <Button asChild className="w-full">
              <Link to="/auth?mode=signup">{t.nav.signup}</Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
