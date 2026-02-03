import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Upload,
  Image as ImageIcon,
  Trash2,
  Pencil,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
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

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  patient_ref: string;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  identity_number: string | null;
  created_at: string;
}

interface Radiograph {
  id: string;
  original_filename: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  analysis_status: string | null;
  created_at: string;
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useI18n();
  const { user, isDentist } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [radiographs, setRadiographs] = useState<Radiograph[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    identity_number: '',
    phone: '',
    address: '',
    birth_date: '',
  });

  useEffect(() => {
    if (id && user && isDentist) {
      fetchPatient();
      fetchRadiographs();
    }
  }, [id, user, isDentist]);

  useEffect(() => {
    if (patient) {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        identity_number: patient.identity_number || '',
        phone: patient.phone || '',
        address: patient.address || '',
        birth_date: patient.birth_date || '',
      });
    }
  }, [patient]);

  const fetchPatient = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching patient:', error);
        navigate('/patients');
        return;
      }

      setPatient(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRadiographs = async () => {
    try {
      const { data, error } = await supabase
        .from('radiographs')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching radiographs:', error);
        return;
      }

      setRadiographs(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!patient || !formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error(language === 'tr' ? 'Ad ve soyad zorunludur' : 'First name and last name are required');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          identity_number: formData.identity_number.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          birth_date: formData.birth_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', patient.id);

      if (error) {
        console.error('Error updating patient:', error);
        toast.error(language === 'tr' ? 'Hasta güncellenemedi' : 'Failed to update patient');
        return;
      }

      toast.success(language === 'tr' ? 'Hasta güncellendi' : 'Patient updated');
      setIsEditing(false);
      fetchPatient();
    } catch (err) {
      console.error('Error:', err);
      toast.error(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (patient) {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        identity_number: patient.identity_number || '',
        phone: patient.phone || '',
        address: patient.address || '',
        birth_date: patient.birth_date || '',
      });
    }
    setIsEditing(false);
  };

  const handleDeletePatient = async () => {
    if (!patient) return;

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patient.id);

      if (error) {
        console.error('Error deleting patient:', error);
        toast.error(language === 'tr' ? 'Hasta silinemedi' : 'Failed to delete patient');
        return;
      }

      toast.success(language === 'tr' ? 'Hasta silindi' : 'Patient deleted');
      navigate('/patients');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (!isDentist) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">
            {language === 'tr' ? 'Bu sayfaya erişim yetkiniz yok.' : 'You do not have access to this page.'}
          </p>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!patient) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">
            {language === 'tr' ? 'Hasta bulunamadı.' : 'Patient not found.'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/patients')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.common.back}
        </Button>

        {/* Patient Info Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {patient.first_name} {patient.last_name}
                  </CardTitle>
                  <p className="text-muted-foreground">{patient.patient_ref}</p>
                </div>
              </div>
              {!isEditing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {language === 'tr' ? 'Düzenle' : 'Edit'}
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="border-t pt-4">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{t.patients.form.firstName} *</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{t.patients.form.lastName} *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identity_number">{t.patients.form.identityNumber}</Label>
                  <Input
                    id="identity_number"
                    name="identity_number"
                    value={formData.identity_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.patients.form.phone}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">{t.patients.form.birthDate}</Label>
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">{t.patients.form.address}</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t.common.cancel}
                  </Button>
                  <Button 
                    onClick={handleSaveEdit} 
                    disabled={isSaving}
                    className="gradient-primary"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {t.patients.form.save}
                  </Button>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t.common.delete}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {language === 'tr' ? 'Hastayı Sil' : 'Delete Patient'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {language === 'tr' 
                            ? 'Bu hastayı ve tüm röntgenlerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
                            : 'Are you sure you want to delete this patient and all their radiographs? This action cannot be undone.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePatient}>
                          {t.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patient.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.birth_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(patient.birth_date), 'dd.MM.yyyy')}</span>
                  </div>
                )}
                {patient.identity_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.identity_number}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-3 text-sm col-span-full">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{patient.address}</span>
                  </div>
                )}
                {!patient.phone && !patient.birth_date && !patient.identity_number && !patient.address && (
                  <p className="text-sm text-muted-foreground col-span-full">
                    {language === 'tr' ? 'Ek bilgi girilmemiş.' : 'No additional information provided.'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radiographs Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.patients.detail.radiographs}</CardTitle>
              <Button onClick={() => navigate(`/patients/${patient.id}/upload`)} className="gradient-primary">
                <Upload className="h-4 w-4 mr-2" />
                {t.patients.detail.uploadRadiograph}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {radiographs.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{t.patients.detail.noRadiographs}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {radiographs.map(radiograph => (
                  <div
                    key={radiograph.id}
                    className="aspect-square rounded-lg bg-muted border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all overflow-hidden"
                    onClick={() => navigate(`/analysis/${radiograph.id}`)}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
