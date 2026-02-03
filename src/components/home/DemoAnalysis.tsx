import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Upload, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface AnalysisResult {
  radiograph_type: string;
  teeth: Array<{
    tooth_id: number;
    confidence: number;
    polygon: number[][];
  }>;
  diseases: Array<{
    type: string;
    confidence: number;
    tooth_id: number | null;
    polygon: number[][];
  }>;
}

export function DemoAnalysis() {
  const { t, clinicRef } = useI18n();
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setError(null);
      setAnalysisResult(null);
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: false,
  });

  const analyzeImage = async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Create FormData for the API call
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('doctor_ref', 'MainPageDemo');
      formData.append('clinic_ref', clinicRef);

      // TODO: Replace with actual API endpoint when ready
      // For now, simulate the analysis with mock data
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock analysis result
      const mockResult: AnalysisResult = {
        radiograph_type: 'panoramic',
        teeth: [
          { tooth_id: 11, confidence: 0.95, polygon: [[100, 150], [150, 150], [150, 200], [100, 200]] },
          { tooth_id: 12, confidence: 0.92, polygon: [[160, 150], [210, 150], [210, 200], [160, 200]] },
          { tooth_id: 21, confidence: 0.94, polygon: [[220, 150], [270, 150], [270, 200], [220, 200]] },
          { tooth_id: 22, confidence: 0.91, polygon: [[280, 150], [330, 150], [330, 200], [280, 200]] },
          { tooth_id: 36, confidence: 0.93, polygon: [[120, 280], [170, 280], [170, 330], [120, 330]] },
          { tooth_id: 46, confidence: 0.90, polygon: [[250, 280], [300, 280], [300, 330], [250, 330]] },
        ],
        diseases: [
          { type: 'caries', confidence: 0.88, tooth_id: 36, polygon: [[130, 290], [160, 290], [160, 320], [130, 320]] },
          { type: 'periapical_lesion', confidence: 0.75, tooth_id: 46, polygon: [[260, 300], [290, 300], [290, 325], [260, 325]] },
        ],
      };

      setAnalysisResult(mockResult);
    } catch (err) {
      setError(t.home.demo.uploadError);
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Draw analysis overlay
  useEffect(() => {
    if (!analysisResult || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw teeth masks (green)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; // green-500 with 20% opacity
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 2;

    analysisResult.teeth.forEach(tooth => {
      if (tooth.polygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(tooth.polygon[0][0], tooth.polygon[0][1]);
        tooth.polygon.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    // Draw disease masks (red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // red-500 with 30% opacity
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 2;

    analysisResult.diseases.forEach(disease => {
      if (disease.polygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(disease.polygon[0][0], disease.polygon[0][1]);
        disease.polygon.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });
  }, [analysisResult]);

  const resetDemo = () => {
    setImage(null);
    setImageFile(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t.home.demo.title}
          {image && (
            <Button variant="ghost" size="icon" onClick={resetDemo}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!image ? (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t.home.demo.dropzone}</p>
            <p className="text-sm text-muted-foreground mt-2">{t.home.demo.supportedFormats}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                ref={imageRef}
                src={image}
                alt="Uploaded radiograph"
                className="w-full rounded-lg"
                onLoad={() => {
                  if (analysisResult && canvasRef.current && imageRef.current) {
                    // Trigger redraw when image loads
                    const event = new Event('load');
                    imageRef.current.dispatchEvent(event);
                  }
                }}
              />
              {analysisResult && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: 'contain' }}
                />
              )}
            </div>

            {!analysisResult && !isAnalyzing && (
              <Button onClick={analyzeImage} className="w-full">
                {t.home.hero.tryDemo}
              </Button>
            )}

            {isAnalyzing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t.home.demo.analyzing}</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {analysisResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary/20 border border-primary" />
                    <span>{analysisResult.teeth.length} {t.home.demo.teethDetected}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-destructive/30 border border-destructive" />
                    <span>{analysisResult.diseases.length} {t.home.demo.diseasesDetected}</span>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{t.home.demo.signupPrompt}</AlertDescription>
                </Alert>

                <p className="text-xs text-muted-foreground text-center">
                  {t.home.demo.disclaimer}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
