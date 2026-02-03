import { useState, useEffect, useCallback } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCcw,
  Sun,
  Contrast,
  Printer
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
  analysis_result: AnalysisResult | null;
  job_id: string | null;
  created_at: string;
  patient_id: string | null;
}

interface AnalysisResult {
  teeth?: Array<{
    id: number;
    polygon: number[][];
    tooth_number: number;
  }>;
  diseases?: Array<{
    id: number;
    polygon: number[][];
    disease_type: string;
    tooth_id?: number;
    confidence?: number;
  }>;
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
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [findings, setFindings] = useState<Finding[]>([]);
  
  // Image adjustment controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  // Parse analysis result to findings
  const parseResultToFindings = useCallback((result: AnalysisResult | null): Finding[] => {
    if (!result || !result.diseases) return [];
    
    return result.diseases.map((disease, index) => ({
      id: disease.id || index + 1,
      tooth_number: disease.tooth_id?.toString() || '-',
      condition: getDiseaseLabel(disease.disease_type),
      confidence: disease.confidence || 0.85,
      severity: getSeverityFromType(disease.disease_type),
    }));
  }, []);

  const getDiseaseLabel = (type: string): string => {
    const labels: Record<string, string> = {
      caries: language === 'tr' ? 'Çürük' : 'Caries',
      periodontitis: 'Periodontitis',
      periapical_lesion: language === 'tr' ? 'Periapikal Lezyon' : 'Periapical Lesion',
      root_canal: language === 'tr' ? 'Kök Kanal Enfeksiyonu' : 'Root Canal Infection',
      bone_loss: language === 'tr' ? 'Kemik Kaybı' : 'Bone Loss',
      impacted: language === 'tr' ? 'Gömülü Diş' : 'Impacted Tooth',
    };
    return labels[type] || type;
  };

  const getSeverityFromType = (type: string): string => {
    const severityMap: Record<string, string> = {
      caries: language === 'tr' ? 'Orta' : 'Moderate',
      periodontitis: language === 'tr' ? 'Hafif' : 'Mild',
      periapical_lesion: language === 'tr' ? 'Ciddi' : 'Severe',
      root_canal: language === 'tr' ? 'Ciddi' : 'Severe',
      bone_loss: language === 'tr' ? 'Orta' : 'Moderate',
      impacted: language === 'tr' ? 'Hafif' : 'Mild',
    };
    return severityMap[type] || (language === 'tr' ? 'Bilinmiyor' : 'Unknown');
  };

