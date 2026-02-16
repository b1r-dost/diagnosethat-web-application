import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Stethoscope, User } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['dentist', 'patient']),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
});

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'login' | 'signup';
}

export function LoginDialog({ open, onOpenChange, defaultMode = 'login' }: LoginDialogProps) {
  const { t, brandName, language } = useI18n();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'dentist' | 'patient'>('dentist');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsDialog, setTermsDialog] = useState(false);
  const [privacyDialog, setPrivacyDialog] = useState(false);
  const [termsUrl, setTermsUrl] = useState<string | null>(null);
  const [privacyUrl, setPrivacyUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchLegalDocs = async () => {
      const { data } = await supabase
        .from('legal_documents')
        .select('*')
        .in('document_type', ['terms_of_service', 'privacy_policy']);
      if (data) {
        for (const doc of data) {
          if (doc.document_type === 'terms_of_service' && doc.file_url) setTermsUrl(doc.file_url);
          if (doc.document_type === 'privacy_policy' && doc.file_url) setPrivacyUrl(doc.file_url);
        }
      }
    };
    fetchLegalDocs();
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
    setSuccess(null);
    setAcceptTerms(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
      setMode(defaultMode);
    }
    onOpenChange(newOpen);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const validation = loginSchema.safeParse({ email, password });
      if (!validation.success) {
        if (validation.error.issues.some(e => e.path[0] === 'email')) {
          setError(t.auth.emailInvalid);
        } else if (validation.error.issues.some(e => e.path[0] === 'password')) {
          setError(t.auth.passwordMinLength);
        }
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        onOpenChange(false);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const validation = signupSchema.safeParse({
        email, password, confirmPassword, firstName, lastName, role
      });

      if (!validation.success) {
        const errors = validation.error.issues;
        if (errors.some(e => e.path[0] === 'email')) {
          setError(t.auth.emailInvalid);
        } else if (errors.some(e => e.path[0] === 'password')) {
          setError(t.auth.passwordMinLength);
        } else if (errors.some(e => e.path[0] === 'confirmPassword')) {
          setError(t.auth.passwordMismatch);
        } else if (errors.some(e => e.path[0] === 'firstName' || e.path[0] === 'lastName')) {
          setError(t.auth.emailRequired);
        }
        setIsLoading(false);
        return;
      }

      const { error } = await signUp(email, password, firstName, lastName, role);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(t.auth.signupSuccess);
        resetForm();
      }
    } catch (err) {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(t.auth.resetEmailSent);
      }
    } catch (err) {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl text-center">{brandName}</DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'login' && t.auth.login}
            {mode === 'signup' && t.auth.signup}
            {mode === 'forgot' && t.auth.forgotPassword}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-email">{t.auth.email}</Label>
              <Input
                id="dialog-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-password">{t.auth.password}</Label>
              <Input
                id="dialog-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.auth.login}
            </Button>
            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
                className="text-primary hover:underline"
              >
                {t.auth.forgotPassword}
              </button>
              <p className="text-muted-foreground">
                {t.auth.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                  className="text-primary hover:underline"
                >
                  {t.auth.signup}
                </button>
              </p>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-firstName">{t.auth.firstName}</Label>
                <Input
                  id="dialog-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dialog-lastName">{t.auth.lastName}</Label>
                <Input
                  id="dialog-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-signup-email">{t.auth.email}</Label>
              <Input
                id="dialog-signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-signup-password">{t.auth.password}</Label>
              <Input
                id="dialog-signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-confirmPassword">{t.auth.confirmPassword}</Label>
              <Input
                id="dialog-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-3">
              <Label>{t.auth.selectRole}</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as 'dentist' | 'patient')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="dentist" id="dialog-dentist" />
                  <Label htmlFor="dialog-dentist" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Stethoscope className="h-4 w-4" />
                    {t.auth.dentist}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="patient" id="dialog-patient" />
                  <Label htmlFor="dialog-patient" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="h-4 w-4" />
                    {t.auth.patient}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {/* Terms of Service Checkbox */}
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="dialog-accept-terms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => setAcceptTerms(v === true)}
                />
                <div className="grid gap-1 leading-none">
                  <label htmlFor="dialog-accept-terms" className="text-sm cursor-pointer">
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => setTermsDialog(true)}
                    >
                      {t.legal.termsOfService}
                    </button>
                    {' '}{t.legal.acceptTerms}
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground ml-7">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setPrivacyDialog(true)}
                >
                  {t.legal.reviewPrivacy}
                </button>
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !acceptTerms}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.auth.signup}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t.auth.hasAccount}{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="text-primary hover:underline"
              >
                {t.auth.login}
              </button>
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-forgot-email">{t.auth.email}</Label>
              <Input
                id="dialog-forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.auth.resetPassword}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="text-primary hover:underline"
              >
                {t.common.back}
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>

    {/* Terms of Service Dialog */}
    <Dialog open={termsDialog} onOpenChange={setTermsDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.legal.termsOfService}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert">
          {termsUrl ? (
            <p className="text-sm text-muted-foreground">
              <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {language === 'tr' ? 'Belgeyi indirmek için tıklayın' : 'Click to download document'}
              </a>
            </p>
          ) : (
            <p className="text-muted-foreground">
              {language === 'tr' ? 'Belge henüz yüklenmemiştir.' : 'Document has not been uploaded yet.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Privacy Policy Dialog */}
    <Dialog open={privacyDialog} onOpenChange={setPrivacyDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.legal.privacyPolicy}</DialogTitle>
        </DialogHeader>
        <div className="prose prose-sm dark:prose-invert">
          {privacyUrl ? (
            <p className="text-sm text-muted-foreground">
              <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {language === 'tr' ? 'Belgeyi indirmek için tıklayın' : 'Click to download document'}
              </a>
            </p>
          ) : (
            <p className="text-muted-foreground">
              {language === 'tr' ? 'Belge henüz yüklenmemiştir.' : 'Document has not been uploaded yet.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
