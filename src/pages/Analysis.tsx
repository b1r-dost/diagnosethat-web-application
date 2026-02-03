import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Radiograph {
  id: string;
  original_filename: string | null;
  storage_path: string;
  analysis_status: string | null;
  analysis_result: unknown;
  created_at: string;
  patient_id: string | null;
}

interface Finding {
  id: number;
  tooth_number: string;
  condition: string;
  confidence: number;
  severity: string;
}

export default function Analysis() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useI18n();
  const { user, isDentist } = useAuth();
  const navigate = useNavigate();
  const [radiograph, setRadiograph] = useState<Radiograph | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTeethMask, setShowTeethMask] = useState(true);
  const [showDiseaseMask, setShowDiseaseMask] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mock findings data - will be replaced with real API data
  const mockFindings: Finding[] = [
    { id: 1, tooth_number: '16', condition: 'Çürük', confidence: 0.92, severity: 'Orta' },
    { id: 2, tooth_number: '24', condition: 'Periodontitis', confidence: 0.85, severity: 'Hafif' },
    { id: 3, tooth_number: '36', condition: 'Kök kanal enfeksiyonu', confidence: 0.78, severity: 'Ciddi' },
    { id: 4, tooth_number: '45', condition: 'Çürük', confidence: 0.88, severity: 'Hafif' },
  ];

  useEffect(() => {
    if (id && user && isDentist) {
      fetchRadiograph();
    }
  }, [id, user, isDentist]);

  const fetchRadiograph = async () => {
    try {
      const { data, error } = await supabase
        .from('radiographs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching radiograph:', error);
        navigate(-1);
        return;
      }

      setRadiograph(data);

      // Get signed URL for image
      const { data: urlData } = await supabase.storage
        .from('radiographs')
        .createSignedUrl(data.storage_path, 3600);

      if (urlData) {
        setImageUrl(urlData.signedUrl);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    // Simulate analysis - will be replaced with real API call
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'ciddi':
      case 'severe':
        return 'text-red-500';
      case 'orta':
      case 'moderate':
        return 'text-amber-500';
      default:
        return 'text-green-500';
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
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => radiograph?.patient_id ? navigate(`/patients/${radiograph.patient_id}`) : navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReanalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {language === 'tr' ? 'Yeniden Analiz' : 'Reanalyze'}
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {language === 'tr' ? 'Rapor İndir' : 'Download Report'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Image Viewer */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>{language === 'tr' ? 'Röntgen Görüntüsü' : 'Radiograph Image'}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="teeth-mask" 
                      checked={showTeethMask}
                      onCheckedChange={setShowTeethMask}
                    />
                    <Label htmlFor="teeth-mask" className="text-sm flex items-center gap-1">
                      {showTeethMask ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {language === 'tr' ? 'Dişler' : 'Teeth'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="disease-mask" 
                      checked={showDiseaseMask}
                      onCheckedChange={setShowDiseaseMask}
                    />
                    <Label htmlFor="disease-mask" className="text-sm flex items-center gap-1">
                      {showDiseaseMask ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {language === 'tr' ? 'Hastalıklar' : 'Diseases'}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted rounded-lg overflow-hidden">
                {imageUrl ? (
                  <div className="relative">
                    <img 
                      src={imageUrl} 
                      alt="Radiograph" 
                      className="w-full h-auto"
                    />
                    {/* Overlay for masks - placeholder */}
                    {(showTeethMask || showDiseaseMask) && (
                      <div className="absolute inset-0 pointer-events-none">
                        {showTeethMask && (
                          <div className="absolute inset-0 bg-primary/10" />
                        )}
                        {showDiseaseMask && (
                          <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-destructive/30 rounded-full" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center">
                    <p className="text-muted-foreground">
                      {language === 'tr' ? 'Görüntü yüklenemedi' : 'Image could not be loaded'}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {radiograph?.original_filename}
              </p>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle>{language === 'tr' ? 'Analiz Sonuçları' : 'Analysis Results'}</CardTitle>
            </CardHeader>
            <CardContent>
              {radiograph?.analysis_status === 'pending' || isAnalyzing ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    {language === 'tr' ? 'Analiz devam ediyor...' : 'Analysis in progress...'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'tr' ? 'Diş No' : 'Tooth #'}</TableHead>
                      <TableHead>{language === 'tr' ? 'Durum' : 'Condition'}</TableHead>
                      <TableHead>{language === 'tr' ? 'Güven' : 'Confidence'}</TableHead>
                      <TableHead>{language === 'tr' ? 'Şiddet' : 'Severity'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockFindings.map((finding) => (
                      <TableRow key={finding.id}>
                        <TableCell className="font-medium">{finding.tooth_number}</TableCell>
                        <TableCell>{finding.condition}</TableCell>
                        <TableCell>{(finding.confidence * 100).toFixed(0)}%</TableCell>
                        <TableCell className={getSeverityColor(finding.severity)}>
                          {finding.severity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
