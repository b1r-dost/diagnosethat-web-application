import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export default function UploadRadiograph() {
  const { id: patientId } = useParams<{ id: string }>();
  const { t, language } = useI18n();
  const { user, isDentist } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!file || !user || !patientId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${patientId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('radiographs')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(language === 'tr' ? 'Yükleme başarısız' : 'Upload failed');
        return;
      }

      // Create radiograph record
      const { data: radiograph, error: dbError } = await supabase
        .from('radiographs')
        .insert({
          patient_id: patientId,
          owner_user_id: user.id,
          storage_path: fileName,
          original_filename: file.name,
          file_size: file.size,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error(language === 'tr' ? 'Kayıt oluşturulamadı' : 'Failed to create record');
        return;
      }

      toast.success(language === 'tr' ? 'Röntgen yüklendi' : 'Radiograph uploaded');
      navigate(`/analysis/${radiograph.id}`);
    } catch (err) {
      console.error('Error:', err);
      toast.error(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
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

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/patients/${patientId}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.common.back}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t.patients.detail.uploadRadiograph}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!preview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {isDragActive
                    ? (language === 'tr' ? 'Dosyayı bırakın...' : 'Drop the file here...')
                    : (language === 'tr' 
                        ? 'Röntgen görüntüsünü sürükleyip bırakın veya seçmek için tıklayın' 
                        : 'Drag and drop a radiograph image, or click to select')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  PNG, JPG, JPEG, WEBP (max 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="w-full h-auto max-h-96 object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {file?.name} ({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/patients/${patientId}`)}
              >
                {t.common.cancel}
              </Button>
              <Button
                className="flex-1 gradient-primary"
                onClick={handleUpload}
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'tr' ? 'Yükleniyor...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {language === 'tr' ? 'Yükle ve Analiz Et' : 'Upload & Analyze'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
