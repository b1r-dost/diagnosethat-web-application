import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisResult {
  radiograph_type?: string;
  inference_version?: string;
  teeth: Array<{
    tooth_id: number;
    confidence?: number;
    polygon: number[][];
  }>;
  diseases: Array<{
    disease_id?: number;
    polygon: number[][];
    disease_type: string;
    tooth_id?: number;
  }>;
}

// Generate a consistent color for teeth based on ID
const getToothColor = (id: number): string => {
  const colors = [
    'rgba(251, 146, 60, 0.25)',  // orange-400
    'rgba(249, 115, 22, 0.25)',  // orange-500
    'rgba(234, 88, 12, 0.25)',   // orange-600
    'rgba(251, 191, 36, 0.25)',  // amber-400
    'rgba(245, 158, 11, 0.25)',  // amber-500
    'rgba(217, 119, 6, 0.25)',   // amber-600
  ];
  return colors[id % colors.length];
};

export function DemoAnalysis() {
  const { t, language, clinicRef } = useI18n();
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setError(null);
      setResult(null);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setImage(base64);
        // Extract just the base64 part without the data URL prefix
        const base64Data = base64.split(',')[1];
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Start analysis when image is loaded
  useEffect(() => {
    if (imageBase64 && !isAnalyzing && !result) {
      analyzeImage(imageBase64);
    }
  }, [imageBase64]);

  const analyzeImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    setStatusMessage(language === 'tr' ? 'Analiz başlatılıyor...' : 'Starting analysis...');
    
    try {
      // Submit analysis to edge function with action=submit
      const submitResponse = await fetch(
        `https://bllvnenslgntvkvgwgqh.supabase.co/functions/v1/demo-analysis?action=submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: base64Data, clinic_ref: clinicRef }),
        }
      );

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || 'Failed to submit analysis');
      }

      const submitResult = await submitResponse.json();

      // Accept both flat and nested response shapes
      const jobId = submitResult.job_id ?? submitResult.data?.job_id;

      if (!jobId) {
        console.error('No job_id in response:', submitResult);
        throw new Error(submitResult.error || 'No job_id received');
      }

      setStatusMessage(language === 'tr' ? 'Analiz yapılıyor...' : 'Analyzing...');

      // Start polling for result
      pollForResult(jobId);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(t.home.demo.uploadError);
      setIsAnalyzing(false);
    }
  };

  const pollForResult = (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes max (40 * 3 seconds)

    pollingRef.current = setInterval(async () => {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current!);
        setError(language === 'tr' ? 'Analiz zaman aşımına uğradı' : 'Analysis timed out');
        setIsAnalyzing(false);
        return;
      }

      try {
        const pollResponse = await fetch(
          `https://bllvnenslgntvkvgwgqh.supabase.co/functions/v1/demo-analysis?action=poll&job_id=${jobId}`
        );

        if (!pollResponse.ok) {
          throw new Error('Polling failed');
        }

        const pollResult = await pollResponse.json();

        // Accept both flat and nested response shapes
        const status = pollResult.status ?? pollResult.data?.status;
        const result = pollResult.result ?? pollResult.data?.result;
        const pollError = pollResult.error ?? pollResult.data?.error;

        if (status === 'completed' && result) {
          clearInterval(pollingRef.current!);
          setResult(result);
          setIsAnalyzing(false);
          setStatusMessage('');
        } else if (status === 'error') {
          clearInterval(pollingRef.current!);
          setError(pollError || t.home.demo.uploadError);
          setIsAnalyzing(false);
        }
        // If pending/processing, continue polling
      } catch (err) {
        console.error('Polling error:', err);
        // Don't stop polling on transient errors
      }
    }, 3000); // Poll every 3 seconds
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 1,
  });

  // Draw overlays on canvas
  useEffect(() => {
    if (!image || !result || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Find bounding box of all polygons to determine coordinate scale
      let maxX = 0, maxY = 0;
      result.teeth.forEach((tooth) => {
        tooth.polygon.forEach(p => {
          if (p[0] > maxX) maxX = p[0];
          if (p[1] > maxY) maxY = p[1];
        });
      });
      (result.diseases || []).forEach((disease) => {
        disease.polygon.forEach(p => {
          if (p[0] > maxX) maxX = p[0];
          if (p[1] > maxY) maxY = p[1];
        });
      });

      // Calculate scale factors (API returns pixel coords relative to original image)
      const scaleX = img.width / (maxX || img.width);
      const scaleY = img.height / (maxY || img.height);

      // Draw teeth polygons with orange tones
      result.teeth.forEach((tooth) => {
        ctx.beginPath();
        const points = tooth.polygon.map(p => [p[0] * scaleX, p[1] * scaleY]);
        if (points.length > 0) {
          ctx.moveTo(points[0][0], points[0][1]);
          points.forEach(point => ctx.lineTo(point[0], point[1]));
          ctx.closePath();
          ctx.fillStyle = getToothColor(tooth.tooth_id);
          ctx.fill();
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw disease polygons with red
      (result.diseases || []).forEach((disease) => {
        ctx.beginPath();
        const points = disease.polygon.map(p => [p[0] * scaleX, p[1] * scaleY]);
        if (points.length > 0) {
          ctx.moveTo(points[0][0], points[0][1]);
          points.forEach(point => ctx.lineTo(point[0], point[1]));
          ctx.closePath();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    };
    img.src = image;
  }, [image, result]);

  const reset = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setImage(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setStatusMessage('');
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold">{t.home.demo.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!image ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              {t.home.demo.dropzone}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.home.demo.supportedFormats}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-muted">
              <canvas
                ref={canvasRef}
                className="w-full h-auto"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-foreground font-medium">{statusMessage || t.home.demo.analyzing}</span>
                  </div>
                </div>
              )}
            </div>

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded bg-primary/30 border border-primary" />
                    <span className="text-foreground font-medium">{result.teeth.length}</span>
                    <span className="text-muted-foreground">{t.home.demo.teethDetected}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded bg-destructive/30 border border-destructive" />
                    <span className="text-foreground font-medium">{(result.diseases || []).length}</span>
                    <span className="text-muted-foreground">{t.home.demo.diseasesDetected}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {t.home.demo.disclaimer}
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm text-foreground">
                    {t.home.demo.signupPrompt}
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={reset}>
                    {language === 'tr' ? 'Yeni Görüntü' : 'New Image'}
                  </Button>
                  <Button variant="hero" asChild>
                    <Link to="/auth?mode=signup">{t.nav.signup}</Link>
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
