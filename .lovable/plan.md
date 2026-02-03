
# Demo Analiz Sistemi - API Key Entegrasyonu ve Devam Eden Geliştirmeler

## Mevcut Durum Analizi

Proje aşağıdaki temel işlevleri içeriyor:
- **Home Page**: Demo analiz bileşeni (`DemoAnalysis.tsx`) mevcut
- **Edge Function**: `demo-analysis` function'ı Gateway API'ye proxy yapıyor
- **Problem**: API key henüz eklenmemiş, Gateway istekleri muhtemelen 401/403 hatası döndürüyor

## Plan

### Adım 1: API Key Dosyası Oluşturma (Geçici)
Geçici olarak API key'i tutacak bir dosya oluşturulacak:
```
src/config/api-keys.ts
```

Bu dosya `.gitignore`'a eklenmeli (güvenlik için).

**Dosya içeriği:**
```typescript
// TEMPORARY - Delete before production
// This key will be moved to Cloudflare Pages environment variables
export const GATEWAY_API_KEY = 'dt_1714698d286ef9096ab04fa1396367466493881dff73df4ae4b91f613bb91423';
```

### Adım 2: Edge Function Güncelleme
`supabase/functions/demo-analysis/index.ts` dosyası API key kullanacak şekilde güncellenecek:

**Değişiklikler:**
1. API key'i hardcode olarak ekle (geçici çözüm)
2. `Authorization: Bearer <api_key>` header'ını Gateway isteklerine ekle
3. Daha iyi hata mesajları ve loglama ekle

```typescript
// Gateway API configuration
const GATEWAY_API_URL = 'https://api.diagnosethat.net';
const GATEWAY_API_KEY = 'dt_1714698d286ef9096ab04fa1396367466493881dff73df4ae4b91f613bb91423';

// Submit endpoint
const submitResponse = await fetch(`${GATEWAY_API_URL}/v1/submit-analysis`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GATEWAY_API_KEY}`,  // YENİ
  },
  body: JSON.stringify({...}),
});

// Poll endpoint
const pollResponse = await fetch(`${GATEWAY_API_URL}/v1/get-result?job_id=${jobId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GATEWAY_API_KEY}`,  // YENİ
  },
});
```

### Adım 3: Giriş Yapmış Kullanıcılar İçin Analiz Edge Function
Yeni bir edge function oluşturulacak: `analyze-radiograph`

**Amaç:** Giriş yapmış kullanıcıların yüklediği röntgenleri analiz etmek

**Akış:**
```text
┌─────────────────────┐
│ UploadRadiograph.tsx│
│ - Dosyayı yükle     │
│ - DB kaydı oluştur  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Analysis.tsx        │
│ - Edge func çağır   │
│ - Polling başlat    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ analyze-radiograph  │
│ Edge Function       │
│ - Storage'dan oku   │
│ - Gateway'e gönder  │
│ - DB'yi güncelle    │
└─────────────────────┘
```

**Dosya:** `supabase/functions/analyze-radiograph/index.ts`

**Özellikler:**
- JWT doğrulaması (sadece giriş yapmış kullanıcılar)
- Storage'dan base64 dönüşümü
- `profiles` tablosundan `doctor_ref` alma
- `patients` tablosundan `patient_ref` alma
- `radiographs` tablosunu `job_id` ile güncelleme
- Polling sonucu geldiğinde `analysis_result` ve `analysis_status` güncelleme

### Adım 4: Analysis.tsx Güncelleme
Gerçek API entegrasyonu için Analysis sayfasını güncelle:

**Değişiklikler:**
1. Sayfa yüklendiğinde analiz durumunu kontrol et
2. Eğer `pending` ise edge function'ı çağırarak analizi başlat
3. Polling mekanizması ile sonucu bekle
4. Sonuç geldiğinde gerçek verileri göster (mock data yerine)
5. Canvas üzerinde gerçek diş ve hastalık polygon'larını çiz

### Adım 5: .gitignore Güncelleme
API key dosyasını git'e eklememek için:

```
# Temporary API keys
src/config/api-keys.ts
```

---

## Teknik Detaylar

### Gateway API Endpoint'leri
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/v1/submit-analysis` | POST | Görüntü gönder, `job_id` al |
| `/v1/get-result?job_id=X` | GET | Analiz sonucunu sorgula |

### Gateway API Request Body (submit-analysis)
```json
{
  "image_base64": "base64_encoded_image",
  "doctor_ref": "DR-XXXXXX",
  "clinic_ref": "DiagnoseThat veya TanıYorum",
  "patient_ref": "PT-XXXXXX",
  "radiograph_type": "panoramic | bitewing | periapical"
}
```

### Gateway API Response (get-result)
```json
{
  "status": "pending | processing | completed | error",
  "result": {
    "teeth": [
      { "id": 1, "polygon": [[0.1, 0.2], ...], "tooth_number": 16 }
    ],
    "diseases": [
      { "id": 1, "polygon": [[0.1, 0.2], ...], "disease_type": "caries", "tooth_id": 1 }
    ]
  },
  "error": "error message if status is error"
}
```

### Database Güncellemeleri
`radiographs` tablosunda mevcut alanlar kullanılacak:
- `job_id`: Gateway'den dönen job ID
- `analysis_status`: `pending | processing | completed | failed`
- `analysis_result`: JSON formatında analiz sonucu

---

## Dosya Değişiklikleri Özeti

| Dosya | İşlem |
|-------|-------|
| `src/config/api-keys.ts` | Oluştur (geçici) |
| `.gitignore` | Güncelle |
| `supabase/functions/demo-analysis/index.ts` | Güncelle (API key ekle) |
| `supabase/functions/analyze-radiograph/index.ts` | Oluştur |
| `supabase/config.toml` | Güncelle (yeni function ekle) |
| `src/pages/Analysis.tsx` | Güncelle (gerçek API entegrasyonu) |
| `src/pages/UploadRadiograph.tsx` | Güncelle (analizi tetikle) |

---

## Güvenlik Notları

1. **Geçici Çözüm**: API key şu an hardcode olarak edge function'a eklenecek
2. **Production için**: Cloudflare Pages'e deploy ederken API key'i environment variable olarak ekleyeceksiniz
3. **Supabase Alternative**: İsterseniz Supabase secrets'a da ekleyebiliriz (`GATEWAY_API_KEY` olarak)

---

## Test Adımları

Uygulama onaylandıktan sonra:
1. Ana sayfada demo analiz sistemini test et
2. Giriş yap ve bir hasta oluştur
3. Röntgen yükle ve analiz akışını test et
4. Sonuçların doğru görüntülendiğini kontrol et
