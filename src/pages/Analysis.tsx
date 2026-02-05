import { useState, useEffect, useCallback, useRef } from 'react';
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
  Printer,
  Plus,
  Trash2,
  RotateCw,
  ZoomIn
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
  radiograph_type?: string;
  inference_version?: string;
  teeth?: Array<{
    id?: number;
    tooth_id?: number;
    polygon: number[][];
    tooth_number?: number;
    confidence?: number;
  }>;
  diseases?: Array<{
    id?: number;
    polygon: number[][];
    disease_type?: string;
    type?: string;
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
  const { user, isDentist, isPatient } = useAuth();
  const navigate = useNavigate();
  const [radiograph, setRadiograph] = useState<Radiograph | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTeethMask, setShowTeethMask] = useState(true);
  const [showDiseaseMask, setShowDiseaseMask] = useState(true);
  const [showToothNumbers, setShowToothNumbers] = useState(true);
  const [showDiseaseNames, setShowDiseaseNames] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [editableFindings, setEditableFindings] = useState<Finding[]>([]);
  const [originalFindings, setOriginalFindings] = useState<Finding[]>([]);
  
  // Image adjustment controls
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  
  // Canvas refs for polygon rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Generate consistent color for teeth based on ID
  const getToothColor = (id: number): string => {
    const colors = [
      'rgba(34, 197, 94, 0.3)',   // green-500
      'rgba(22, 163, 74, 0.3)',   // green-600
      'rgba(21, 128, 61, 0.3)',   // green-700
      'rgba(74, 222, 128, 0.3)',  // green-400
      'rgba(16, 185, 129, 0.3)',  // emerald-500
      'rgba(5, 150, 105, 0.3)',   // emerald-600
    ];
    return colors[id % colors.length];
  };

  // Draw overlays on canvas
  const drawOverlays = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = imageRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    // Draw original image with filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';
    
    // Get analysis result - use type assertion since DB stores as Json
    const result = radiograph?.analysis_result as AnalysisResult | null;
    if (!result) return;
    
    // Draw teeth polygons
    if (showTeethMask && result.teeth) {
      result.teeth.forEach((tooth) => {
        const points = tooth.polygon;
        if (points && points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(points[0][0], points[0][1]);
          points.forEach(point => ctx.lineTo(point[0], point[1]));
          ctx.closePath();
          ctx.fillStyle = getToothColor(tooth.tooth_id ?? tooth.id ?? 0);
          ctx.fill();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw tooth number
          if (showToothNumbers) {
            const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
            const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;
            const toothNum = String(tooth.tooth_id ?? tooth.tooth_number ?? tooth.id ?? '?');
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(toothNum, centerX - 8, centerY + 6);
            ctx.fillText(toothNum, centerX - 8, centerY + 6);
          }
        }
      });
    }
    
    // Draw disease polygons
    if (showDiseaseMask && result.diseases) {
      result.diseases.forEach((disease) => {
        const points = disease.polygon;
        if (points && points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(points[0][0], points[0][1]);
          points.forEach(point => ctx.lineTo(point[0], point[1]));
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(220, 38, 38, 1)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw disease name
          if (showDiseaseNames) {
            const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
            const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;
            const label = disease.disease_type ?? disease.type ?? 'Unknown';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'rgba(220, 38, 38, 1)';
            ctx.lineWidth = 3;
            ctx.strokeText(label, centerX - 30, centerY);
            ctx.fillText(label, centerX - 30, centerY);
          }
        }
      });
    }
  }, [radiograph, showTeethMask, showDiseaseMask, showToothNumbers, showDiseaseNames, brightness, contrast]);

  // Redraw canvas when controls change
  useEffect(() => {
    if (imageLoaded) {
      drawOverlays();
    }
  }, [imageLoaded, drawOverlays]);

  // Parse analysis result to findings
  const parseResultToFindings = useCallback((result: AnalysisResult | null): Finding[] => {
    if (!result || !result.diseases) return [];
    
    return result.diseases.map((disease, index) => ({
      id: disease.id ?? index + 1,
      tooth_number: disease.tooth_id?.toString() || '-',
      condition: getDiseaseLabel(disease.disease_type ?? disease.type),
      confidence: disease.confidence || 0.85,
      severity: getSeverityFromType(disease.disease_type ?? disease.type ?? ''),
    }));
  }, []);

  const getDiseaseLabel = (type: string | undefined): string => {
    if (!type) return language === 'tr' ? 'Bilinmiyor' : 'Unknown';
    const labels: Record<string, string> = {
      caries: language === 'tr' ? 'Çürük' : 'Caries',
      periodontitis: 'Periodontitis',
      periapical_lesion: language === 'tr' ? 'Periapikal Lezyon' : 'Periapical Lesion',
      'Periapical Lesion': language === 'tr' ? 'Periapikal Lezyon' : 'Periapical Lesion',
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
        const parsedFindings = parseResultToFindings(data.analysis_result as AnalysisResult);
        setFindings(parsedFindings);
        setEditableFindings([...parsedFindings]);
        setOriginalFindings([...parsedFindings]);
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
      // Get current session for auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        toast.error(language === 'tr' ? 'Oturum süresi doldu' : 'Session expired');
        setIsAnalyzing(false);
        return;
      }
      
      const response = await fetch('/api/user-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ radiograph_id: radiographData.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to start analysis:', errorData);
        toast.error(language === 'tr' ? 'Analiz başlatılamadı' : 'Failed to start analysis');
        setIsAnalyzing(false);
        return;
      }

      const data = await response.json();

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
        // Get current session for auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        
        if (!accessToken) {
          setStatusMessage(language === 'tr' ? 'Oturum süresi doldu' : 'Session expired');
          setIsAnalyzing(false);
          return;
        }
        
        const response = await fetch('/api/user-poll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ job_id: jobId }),
        });

        if (!response.ok) {
          console.error('Poll error:', response.status);
          setTimeout(poll, 5000);
          return;
        }

        const data = await response.json();

        console.log('Poll result:', data.status);

        if (data.status === 'completed') {
          setStatusMessage(language === 'tr' ? 'Analiz tamamlandı!' : 'Analysis complete!');
          setIsAnalyzing(false);
          toast.success(language === 'tr' ? 'Analiz tamamlandı!' : 'Analysis complete!');
          
          // Refresh radiograph data to get the result
          const updatedData = await fetchRadiograph();
          if (updatedData?.analysis_result) {
            const parsedFindings = parseResultToFindings(updatedData.analysis_result);
            setFindings(parsedFindings);
            setEditableFindings([...parsedFindings]);
            setOriginalFindings([...parsedFindings]);
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
    if (id && user) {
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
    setZoom(100);
  };

  const handlePrint = () => {
    window.print();
  };

  // Editable report functions
  const handleAddRow = () => {
    const newFinding: Finding = {
      id: Date.now(),
      tooth_number: '-',
      condition: '',
      confidence: 0,
      severity: language === 'tr' ? 'Bilinmiyor' : 'Unknown',
    };
    setEditableFindings([...editableFindings, newFinding]);
  };

  const handleRemoveRow = (id: number) => {
    setEditableFindings(editableFindings.filter(f => f.id !== id));
  };

  const handleResetReport = () => {
    setEditableFindings([...originalFindings]);
  };

  const handleUpdateFinding = (id: number, field: keyof Finding, value: string | number) => {
    setEditableFindings(editableFindings.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoom(prev => Math.min(200, Math.max(50, prev + delta)));
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

  // imageStyle is now handled via canvas drawing

  // Allow both dentists and patients to access analysis page
  // Patients can view their own radiographs (RLS handles authorization)
  if (!isDentist && !isPatient) {
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

        <div className="flex flex-col gap-6">
          {/* Image Viewer */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle>{language === 'tr' ? 'Röntgen Görüntüsü' : 'Radiograph Image'}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ZoomIn className="h-4 w-4" />
                    <span>{zoom}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Teeth Controls */}
                  <div className="space-y-2">
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
                    <div className="flex items-center gap-2 ml-6">
                      <Switch 
                        id="tooth-numbers" 
                        checked={showToothNumbers}
                        onCheckedChange={setShowToothNumbers}
                        disabled={!showTeethMask}
                      />
                      <Label htmlFor="tooth-numbers" className={`text-sm ${!showTeethMask ? 'text-muted-foreground' : ''}`}>
                        {t.analysis.controls.showToothNumbers}
                      </Label>
                    </div>
                  </div>
                  {/* Disease Controls */}
                  <div className="space-y-2">
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
                    <div className="flex items-center gap-2 ml-6">
                      <Switch 
                        id="disease-names" 
                        checked={showDiseaseNames}
                        onCheckedChange={setShowDiseaseNames}
                        disabled={!showDiseaseMask}
                      />
                      <Label htmlFor="disease-names" className={`text-sm ${!showDiseaseMask ? 'text-muted-foreground' : ''}`}>
                        {t.analysis.controls.showDiseaseNames}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image with wheel zoom - using canvas for polygon rendering */}
              <div 
                className="relative bg-muted rounded-lg overflow-hidden cursor-zoom-in"
                onWheel={handleWheel}
                style={{ 
                  transform: `scale(${zoom / 100})`, 
                  transformOrigin: 'center center' 
                }}
              >
                {imageUrl ? (
                  <div className="relative">
                    {/* Hidden image - source for canvas */}
                    <img 
                      ref={(el) => {
                        if (el) {
                          imageRef.current = el;
                        }
                      }}
                      src={imageUrl} 
                      alt="Radiograph" 
                      className="hidden"
                      crossOrigin="anonymous"
                      onLoad={() => {
                        setImageLoaded(true);
                        drawOverlays();
                      }}
                    />
                    {/* Visible canvas with polygon overlays */}
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto"
                    />
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-2">
                        <ZoomIn className="h-4 w-4" />
                        Zoom
                      </Label>
                      <span className="text-sm text-muted-foreground">{zoom}%</span>
                    </div>
                    <Slider
                      value={[zoom]}
                      onValueChange={([value]) => setZoom(value)}
                      min={50}
                      max={200}
                      step={10}
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
              ) : editableFindings.length === 0 && findings.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {radiograph?.analysis_status === 'completed' 
                      ? t.analysis.report.noFindings 
                      : (language === 'tr' ? 'Analiz bekleniyor...' : 'Waiting for analysis...')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">{t.analysis.report.no}</TableHead>
                        <TableHead className="w-24">{t.analysis.report.tooth}</TableHead>
                        <TableHead>{t.analysis.report.disease}</TableHead>
                        <TableHead className="w-24">{language === 'tr' ? 'Güven' : 'Confidence'}</TableHead>
                        <TableHead className="w-24">{language === 'tr' ? 'Şiddet' : 'Severity'}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editableFindings.map((finding, index) => (
                        <TableRow key={finding.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Input
                              value={finding.tooth_number}
                              onChange={(e) => handleUpdateFinding(finding.id, 'tooth_number', e.target.value)}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={finding.condition}
                              onChange={(e) => handleUpdateFinding(finding.id, 'condition', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>{(finding.confidence * 100).toFixed(0)}%</TableCell>
                          <TableCell className={getSeverityColor(finding.severity)}>
                            <Input
                              value={finding.severity}
                              onChange={(e) => handleUpdateFinding(finding.id, 'severity', e.target.value)}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveRow(finding.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Report Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleAddRow}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t.analysis.report.addRow}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleResetReport}>
                      <RotateCw className="h-4 w-4 mr-1" />
                      {t.analysis.report.resetReport}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
