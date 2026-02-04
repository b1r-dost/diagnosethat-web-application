# DiagnoseThat HBYS Entegrasyon Rehberi

Bu doküman, DiagnoseThat API'yi HBYS (Hastane Bilgi Yönetim Sistemi) yazılımlarına entegre etmek isteyen geliştiriciler için hazırlanmıştır.

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [API Erişimi](#api-erişimi)
3. [Kimlik Doğrulama](#kimlik-doğrulama)
4. [API Endpoints](#api-endpoints)
5. [Veri Yapıları](#veri-yapıları)
6. [Hata Kodları](#hata-kodları)
7. [Rate Limiting](#rate-limiting)
8. [Kod Örnekleri](#kod-örnekleri)
9. [SSS](#sss)

---

## Genel Bakış

DiagnoseThat API, dental radyografi görüntülerinin yapay zeka destekli analizini sağlar. API aşağıdaki işlemleri gerçekleştirir:

- **Radyografi Tipi Sınıflandırma**: Panoramik, bitewing, periapikal
- **Diş Segmentasyonu**: FDI numaralandırma sistemi ile
- **Hastalık Tespiti**: Çürük, kemik kaybı, kanal tedavisi vb.
- **IoU Eşleştirme**: Hastalıkların ilgili dişlere atanması

### Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HBYS Entegrasyon Akışı                       │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     POST /v1/submit-analysis     ┌──────────────────┐
    │   HBYS   │ ─────────────────────────────────▶│  DiagnoseThat   │
    │ Sistemi  │            (image)               │   API Gateway   │
    └──────────┘                                   └────────┬─────────┘
         │                                                  │
         │                                                  ▼
         │                                         ┌──────────────────┐
         │                                         │   Job Queue      │
         │                                         │   (Supabase)     │
         │                                         └────────┬─────────┘
         │                                                  │
         │                                                  ▼
         │                                         ┌──────────────────┐
         │                                         │  GPU Inference   │
         │                                         │    Service       │
         │                                         └────────┬─────────┘
         │                                                  │
         │      GET /v1/get-result (polling)               │
         │◀─────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │  Sonuç   │
    │ Gösterimi│
    └──────────┘
```

---

## API Erişimi

### Base URL

```
Production: https://api.diagnosethat.net
```

### API Key Edinme

1. [console.diagnosethat.net](https://console.diagnosethat.net) adresine gidin
2. Şirket hesabınızla giriş yapın
3. "API Keys" bölümünden yeni key oluşturun
4. Key'i güvenli bir şekilde saklayın (sadece bir kez gösterilir)

---

## Kimlik Doğrulama

Tüm API istekleri `X-API-Key` header'ı ile doğrulanmalıdır:

```http
X-API-Key: dt_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

### API Key Formatı

- **Prefix**: `dt_live_` (production) veya `dt_test_` (test)
- **Uzunluk**: 32 karakter (prefix dahil)

---

## API Endpoints

### 1. Health Check

Sistem durumunu kontrol eder.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:30:00Z",
  "checks": {
    "database": "ok",
    "storage": "ok"
  }
}
```

---

### 2. Submit Analysis

Yeni bir analiz işi gönderir.

```http
POST /v1/submit-analysis
Content-Type: multipart/form-data
X-API-Key: dt_live_xxx
```

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File | ✅ | Radyografi görüntüsü (JPEG, PNG, WebP) |
| `patient_ref` | String | ❌ | Hasta referans kodu |
| `doctor_ref` | String | ❌ | Hekim referans kodu |
| `clinic_ref` | String | ❌ | Klinik referans kodu |

**Kısıtlamalar:**
- Maksimum dosya boyutu: 20MB
- Desteklenen formatlar: JPEG, PNG, WebP

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "created_at": "2025-01-22T10:30:00Z"
  }
}
```

---

### 3. Get Result

Analiz sonucunu sorgular.

```http
GET /v1/get-result?job_id={job_id}
X-API-Key: dt_live_xxx
```

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `job_id` | ✅ | Analiz job ID'si |

**Response (Pending):**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "created_at": "2025-01-22T10:30:00Z"
  }
}
```

**Response (Completed):**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "created_at": "2025-01-22T10:30:00Z",
    "completed_at": "2025-01-22T10:30:05Z",
    "radiograph_type": "panoramic",
    "inference_version": "1.0.0",
    "result": {
      "radiograph_type": "panoramic",
      "classification_confidence": 0.98,
      "teeth": [
        {
          "tooth_id": 11,
          "confidence": 0.95,
          "polygon": [[100, 200], [150, 200], [150, 300], [100, 300]],
          "diseases": [
            {
              "type": "caries",
              "confidence": 0.87,
              "iou": 0.72,
              "polygon": [[110, 220], [140, 220], [140, 280], [110, 280]]
            }
          ]
        }
      ]
    }
  }
}
```

---

## Veri Yapıları

### Radiograph Types

| Value | Description |
|-------|-------------|
| `panoramic` | Panoramik röntgen |
| `bitewing` | Bitewing röntgen |
| `periapical` | Periapikal röntgen |
| `unsupported_image_type` | Desteklenmeyen görüntü |

### Job Status

| Value | Description |
|-------|-------------|
| `pending` | Kuyrukta bekliyor |
| `processing` | İşleniyor |
| `completed` | Tamamlandı |
| `failed` | Başarısız |

### Disease Types

| Value | Description (TR) |
|-------|------------------|
| `caries` | Çürük |
| `bone_loss` | Kemik kaybı |
| `root_canal` | Kanal tedavisi |
| `periapical_lesion` | Periapikal lezyon |
| `crown` | Kuron |
| `filling` | Dolgu |
| `implant` | İmplant |
| `bridge` | Köprü |
| `root_remnant` | Kök artığı |
| `impacted_tooth` | Gömülü diş |

### FDI Tooth Numbering

```
        Üst Çene
    ┌───────────────────┐
    │ 18 17 16 15 14 13 12 11 │ 21 22 23 24 25 26 27 28 │
    │    Sağ Üst        │        Sol Üst           │
    ├───────────────────┼──────────────────────────┤
    │ 48 47 46 45 44 43 42 41 │ 31 32 33 34 35 36 37 38 │
    │    Sağ Alt        │        Sol Alt           │
    └───────────────────┘
        Alt Çene
```

---

## Hata Kodları

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Başarılı |
| 201 | Oluşturuldu |
| 400 | Geçersiz istek |
| 401 | Kimlik doğrulama hatası |
| 404 | Kaynak bulunamadı |
| 413 | Dosya çok büyük |
| 429 | Rate limit aşıldı |
| 500 | Sunucu hatası |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `MISSING_API_KEY` | API key eksik | X-API-Key header ekleyin |
| `INVALID_API_KEY` | Geçersiz API key | Key'i kontrol edin |
| `API_KEY_INACTIVE` | Key devre dışı | Panel'den aktif edin |
| `MISSING_IMAGE` | Görüntü eksik | image field ekleyin |
| `MISSING_JOB_ID` | job_id eksik | job_id parametresi ekleyin |
| `IMAGE_TOO_LARGE` | Görüntü çok büyük | 20MB altında gönderin |
| `INVALID_IMAGE_TYPE` | Geçersiz format | JPEG/PNG/WebP kullanın |
| `JOB_NOT_FOUND` | İş bulunamadı | job_id'yi kontrol edin |
| `RATE_LIMIT_EXCEEDED` | Limit aşıldı | Biraz bekleyin |

---

## Rate Limiting

- **Varsayılan limit**: 100 istek/dakika
- **Özel limitler**: API key bazında ayarlanabilir

Rate limit aşıldığında:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please wait before making more requests."
  }
}
```

---

## Kod Örnekleri

### C# (.NET)

```csharp
using System.Net.Http.Headers;

public class DiagnoseThatClient
{
    private readonly HttpClient _client;
    private readonly string _apiKey;
    
    public DiagnoseThatClient(string apiKey)
    {
        _apiKey = apiKey;
        _client = new HttpClient
        {
            BaseAddress = new Uri("https://api.diagnosethat.net")
        };
        _client.DefaultRequestHeaders.Add("X-API-Key", apiKey);
    }
    
    public async Task<AnalysisResult> AnalyzeAsync(
        byte[] imageBytes, 
        string? patientRef = null)
    {
        // Submit analysis
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(imageBytes), "image", "radiograph.jpg");
        
        if (patientRef != null)
            content.Add(new StringContent(patientRef), "patient_ref");
        
        var submitResponse = await _client.PostAsync("/v1/submit-analysis", content);
        submitResponse.EnsureSuccessStatusCode();
        
        var submitResult = await submitResponse.Content
            .ReadFromJsonAsync<ApiResponse<JobInfo>>();
        
        // Poll for result
        while (true)
        {
            await Task.Delay(2000); // 2 second delay
            
            var resultResponse = await _client.GetAsync(
                $"/v1/get-result?job_id={submitResult.Data.JobId}");
            
            var result = await resultResponse.Content
                .ReadFromJsonAsync<ApiResponse<AnalysisResult>>();
            
            if (result.Data.Status == "completed")
                return result.Data;
            
            if (result.Data.Status == "failed")
                throw new Exception(result.Data.ErrorMessage);
        }
    }
}
```

### Python

```python
import httpx
import time
from typing import Optional

class DiagnoseThatClient:
    def __init__(self, api_key: str):
        self.base_url = "https://api.diagnosethat.net"
        self.headers = {"X-API-Key": api_key}
    
    def analyze(
        self,
        image_bytes: bytes,
        patient_ref: Optional[str] = None,
        timeout: int = 120
    ) -> dict:
        """Submit and wait for analysis result."""
        
        # Submit
        files = {"image": ("radiograph.jpg", image_bytes, "image/jpeg")}
        data = {}
        
        if patient_ref:
            data["patient_ref"] = patient_ref
        
        with httpx.Client(timeout=30) as client:
            response = client.post(
                f"{self.base_url}/v1/submit-analysis",
                headers=self.headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            job = response.json()["data"]
        
        # Poll
        start = time.time()
        while time.time() - start < timeout:
            time.sleep(2)
            
            with httpx.Client(timeout=10) as client:
                response = client.get(
                    f"{self.base_url}/v1/get-result",
                    headers=self.headers,
                    params={"job_id": job["job_id"]}
                )
                result = response.json()["data"]
            
            if result["status"] == "completed":
                return result
            
            if result["status"] == "failed":
                raise Exception(result.get("error_message", "Analysis failed"))
        
        raise TimeoutError("Analysis timed out")


# Kullanım
client = DiagnoseThatClient("dt_live_xxx")

with open("radiograph.jpg", "rb") as f:
    result = client.analyze(
        image_bytes=f.read(),
        patient_ref="P-12345"
    )

print(f"Radiograph type: {result['radiograph_type']}")
for tooth in result["result"]["teeth"]:
    print(f"Tooth {tooth['tooth_id']}: {len(tooth['diseases'])} diseases")
```

---

## SSS

### Sonuçlar ne kadar sürede hazır olur?

Tipik işlem süresi 3-10 saniyedir. Yoğun dönemlerde bu süre artabilir.

### Test ortamı var mı?

Evet, `dt_test_` prefix'li API key'ler test ortamını kullanır. Test ortamında:
- Gerçek GPU analizi yapılmaz
- Mock sonuçlar döner
- Rate limit daha yüksektir

### Webhook desteği var mı?

Şu an aktif değil. Sonuçlar polling ile alınmalıdır. Webhook desteği yakında eklenecektir.

### Görüntü sonuçları ne kadar süre saklanır?

Görüntüler ve analiz sonuçları 1 saat sonra otomatik silinir. Sadece metadata (job bilgileri) kalıcı olarak saklanır.

---

## Destek

Teknik sorular için: [support@diagnosethat.net](mailto:support@diagnosethat.net)
