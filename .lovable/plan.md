
# Analiz Sayfası Katman Oluşturma Hatası Düzeltme Planı

## Tespit Edilen Sorun

### Kök Neden
Analysis.tsx sayfasında API'den gelen polygon verileri doğru şekilde işlenmiyor. Mevcut kod sadece placeholder div'ler gösteriyor, gerçek polygon çizimi yapılmıyor.

### Karşılaştırma: DemoAnalysis vs Analysis

| Özellik | DemoAnalysis.tsx | Analysis.tsx |
|---------|------------------|--------------|
| Görüntü Gösterimi | Canvas | img elementi |
| Polygon Çizimi | Canvas API ile gerçek polygon | Placeholder div'ler |
| Diş Maskeleri | Gerçek polygon fill/stroke | Sabit bg-primary/10 overlay |
| Hastalık Maskeleri | Gerçek polygon fill/stroke | Sabit konumlu yuvarlak div'ler |

**DemoAnalysis.tsx (Doğru çalışan kod - satır 190-230):**
```javascript
// Canvas üzerine gerçek polygon çizimi
result.teeth.forEach((tooth) => {
  ctx.beginPath();
  const points = tooth.polygon;
  if (points.length > 0) {
    ctx.moveTo(points[0][0], points[0][1]);
    points.forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    ctx.fillStyle = getToothColor(tooth.tooth_id);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
});
```

**Analysis.tsx (Hatalı kod - satır 538-556):**
```javascript
{/* Overlay for masks - placeholder for real polygon rendering */}
{(showTeethMask || showDiseaseMask) && radiograph?.analysis_result && (
  <div className="absolute inset-0 pointer-events-none">
    {showTeethMask && (
      <div className="absolute inset-0 bg-primary/10" />  // Sadece renk overlay
    )}
    {showDiseaseMask && radiograph.analysis_result.diseases?.map((disease, idx) => (
      <div 
        key={idx}
        className="absolute w-6 h-6 bg-destructive/40 rounded-full"
        style={{ top: `${20 + idx * 15}%`, left: `${25 + idx * 10}%` }}  // Sabit placeholder
      />
    ))}
  </div>
)}
```

### API Yanıt Yapısı
API'den gelen veri yapısı doğru şekilde kaydediliyor:
```json
{
  "radiograph_type": "periapical",
  "inference_version": "1.0.1",
  "teeth": [
    { "tooth_id": 32, "confidence": 0.1469, "polygon": [[272,152], [265,159], ...] },
    { "tooth_id": 34, "confidence": 0.3643, "polygon": [[596,133], ...] }
  ],
  "diseases": [
    { "type": "Periapical Lesion", "confidence": 0.5819, "polygon": [[801,571], ...] }
  ]
}
```

---

## Çözüm Planı

### Adım 1: Canvas Ref ve State Ekle

Analysis.tsx'e DemoAnalysis.tsx'teki gibi canvas kullanımı eklenecek:

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);
const imageRef = useRef<HTMLImageElement | null>(null);
const [imageLoaded, setImageLoaded] = useState(false);
```

### Adım 2: Polygon Çizim Fonksiyonları Ekle

```typescript
// Diş renk fonksiyonu
const getToothColor = (id: number): string => {
  const colors = [
    'rgba(34, 197, 94, 0.3)',   // green-500
    'rgba(22, 163, 74, 0.3)',   // green-600
    'rgba(21, 128, 61, 0.3)',   // green-700
    'rgba(74, 222, 128, 0.3)',  // green-400
  ];
  return colors[id % colors.length];
};

// Canvas çizim fonksiyonu
const drawOverlays = useCallback(() => {
  if (!canvasRef.current || !imageRef.current || !radiograph?.analysis_result) return;
  
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const img = imageRef.current;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  // Orijinal görüntüyü çiz
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';
  
  const result = radiograph.analysis_result;
  
  // Diş polygonlarını çiz
  if (showTeethMask && result.teeth) {
    result.teeth.forEach((tooth) => {
      const points = tooth.polygon;
      if (points && points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        points.forEach(point => ctx.lineTo(point[0], point[1]));
        ctx.closePath();
        ctx.fillStyle = getToothColor(tooth.tooth_id || tooth.id);
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Diş numarası göster
        if (showToothNumbers) {
          const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
          const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.strokeText(String(tooth.tooth_id || tooth.tooth_number), centerX - 8, centerY + 6);
          ctx.fillText(String(tooth.tooth_id || tooth.tooth_number), centerX - 8, centerY + 6);
        }
      }
    });
  }
  
  // Hastalık polygonlarını çiz
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
        
        // Hastalık adı göster
        if (showDiseaseNames) {
          const centerX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
          const centerY = points.reduce((sum, p) => sum + p[1], 0) / points.length;
          const label = disease.disease_type || disease.type || 'Unknown';
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
```

### Adım 3: Canvas ile Görüntü Gösterimi

Mevcut img elementi yerine canvas kullanılacak:

```tsx
<div 
  className="relative bg-muted rounded-lg overflow-hidden cursor-zoom-in"
  onWheel={handleWheel}
  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
>
  {imageUrl ? (
    <div className="relative">
      {/* Gizli img - canvas için kaynak */}
      <img 
        ref={(el) => {
          if (el && !imageRef.current) {
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
      {/* Görünür canvas */}
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
```

### Adım 4: useEffect ile Canvas Güncelleme

```typescript
// Canvas'ı yeniden çiz - kontroller değiştiğinde
useEffect(() => {
  if (imageLoaded) {
    drawOverlays();
  }
}, [imageLoaded, drawOverlays, showTeethMask, showDiseaseMask, showToothNumbers, showDiseaseNames, brightness, contrast]);
```

### Adım 5: Interface Güncellemesi

AnalysisResult interface'ini API yanıt yapısıyla uyumlu hale getir:

```typescript
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
```

---

## Teknik Değişiklikler Özeti

| Dosya | Değişiklik Türü | Açıklama |
|-------|-----------------|----------|
| `src/pages/Analysis.tsx` | Güncelleme | Canvas tabanlı polygon çizimi, DemoAnalysis.tsx mantığının entegrasyonu |

## Beklenen Sonuç

1. API'den gelen polygon verileri canvas üzerine doğru şekilde çizilecek
2. Diş maskeleri yeşil tonlarında polygon olarak görünecek
3. Hastalık maskeleri kırmızı tonlarında polygon olarak görünecek
4. Diş numaraları ve hastalık adları polygon'ların merkezinde gösterilecek
5. Parlaklık, kontrast ve zoom ayarları canvas üzerinde çalışacak
6. Ana sayfa demo'su ile aynı görsel kalitede sonuç elde edilecek
