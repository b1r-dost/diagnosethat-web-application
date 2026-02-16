import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, 
  User, 
  Lock, 
  CreditCard,
  Upload,
  Trash2,
  Building2,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { SubscriptionTab } from '@/components/settings/SubscriptionTab';

export default function Settings() {
  const { t, language } = useI18n();
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setInstitutionName(profile.institution_name || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          institution_name: institutionName,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error(t.settings.profile.error);
        return;
      }

      toast.success(t.settings.profile.success);
      refreshProfile();
    } catch (err) {
      console.error('Error:', err);
      toast.error(t.settings.profile.error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'tr' ? 'Sadece resim dosyaları yüklenebilir' : 'Only image files are allowed');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'tr' ? 'Dosya boyutu 2MB\'dan küçük olmalı' : 'File size must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(language === 'tr' ? 'Yükleme başarısız' : 'Upload failed');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error(language === 'tr' ? 'Profil güncellenemedi' : 'Failed to update profile');
        return;
      }

      toast.success(language === 'tr' ? 'Avatar güncellendi' : 'Avatar updated');
      refreshProfile();
    } catch (err) {
      console.error('Error:', err);
      toast.error(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'tr' ? 'Sadece resim dosyaları yüklenebilir' : 'Only image files are allowed');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'tr' ? 'Dosya boyutu 2MB\'dan küçük olmalı' : 'File size must be less than 2MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(language === 'tr' ? 'Yükleme başarısız' : 'Upload failed');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ institution_logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error(language === 'tr' ? 'Profil güncellenemedi' : 'Failed to update profile');
        return;
      }

      toast.success(language === 'tr' ? 'Logo güncellendi' : 'Logo updated');
      refreshProfile();
    } catch (err) {
      console.error('Error:', err);
      toast.error(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error:', error);
        toast.error(language === 'tr' ? 'Avatar silinemedi' : 'Failed to remove avatar');
        return;
      }

      toast.success(language === 'tr' ? 'Avatar silindi' : 'Avatar removed');
      refreshProfile();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ institution_logo_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error:', error);
        toast.error(language === 'tr' ? 'Logo silinemedi' : 'Failed to remove logo');
        return;
      }

      toast.success(language === 'tr' ? 'Logo silindi' : 'Logo removed');
      refreshProfile();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t.auth.passwordMismatch);
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t.auth.passwordMinLength);
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        toast.error(t.settings.password.error);
        return;
      }

      toast.success(t.settings.password.success);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error:', err);
      toast.error(t.settings.password.error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Note: Account deletion requires admin privileges or edge function
    toast.error(language === 'tr' 
      ? 'Hesap silme işlemi için destek ile iletişime geçin.' 
      : 'Please contact support to delete your account.');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : user.email?.[0]?.toUpperCase() || 'U';

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{t.settings.title}</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t.settings.tabs.profile}
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t.settings.tabs.password}
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t.settings.tabs.subscription}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.profile.title}</CardTitle>
                <CardDescription>
                  {language === 'tr' 
                    ? 'Profil bilgilerinizi güncelleyin' 
                    : 'Update your profile information'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="space-y-2">
                  <Label>{t.settings.profile.uploadAvatar}</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={isUploadingAvatar}
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {t.settings.profile.uploadAvatar}
                        </Button>
                        {profile?.avatar_url && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleRemoveAvatar}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === 'tr' ? 'Max 2MB, JPG/PNG' : 'Max 2MB, JPG/PNG'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Institution Logo */}
                <div className="space-y-2">
                  <Label>{language === 'tr' ? 'Kurum Logosu' : 'Institution Logo'}</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                      {profile?.institution_logo_url ? (
                        <img 
                          src={profile.institution_logo_url} 
                          alt="Logo" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={isUploadingLogo}
                          onClick={() => document.getElementById('logo-upload')?.click()}
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {language === 'tr' ? 'Logo Yükle' : 'Upload Logo'}
                        </Button>
                        {profile?.institution_logo_url && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleRemoveLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === 'tr' ? 'Max 2MB, JPG/PNG' : 'Max 2MB, JPG/PNG'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.settings.profile.firstName}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.settings.profile.lastName}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">{t.settings.profile.institution}</Label>
                  <Input
                    id="institution"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.auth.email}</Label>
                  <Input value={user.email || ''} disabled />
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSavingProfile}
                  className="gradient-primary"
                >
                  {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.settings.profile.save}
                </Button>
              </CardContent>
            </Card>

            {/* Account Deletion */}
            <Card className="mt-6 border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">{t.settings.account.title}</CardTitle>
                <CardDescription>{t.settings.account.deleteWarning}</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.settings.account.delete}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.settings.account.delete}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t.settings.account.deleteWarning}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount}>
                        {t.settings.account.deleteButton}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.password.title}</CardTitle>
                <CardDescription>
                  {language === 'tr' 
                    ? 'Hesap şifrenizi değiştirin' 
                    : 'Change your account password'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t.settings.password.new}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.settings.password.confirm}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="gradient-primary"
                >
                  {isChangingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.settings.password.change}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <SubscriptionTab />
        </Tabs>
      </div>
    </MainLayout>
  );
}
