
# Hasta Röntgen Yükleme ve Otomatik Analiz Başlatma Planı

## Mevcut Durum Analizi

### Sorunlar:
1. **MyRadiographs.tsx**: Hasta röntgen yükledikten sonra analiz otomatik başlatılmıyor - sadece `pending` durumunda veritabanına kaydediliyor
2. **Analysis.tsx (satır 411-430)**: Analiz başlatma mantığı `isDentist` kontrolü ile kısıtlanmış:
   ```typescript
   if (id && user && isDentist) {  // ← Sadece diş hekimleri için
     fetchRadiograph().then((data) => {
       if (data && data.analysis_status === 'pending') {
         startAnalysis(data);
       }
     });
   }
   ```
3. **Dashboard'daki tıklama**: Zaten çalışıyor - `navigate(`/analysis/${radiograph.id}`)` doğru yönlendiriyor

### Diş Hekimi Akışı (Referans - UploadRadiograph.tsx):
1. Röntgen yükle → veritabanına kaydet → analiz sayfasına yönlendir
2. Analysis.tsx açıldığında `pending` durumunu görüp otomatik analiz başlat

---

## Çözüm Planı

### Adım 1: MyRadiographs.tsx - Yükleme Sonrası Analiz Sayfasına Yönlendirme

Mevcut `onDrop` fonksiyonunda yükleme sonrası analiz sayfasına yönlendirme ekle:

```typescript
// Mevcut (satır 81-103):
const { error: insertError } = await supabase
  .from('radiographs')
  .insert({...});

if (insertError) throw insertError;

toast.success(language === 'tr' ? 'Röntgen yüklendi!' : 'Radiograph uploaded!');
fetchRadiographs();  // ← Sadece listeyi yeniliyor

// Yeni:
const { data: radiograph, error: insertError } = await supabase
  .from('radiographs')
  .insert({...})
  .select()
  .single();

if (insertError) throw insertError;

toast.success(language === 'tr' ? 'Röntgen yüklendi!' : 'Radiograph uploaded!');
navigate(`/analysis/${radiograph.id}`);  // ← Analiz sayfasına yönlendir
```

### Adım 2: Analysis.tsx - Hasta İçin Analiz Başlatma

`isDentist` kontrolünü kaldır veya hasta rolünü de dahil et:

```typescript
// Mevcut (satır 411-430):
useEffect(() => {
  if (id && user && isDentist) {  // ← Sadece diş hekimi
    fetchRadiograph().then((data) => {...});
  }
}, [id, user, isDentist]);

// Yeni:
useEffect(() => {
  if (id && user) {  // ← Hem diş hekimi hem hasta
    fetchRadiograph().then((data) => {
      if (data && data.analysis_status === 'pending') {
        startAnalysis(data);
      } else if (data && data.analysis_status === 'processing') {
        if (data.job_id) {
          setIsAnalyzing(true);
          setStatusMessage(language === 'tr' ? 'Analiz devam ediyor...' : 'Analysis in progress...');
          pollForResult(data.job_id);
        }
      }
    });
  }
}, [id, user]);
```

### Adım 3: Dashboard.tsx - Röntgen Tıklama (Zaten Çalışıyor)

Mevcut kod zaten doğru şekilde çalışıyor:
```typescript
// Satır 408-409
onClick={() => navigate(`/analysis/${radiograph.id}`)}
```

---

## Teknik Değişiklikler Özeti

| Dosya | Değişiklik | Açıklama |
|-------|------------|----------|
| `src/pages/MyRadiographs.tsx` | `onDrop` fonksiyonu | Yükleme sonrası analiz sayfasına yönlendirme |
| `src/pages/Analysis.tsx` | `useEffect` (satır 411-430) | `isDentist` kısıtlamasını kaldırarak hasta için de analiz başlatma |

---

## Beklenen Davranış

### Hasta Akışı (Düzeltme Sonrası):
1. **MyRadiographs sayfasından röntgen yükle** →
2. **Otomatik olarak `/analysis/{id}` sayfasına yönlendir** →
3. **Analysis sayfası `pending` durumunu görüp otomatik analizi başlat** →
4. **Sonuç hazır olduğunda polygon maskeler ve rapor görüntülensin**

### Dashboard'dan Tıklama:
1. **Röntgen kartına tıkla** →
2. **`/analysis/{id}` sayfasına yönlendir** →
3. **Duruma göre analiz başlat veya sonucu göster**

Bu düzeltme ile hasta deneyimi diş hekimi deneyimiyle aynı hale gelecek.
