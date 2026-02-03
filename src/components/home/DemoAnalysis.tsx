import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnalysisResult {
  teeth: Array<{
    id: number;
    polygon: number[][];
    tooth_number?: number;
  }>;
  diseases: Array<{
    id: number;
    polygon: number[][];
    disease_type: string;
    tooth_id?: number;
  }>;
}

// Mock analysis for demo - will be replaced with real API
const mockAnalysis = (): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generate mock teeth and diseases based on random positions
      const teeth = Array.from({ length: Math.floor(Math.random() * 8) + 10 }, (_, i) => ({
        id: i + 1,
        polygon: generateMockPolygon(),
        tooth_number: Math.floor(Math.random() * 32) + 1,
      }));

      const diseases = Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => ({
        id: i + 1,
        polygon: generateMockPolygon(),
        disease_type: ['caries', 'periapical_lesion', 'calculus', 'periodontitis'][Math.floor(Math.random() * 4)],
        tooth_id: teeth[Math.floor(Math.random() * teeth.length)]?.id,
      }));

      resolve({ teeth, diseases });
    }, 2500);
  });
};

const generateMockPolygon = (): number[][] => {
  const centerX = Math.random() * 0.6 + 0.2;
  const centerY = Math.random() * 0.6 + 0.2;
  const size = Math.random() * 0.08 + 0.04;
  
  return [
    [centerX - size, centerY - size],
    [centerX + size, centerY - size],
    [centerX + size, centerY + size],
    [centerX - size, centerY + size],
  ];
};

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
  const { t, language } = useI18n();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setError(null);
      setResult(null);
      
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        analyzeImage();
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const analyzeImage = async () => {
    setIsAnalyzing(true);
    try {
      const analysisResult = await mockAnalysis();
      setResult(analysisResult);
    } catch (err) {
      setError(t.home.demo.uploadError);
    } finally {
      setIsAnalyzing(false);
    }
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

      // Draw teeth polygons with orange tones
      result.teeth.forEach((tooth) => {
        ctx.beginPath();
        const points = tooth.polygon.map(p => [p[0] * img.width, p[1] * img.height]);
        if (points.length > 0) {
          ctx.moveTo(points[0][0], points[0][1]);
          points.forEach(point => ctx.lineTo(point[0], point[1]));
          ctx.closePath();
          ctx.fillStyle = getToothColor(tooth.id);
          ctx.fill();
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw disease polygons with red
      result.diseases.forEach((disease) => {
        ctx.beginPath();
        const points = disease.polygon.map(p => [p[0] * img.width, p[1] * img.height]);
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
    setImage(null);
    setResult(null);
    setError(null);
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
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-foreground font-medium">{t.home.demo.analyzing}</span>
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
                    <span className="text-foreground font-medium">{result.diseases.length}</span>
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
