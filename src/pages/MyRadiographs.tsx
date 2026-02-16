import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Upload, Eye, Calendar, Image as ImageIcon } from 'lucide-react';
import { RadiographThumbnail } from '@/components/RadiographThumbnail';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';

interface Radiograph {
  id: string;
  original_filename: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  analysis_status: string | null;
  created_at: string;
}

export default function MyRadiographs() {
  const { t, language } = useI18n();
  const { user, isPatient, isDentist } = useAuth();
  const navigate = useNavigate();
  const [radiographs, setRadiographs] = useState<Radiograph[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchRadiographs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('radiographs')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching radiographs:', error);
        return;
      }

      setRadiographs(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRadiographs();
    }
  }, [user, fetchRadiographs]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('radiographs')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create radiograph record
      const { data: radiograph, error: insertError } = await supabase
        .from('radiographs')
        .insert({
          owner_user_id: user.id,
          storage_path: fileName,
          original_filename: file.name,
          file_size: file.size,
          analysis_status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast.success(language === 'tr' ? 'Röntgen yüklendi!' : 'Radiograph uploaded!');
      navigate(`/analysis/${radiograph.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(language === 'tr' ? 'Yükleme başarısız' : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [user, language, fetchRadiographs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      pending: language === 'tr' ? 'Bekliyor' : 'Pending',
      processing: language === 'tr' ? 'İşleniyor' : 'Processing',
      completed: language === 'tr' ? 'Tamamlandı' : 'Completed',
      failed: language === 'tr' ? 'Başarısız' : 'Failed',
    };
    return labels[status || 'pending'] || status;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-primary';
      case 'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  // Only patients (not dentists) can see this page
  if (isDentist) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <p className="text-muted-foreground">
            {language === 'tr' 
              ? 'Bu sayfa sadece hastalar için geçerlidir.' 
              : 'This page is only for patients.'}
          </p>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {language === 'tr' ? 'Radyograflarım' : 'My Radiographs'}
          </h1>
        </div>

        {/* Upload Zone */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              {isUploading ? (
                <p className="text-muted-foreground">
                  {language === 'tr' ? 'Yükleniyor...' : 'Uploading...'}
                </p>
              ) : isDragActive ? (
                <p className="text-primary">
                  {language === 'tr' ? 'Dosyayı bırakın...' : 'Drop the file...'}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {language === 'tr' 
                    ? 'Röntgen görüntüsünü sürükleyip bırakın veya tıklayarak seçin' 
                    : 'Drag and drop a radiograph or click to select'}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t.home.demo.supportedFormats}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Radiograph List */}
        {radiographs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {language === 'tr' 
                  ? 'Henüz röntgen yüklenmemiş.' 
                  : 'No radiographs uploaded yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {radiographs.map((radiograph) => (
              <Card 
                key={radiograph.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/analysis/${radiograph.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base truncate">
                        {radiograph.original_filename || 'Radiograph'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(
                          new Date(radiograph.created_at),
                          'dd MMM yyyy',
                          { locale: language === 'tr' ? tr : enUS }
                        )}
                      </CardDescription>
                    </div>
                    <span className={`text-xs font-medium ${getStatusColor(radiograph.analysis_status)}`}>
                      {getStatusLabel(radiograph.analysis_status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <RadiographThumbnail
                    storagePath={radiograph.storage_path}
                    analysisStatus={radiograph.analysis_status}
                    originalFilename={radiograph.original_filename}
                    className="aspect-video"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/analysis/${radiograph.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {language === 'tr' ? 'Görüntüle' : 'View'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
