import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export default function AuthPage() {
  const { t, brandName, language } = useI18n();
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(
    (searchParams.get('mode') as 'login' | 'signup' | 'forgot' | 'reset') || 'login'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
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

  // Check URL hash / storage for password recovery on mount
  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery =
      hash.includes('type=recovery') ||
      searchParams.get('type') === 'recovery' ||
      sessionStorage.getItem('pw_recovery') === '1';

    if (isRecovery) {
      setMode('reset');
    }
  }, [searchParams]);

  // Redirect if already logged in (but not during password reset)
  useEffect(() => {
    const isRecovery =
      mode === 'reset' ||
      window.location.hash.includes('type=recovery') ||
      searchParams.get('type') === 'recovery' ||
      sessionStorage.getItem('pw_recovery') === '1';

    if (user && !authLoading && !isRecovery) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate, mode, searchParams]);

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
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
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
        redirectTo: `${window.location.origin}/auth?mode=reset`,
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate passwords
    if (newPassword.length < 6) {
      setError(t.auth.passwordMinLength);
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(t.auth.passwordMismatch);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        // Sign out, clear URL hash, and redirect to login
        await supabase.auth.signOut();
        window.history.replaceState(null, '', '/auth?mode=login');
        setSuccess(t.auth.passwordResetSuccess);
        setNewPassword('');
        setConfirmNewPassword('');
        setMode('login');
      }
    } catch (err) {
      setError(t.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{brandName}</CardTitle>
            <CardDescription>
              {mode === 'login' && t.auth.login}
              {mode === 'signup' && t.auth.signup}
              {mode === 'forgot' && t.auth.forgotPassword}
              {mode === 'reset' && t.auth.setNewPassword}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.auth.password}</Label>
                  <Input
                    id="password"
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
                    onClick={() => setMode('forgot')}
                    className="text-primary hover:underline"
                  >
                    {t.auth.forgotPassword}
                  </button>
                  <p className="text-muted-foreground">
                    {t.auth.noAccount}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
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
                    <Label htmlFor="firstName">{t.auth.firstName}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.auth.lastName}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t.auth.email}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                  <Input
                    id="confirmPassword"
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
                      <RadioGroupItem value="dentist" id="dentist" />
                      <Label htmlFor="dentist" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Stethoscope className="h-4 w-4" />
                        {t.auth.dentist}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="patient" id="patient" />
                      <Label htmlFor="patient" className="flex items-center gap-2 cursor-pointer flex-1">
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
                      id="accept-terms"
                      checked={acceptTerms}
                      onCheckedChange={(v) => setAcceptTerms(v === true)}
                    />
                    <div className="grid gap-1 leading-none">
                      <label htmlFor="accept-terms" className="text-sm cursor-pointer">
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
                    onClick={() => setMode('login')}
                    className="text-primary hover:underline"
                  >
                    {t.auth.login}
                  </button>
                </p>
              </form>
            )}

            {/* Terms of Service Dialog */}
            <Dialog open={termsDialog} onOpenChange={setTermsDialog}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.legal.termsOfService}</DialogTitle>
                </DialogHeader>
                {termsUrl ? (
                  <iframe src={termsUrl} className="w-full h-[60vh] border-0 rounded" title="Terms of Service" />
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    {language === 'tr' ? 'Belge henüz yüklenmemiştir.' : 'Document has not been uploaded yet.'}
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Privacy Policy Dialog */}
            <Dialog open={privacyDialog} onOpenChange={setPrivacyDialog}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t.legal.privacyPolicy}</DialogTitle>
                </DialogHeader>
                {privacyUrl ? (
                  <iframe src={privacyUrl} className="w-full h-[60vh] border-0 rounded" title="Privacy Policy" />
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    {language === 'tr' ? 'Belge henüz yüklenmemiştir.' : 'Document has not been uploaded yet.'}
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">{t.auth.email}</Label>
                  <Input
                    id="forgot-email"
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
                    onClick={() => setMode('login')}
                    className="text-primary hover:underline"
                  >
                    {t.common.back}
                  </button>
                </p>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t.auth.newPassword}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{t.auth.confirmNewPassword}</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.auth.setNewPassword}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-primary hover:underline"
                  >
                    {t.common.back}
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
