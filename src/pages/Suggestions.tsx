import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  image_url: string | null;
}

interface SuggestionResponse {
  id: string;
  response: string;
  created_at: string;
}

export default function Suggestions() {
  const { t, language } = useI18n();
  const { user, isLoading: authLoading, isDentist } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      setSuggestions(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('suggestions')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: 'open'
        });

      if (error) {
        console.error('Error submitting suggestion:', error);
        toast.error(language === 'tr' ? 'Öneri gönderilemedi' : 'Failed to submit suggestion');
        return;
      }

      toast.success(language === 'tr' ? 'Öneri gönderildi' : 'Suggestion submitted');
      setTitle('');
      setDescription('');
      setIsDialogOpen(false);
      fetchSuggestions();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'open':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'outline';
      case 'closed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    return t.suggestions.status[status as keyof typeof t.suggestions.status] || status;
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t.suggestions.title}</h1>
          {isDentist && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.suggestions.newSuggestion}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.suggestions.newSuggestion}</DialogTitle>
                  <DialogDescription>
                    {language === 'tr' 
                      ? 'Öneri veya geri bildiriminizi paylaşın' 
                      : 'Share your suggestion or feedback'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t.suggestions.form.title}</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={language === 'tr' ? 'Önerinizin başlığı' : 'Title of your suggestion'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t.suggestions.form.description}</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={language === 'tr' ? 'Detaylı açıklama' : 'Detailed description'}
                      rows={5}
                    />
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !title.trim() || !description.trim()}
                    className="w-full gradient-primary"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t.suggestions.form.submit}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t.suggestions.noSuggestions}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {suggestions.map(suggestion => (
              <Card key={suggestion.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                      <CardDescription>
                        {format(new Date(suggestion.created_at), 'dd.MM.yyyy HH:mm')}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(suggestion.status)} className="flex items-center gap-1">
                      {getStatusIcon(suggestion.status)}
                      {getStatusText(suggestion.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{suggestion.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
