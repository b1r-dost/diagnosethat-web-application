
# Demo Analiz: Hastalık Renkleri Sorunu

## Tespit Edilen Sorun

API'den gelen hastalık verilerinde alan adı `type` olarak geliyor, ancak frontend kodu `disease_type` arıyor. Bu yuzden:
- Canvas ciziminde `getDiseaseColor(disease.disease_type)` her zaman `undefined` aliyor ve varsayilan kirmizi renk donuyor
- Hastalık sayaci (caries/lesion) her zaman 0 gosteriyor cunku `d.disease_type?.toLowerCase()` undefined donuyor

### Kanitlar

**GPU Inference kodu** (`disease_detector.py` satir 82-83 ve `iou_mapper.py` satir 88):
```python
diseases.append({
    'type': disease_type,      # <-- 'type' kullaniliyor
    'confidence': ...,
    'polygon': ...,
})
```

**Frontend kodu** (`DemoAnalysis.tsx`):
```typescript
// disease_type ariyor ama API'de 'type' var
const colors = getDiseaseColor(disease.disease_type);  // undefined!
```

## Cozum

`DemoAnalysis.tsx` dosyasinda hastalık verilerine erisirken hem `disease_type` hem de `type` alanlarini destekle. Bu sekilde mevcut ve gelecekteki API versiyonlariyla uyumlu olur.

### Degisiklikler

**1. AnalysisResult arayuzunu guncelle** - `type` alanini ekle:
```typescript
diseases: Array<{
  disease_id?: number;
  polygon: number[][];
  disease_type?: string;
  type?: string;         // API 'type' olarak gonderiyor
  tooth_id?: number;
}>;
```

**2. Canvas ciziminde her iki alani kontrol et:**
```typescript
const diseaseType = disease.disease_type || disease.type;
const colors = getDiseaseColor(diseaseType);
```

**3. Hastalık sayacilarinda her iki alani kontrol et:**
```typescript
const cariesCount = (result.diseases || []).filter(d => {
  const dt = (d.disease_type || d.type)?.toLowerCase();
  return dt === 'caries';
}).length;

const lesionCount = (result.diseases || []).filter(d => {
  const dt = (d.disease_type || d.type)?.toLowerCase() || '';
  return dt.includes('apical') || dt.includes('lesion');
}).length;
```

## Degisecek Dosya

| Dosya | Degisiklik |
|-------|-----------|
| `src/components/home/DemoAnalysis.tsx` | `type` alanini destekle (3 nokta) |

## Beklenen Sonuc

- Caries (curuk) hastaliklari **turuncu** renkte gosterilecek
- Apical/periapical lezyonlar **kirmizi** renkte gosterilecek
- Hastalık sayacilari dogru sayilari gosterecek
- Lejant (legend) bolumunde curuk ve lezyon sayilari gorunecek
