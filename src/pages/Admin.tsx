import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  Users, 
  MessageSquare,
  Map,
  Server,
  Search,
  FileText
} from 'lucide-react';
import { LegalDocumentsTab } from '@/components/admin/LegalDocumentsTab';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user_id: string;
}

export default function Admin() {
  const { t, language } = useI18n();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
    if (!authLoading && user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(usersData || []);

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*');

      setRoles(rolesData || []);

      // Fetch suggestions
      const { data: suggestionsData } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      setSuggestions(suggestionsData || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserRole = (userId: string) => {
    const role = roles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'dentist':
        return 'default';
      case 'patient':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return fullName.includes(query);
  });

  if (authLoading || !isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">{t.admin.title}</h1>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.admin.tabs.users}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.admin.tabs.suggestions}
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              {t.admin.tabs.roadmap}
            </TabsTrigger>
            <TabsTrigger value="server" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              {t.admin.tabs.server}
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t.admin.tabs.legal}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.users.title}</CardTitle>
                <CardDescription>
                  {language === 'tr' 
                    ? `${users.length} kayıtlı kullanıcı` 
                    : `${users.length} registered users`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t.admin.users.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.admin.users.name}</TableHead>
                        <TableHead>{t.admin.users.role}</TableHead>
                        <TableHead>{t.admin.users.country}</TableHead>
                        <TableHead>{t.admin.users.registeredAt}</TableHead>
                        <TableHead>{t.admin.users.lastLogin}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell>
                            {u.first_name || u.last_name 
                              ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(getUserRole(u.user_id))}>
                              {getUserRole(u.user_id)}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.country || '-'}</TableCell>
                          <TableCell>{format(new Date(u.created_at), 'dd.MM.yyyy')}</TableCell>
                          <TableCell>
                            {u.last_login_at 
                              ? format(new Date(u.last_login_at), 'dd.MM.yyyy HH:mm')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.suggestions.title}</CardTitle>
                <CardDescription>
                  {language === 'tr' 
                    ? `${suggestions.length} öneri` 
                    : `${suggestions.length} suggestions`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t.admin.suggestions.noSuggestions}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map(s => (
                      <Card key={s.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{s.title}</CardTitle>
                            <Badge>{s.status}</Badge>
                          </div>
                          <CardDescription>
                            {format(new Date(s.created_at), 'dd.MM.yyyy HH:mm')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{s.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap">
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.roadmap.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  {language === 'tr' 
                    ? 'Yol haritası yönetimi yakında eklenecek' 
                    : 'Roadmap management coming soon'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Server Tab */}
          <TabsContent value="server">
            <Card>
              <CardHeader>
                <CardTitle>{t.admin.server.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  {t.admin.server.inactive}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Documents Tab */}
          <TabsContent value="legal">
            <LegalDocumentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
