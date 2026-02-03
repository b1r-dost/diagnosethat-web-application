

# Gateway API Entegrasyonu Düzeltme Planı

## Sorun Özeti

Röntgen analizi başlatılıyor (`submit`) ancak Gateway API'den dönen `job_id` düzgün alınamıyor. Sonuç olarak:
1. `radiographs` tablosunda `job_id: null` kalıyor
2. Frontend `undefined` job_id ile polling başlatıyor
3. Edge function `job_id is required for polling` hatası veriyor

## Analiz

Yüklediğiniz API örneklerine göre Gateway API formatı:

```text
POST /v1/submit-analysis
  -> Yanıt: { job_id: "a8999011-1c98-45ef-a8d4-29b769ac78de" }

GET /v1/get-result?job_id=<job_id>
  -> Yanıt: { status: "...", result: {...} }
```

Mevcut koddaki sorunlar:

1. **Loglama Eksik**: Gateway API yanıtı loglanmıyor, bu yüzden gerçek yanıt formatını göremiyoruz
2. **job_id Kontrolü Yok**: Submit sonrası `job_id` undefined olsa bile polling başlıyor
3. **Sayfa Yenileme Sorunu**: Status `processing` ise ama `job_id` null ise, sayfa yenilendiğinde polling başlamıyor ve sonsuz döngüye giriyor

## Çözüm

### 1. Edge Function Değişiklikleri
**Dosya**: `supabase/functions/analyze-radiograph/index.ts`

Gateway API yanıtını detaylı logla ve birden fazla olası alan adını kontrol et:

```typescript
// Satır 155 civarı - Gateway yanıtını logla
const submitResult = await submitResponse.json();
console.log('Gateway API raw response:', JSON.stringify(submitResult));

// Birden fazla olası alan adını kontrol et
const jobId = submitResult.job_id || submitResult.jobId || submitResult.id || submitResult.task_id;
console.log('Extracted job_id:', jobId);

if (!jobId) {
  console.error('No job_id in Gateway response');
  return new Response(
    JSON.stringify({ 
      error: 'No job_id received from analysis service', 
      gateway_response: submitResult 
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Radiograph güncelle
const { error: updateError } = await supabase
  .from('radiographs')
  .update({
    job_id: jobId,  // Artık doğru job_id kullanılıyor
    analysis_status: 'processing',
    updated_at: new Date().toISOString()
  })
  .eq('id', radiograph_id);

return new Response(
  JSON.stringify({ job_id: jobId, status: 'processing' }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### 2. Frontend Değişiklikleri
**Dosya**: `src/pages/Analysis.tsx`

Submit sonrası job_id kontrolü ekle ve 3 saniye gecikme ile polling başlat:

```typescript
// startAnalysis fonksiyonu - satır 180 civarı
if (error) {
  console.error('Failed to start analysis:', error);
  toast.error(language === 'tr' ? 'Analiz başlatılamadı' : 'Failed to start analysis');
  setIsAnalyzing(false);
  return;
}

// job_id kontrolü ekle
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

// 3 saniye bekleyip polling başlat (Gateway'in işlemi kaydetmesi için)
setTimeout(() => {
  pollForResult(data.job_id);
}, 3000);
```

### 3. Sayfa Yenilendiğinde Sonsuz Döngü Düzeltmesi
**Dosya**: `src/pages/Analysis.tsx`

Status `processing` ama `job_id` null ise, kullanıcıya uyarı göster:

```typescript
// useEffect içinde - satır 268 civarı
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
          // job_id yok, önceki analiz başarısız olmuş
          toast.warning(language === 'tr' 
            ? 'Önceki analiz başarısız oldu. Yeniden analiz başlatın.' 
            : 'Previous analysis failed. Please restart analysis.');
        }
      }
    });
  }
}, [id, user, isDentist]);
```

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `supabase/functions/analyze-radiograph/index.ts` | Gateway yanıtını logla, birden fazla job_id alan adını kontrol et, hata durumunda detaylı yanıt dön |
| `src/pages/Analysis.tsx` | job_id kontrolü ekle, 3 saniye gecikme ile polling başlat, job_id yoksa uyarı göster |

## Test Adımları

1. Edge function deploy edilir
2. Yeni bir röntgen yüklenir
3. Analiz sayfasına gidilir
4. Edge function loglarında Gateway API yanıtı görülmeli
5. job_id alınıp polling başlamalı
6. Analiz tamamlandığında sonuçlar görünmeli