  const fetchRadiograph = useCallback(async () => {
    if (!id || !user) return;
    
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

      setRadiograph(data as Radiograph);
      
      // Parse findings from result if available
      if (data.analysis_result) {
        setFindings(parseResultToFindings(data.analysis_result as AnalysisResult));
      }

      // Get signed URL for image
      const { data: urlData } = await supabase.storage
        .from('radiographs')
        .createSignedUrl(data.storage_path, 3600);

      if (urlData) {
        setImageUrl(urlData.signedUrl);
      }

      return data as Radiograph;
    } catch (err) {
      console.error('Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [id, user, navigate, parseResultToFindings]);

  // Start analysis if pending
  const startAnalysis = useCallback(async (radiographData: Radiograph) => {
    if (radiographData.analysis_status !== 'pending') return;
    
    setIsAnalyzing(true);
    setStatusMessage(language === 'tr' ? 'Analiz başlatılıyor...' : 'Starting analysis...');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-radiograph', {
        body: {
          radiograph_id: radiographData.id,
          action: 'submit'
        }
      });

      if (error) {
        console.error('Failed to start analysis:', error);
        toast.error(language === 'tr' ? 'Analiz başlatılamadı' : 'Failed to start analysis');
        setIsAnalyzing(false);
        return;
      }

      // Validate job_id before polling
      if (!data?.job_id) {
        console.error('No job_id received:', data);
        toast.error(language === 'tr' 
          ? 'Analiz servisi yanıt vermedi. Lütfen tekrar deneyin.' 
          : 'Analysis service did not respond. Please try again.');
        setIsAnalyzing(false);
        return;
      }

      console.log('Analysis started, job_id:', data.job_id);
      setStatusMessage(language === 'tr' ? 'Analiz ediliyor...' : 'Analyzing...');
      
      // Wait 3 seconds before starting poll (give Gateway time to register the job)
      setTimeout(() => {
        pollForResult(data.job_id);
      }, 3000);
    } catch (err) {
      console.error('Error starting analysis:', err);
      toast.error(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred');
      setIsAnalyzing(false);
    }
  }, [language]);

  // Poll for analysis result
  const pollForResult = useCallback(async (jobId: string) => {
    const maxAttempts = 60; // 5 minutes with 5 second intervals
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStatusMessage(language === 'tr' ? 'Analiz zaman aşımına uğradı' : 'Analysis timed out');
        setIsAnalyzing(false);
        toast.error(language === 'tr' ? 'Analiz zaman aşımına uğradı' : 'Analysis timed out');
        return;
      }

      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}`);

      try {
        const { data, error } = await supabase.functions.invoke('analyze-radiograph', {
          body: {
            radiograph_id: id,
            action: 'poll',
            job_id: jobId
          }
        });

        if (error) {
          console.error('Poll error:', error);
          setTimeout(poll, 5000);
          return;
        }

        console.log('Poll result:', data.status);

        if (data.status === 'completed') {
          setStatusMessage(language === 'tr' ? 'Analiz tamamlandı!' : 'Analysis complete!');
          setIsAnalyzing(false);
          toast.success(language === 'tr' ? 'Analiz tamamlandı!' : 'Analysis complete!');
          
          // Refresh radiograph data to get the result
          const updatedData = await fetchRadiograph();
          if (updatedData?.analysis_result) {
            setFindings(parseResultToFindings(updatedData.analysis_result));
          }
          return;
        }

        if (data.status === 'error') {
          setStatusMessage(language === 'tr' ? 'Analiz başarısız' : 'Analysis failed');
          setIsAnalyzing(false);
          toast.error(language === 'tr' ? 'Analiz başarısız oldu' : 'Analysis failed');
          return;
        }

        // Continue polling
        setStatusMessage(
          language === 'tr' 
            ? `Analiz ediliyor... (${Math.floor(attempts * 5 / 60)}:${String(attempts * 5 % 60).padStart(2, '0')})` 
            : `Analyzing... (${Math.floor(attempts * 5 / 60)}:${String(attempts * 5 % 60).padStart(2, '0')})`
        );
        setTimeout(poll, 5000);
      } catch (err) {
        console.error('Poll error:', err);
        setTimeout(poll, 5000);
      }
    };

    poll();
  }, [id, language, fetchRadiograph, parseResultToFindings]);

  useEffect(() => {
    if (id && user && isDentist) {
      fetchRadiograph().then((data) => {
        if (data && data.analysis_status === 'pending') {
          startAnalysis(data);
        } else if (data && data.analysis_status === 'processing') {
          if (data.job_id) {
            setIsAnalyzing(true);
            setStatusMessage(language === 'tr' ? 'Analiz devam ediyor...' : 'Analysis in progress...');
            pollForResult(data.job_id);
          } else {
            // job_id is missing, previous analysis failed
            toast.warning(language === 'tr' 
              ? 'Önceki analiz başarısız oldu. Yeniden analiz başlatın.' 
              : 'Previous analysis failed. Please restart analysis.');
          }
        }
      });
    }
  }, [id, user, isDentist]);

  const handleReanalyze = async () => {
    if (!radiograph) return;
    
    // Reset status to pending and trigger new analysis
    const { error } = await supabase
      .from('radiographs')
      .update({
        analysis_status: 'pending',
        job_id: null,
        analysis_result: null
      })
      .eq('id', radiograph.id);

    if (error) {
      console.error('Failed to reset analysis:', error);
      toast.error(language === 'tr' ? 'Yeniden analiz başlatılamadı' : 'Failed to restart analysis');
      return;
    }

    setFindings([]);
    const updatedRadiograph = { ...radiograph, analysis_status: 'pending', job_id: null, analysis_result: null };
    setRadiograph(updatedRadiograph);
    startAnalysis(updatedRadiograph);
  };

  const handleResetControls = () => {
    setBrightness(100);
    setContrast(100);
  };

  const handlePrint = () => {
    window.print();
  };

  const getSeverityColor = (severity: string) => {
    const lowerSeverity = severity.toLowerCase();
    if (lowerSeverity === 'ciddi' || lowerSeverity === 'severe') {
      return 'text-destructive';
    }
    if (lowerSeverity === 'orta' || lowerSeverity === 'moderate') {
      return 'text-primary';
    }
    return 'text-muted-foreground';
  };

  const imageStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
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
              {t.analysis.controls.reanalyze}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t.analysis.controls.print}
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
              <div className="flex items-center justify-between flex-wrap gap-4">
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
                      {t.analysis.controls.showTeeth}
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
                      {t.analysis.controls.showDiseases}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image */}
              <div className="relative bg-muted rounded-lg overflow-hidden">
                {imageUrl ? (
                  <div className="relative">
                    <img 
                      src={imageUrl} 
                      alt="Radiograph" 
                      className="w-full h-auto"
                      style={imageStyle}
                    />
                    {/* Overlay for masks - placeholder for real polygon rendering */}
                    {(showTeethMask || showDiseaseMask) && radiograph?.analysis_result && (
                      <div className="absolute inset-0 pointer-events-none">
                        {showTeethMask && (
                          <div className="absolute inset-0 bg-primary/10" />
                        )}
                        {showDiseaseMask && radiograph.analysis_result.diseases?.map((disease, idx) => (
                          <div 
                            key={idx}
                            className="absolute w-6 h-6 bg-destructive/40 rounded-full border-2 border-destructive"
                            style={{
                              // Placeholder positioning - will be replaced with actual polygon rendering
                              top: `${20 + idx * 15}%`,
                              left: `${25 + idx * 10}%`,
                            }}
                          />
                        ))}
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

              {/* Image Controls */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {language === 'tr' ? 'Görüntü Ayarları' : 'Image Settings'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleResetControls}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t.analysis.controls.reset}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        {t.analysis.controls.brightness}
                      </Label>
                      <span className="text-sm text-muted-foreground">{brightness}%</span>
                    </div>
                    <Slider
                      value={[brightness]}
                      onValueChange={([value]) => setBrightness(value)}
                      min={50}
                      max={150}
                      step={5}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-2">
                        <Contrast className="h-4 w-4" />
                        {t.analysis.controls.contrast}
                      </Label>
                      <span className="text-sm text-muted-foreground">{contrast}%</span>
                    </div>
                    <Slider
                      value={[contrast]}
                      onValueChange={([value]) => setContrast(value)}
                      min={50}
                      max={150}
                      step={5}
                    />
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {radiograph?.original_filename}
              </p>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle>{t.analysis.report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    {statusMessage || t.analysis.processing}
                  </p>
                </div>
              ) : findings.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {radiograph?.analysis_status === 'completed' 
                      ? t.analysis.report.noFindings 
                      : (language === 'tr' ? 'Analiz bekleniyor...' : 'Waiting for analysis...')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.analysis.report.no}</TableHead>
                      <TableHead>{t.analysis.report.tooth}</TableHead>
                      <TableHead>{t.analysis.report.disease}</TableHead>
                      <TableHead>{language === 'tr' ? 'Güven' : 'Confidence'}</TableHead>
                      <TableHead>{language === 'tr' ? 'Şiddet' : 'Severity'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {findings.map((finding, index) => (
                      <TableRow key={finding.id}>
                        <TableCell>{index + 1}</TableCell>
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
