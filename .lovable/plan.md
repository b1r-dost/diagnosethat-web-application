
# Ana Sayfa Demo: Hastalık Türlerine Göre Renklendirme

API'den gelen hastalık türlerine göre farklı renkler ve Türkçe/İngilizce etiketler kullanılacak.

---

## Renk Şeması

| Hastalık Türü | API Değeri | TR Adı | EN Adı | Renk |
|---------------|-----------|--------|--------|------|
| Çürük | `caries` | Çürük | Caries | Turuncu |
| Kök İltihaplanması | `periapical_lesion`, `Periapical Lesion`, `apical lesion` | Kök İltihaplanması | Root Inflammation | Kırmızı |

---

## Değişiklikler

### 1. DemoAnalysis.tsx

**Hastalık renk fonksiyonu eklenecek:**

```typescript
const getDiseaseColor = (diseaseType: string): { fill: string; stroke: string } => {
  const type = diseaseType.toLowerCase().replace(/\s+/g, '_');
  
  if (type === 'caries') {
    return {
      fill: 'rgba(249, 115, 22, 0.55)',    // orange-500
      stroke: 'rgba(234, 88, 12, 1)',       // orange-600
    };
  }
  
  // periapical_lesion, apical_lesion ve benzeri
  if (type.includes('apical') || type.includes('lesion')) {
    return {
      fill: 'rgba(239, 68, 68, 0.55)',     // red-500
      stroke: 'rgba(220, 38, 38, 1)',       // red-600
    };
  }
  
  // Varsayılan (diğer hastalıklar) - kırmızı
  return {
    fill: 'rgba(239, 68, 68, 0.55)',
    stroke: 'rgba(220, 38, 38, 1)',
  };
};
```

**Canvas çizim kodu güncellenecek:**

```typescript
// Draw disease polygons with type-specific colors
(result.diseases || []).forEach((disease) => {
  ctx.beginPath();
  const points = disease.polygon;
  if (points.length > 0) {
    ctx.moveTo(points[0][0], points[0][1]);
    points.forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    
    const colors = getDiseaseColor(disease.disease_type);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
});
```

**İstatistik gösterimi güncellenecek:**

```typescript
// Hastalık sayılarını türe göre hesapla
const cariesCount = result.diseases.filter(d => 
  d.disease_type.toLowerCase() === 'caries'
).length;

const lesionCount = result.diseases.filter(d => 
  d.disease_type.toLowerCase().includes('apical') || 
  d.disease_type.toLowerCase().includes('lesion')
).length;
```

**Sonuç kartında türe göre gösterim:**

```tsx
<div className="flex items-center justify-center gap-6 flex-wrap">
  <div className="flex items-center gap-2 text-sm">
    <div className="w-4 h-4 rounded bg-primary/30 border border-primary" />
    <span className="font-medium">{result.teeth.length}</span>
    <span className="text-muted-foreground">{t.home.demo.teethDetected}</span>
  </div>
  
  {cariesCount > 0 && (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-4 h-4 rounded bg-orange-500/30 border border-orange-500" />
      <span className="font-medium">{cariesCount}</span>
      <span className="text-muted-foreground">
        {language === 'tr' ? 'çürük' : 'caries'}
      </span>
    </div>
  )}
  
  {lesionCount > 0 && (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-4 h-4 rounded bg-destructive/30 border border-destructive" />
      <span className="font-medium">{lesionCount}</span>
      <span className="text-muted-foreground">
        {language === 'tr' ? 'kök iltihaplanması' : 'root inflammation'}
      </span>
    </div>
  )}
</div>
```

---

## Görsel Sonuç

```text
┌─────────────────────────────────────┐
│         Hızlı Analiz                │
├─────────────────────────────────────┤
│                                     │
│    [Röntgen Görüntüsü]              │
│    - Dişler: Yeşil tonları          │
│    - Çürükler: Turuncu              │
│    - Kök İltihaplanması: Kırmızı    │
│                                     │
├─────────────────────────────────────┤
│ 🟢 32 diş   🟠 2 çürük   🔴 1 kök   │
└─────────────────────────────────────┘
```

---

## Değişecek Dosya

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/home/DemoAnalysis.tsx` | Hastalık türüne göre renklendirme, ayrı istatistikler |

---

## Teknik Notlar

- API'den gelen `disease_type` değerleri normalize ediliyor (`toLowerCase`, `replace`)
- Birden fazla varyasyon destekleniyor: `periapical_lesion`, `Periapical Lesion`, `apical lesion`
- Bilinmeyen hastalık türleri varsayılan olarak kırmızı gösteriliyor
- i18n çevirileri inline olarak ekleniyor (basitlik için)
