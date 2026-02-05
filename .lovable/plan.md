

# API Key Güvenliği: Cloudflare Pages Functions ile Proxy Mimarisi

## Özet

Bu plan, hardcoded API anahtarını koddan tamamen kaldırarak Cloudflare Secrets'ta güvenli bir şekilde saklamayı amaçlar. Cloudflare Pages Functions kullanarak frontend'in çağırabileceği proxy endpoint'leri oluşturacağız.

## Mevcut Durum ve Sorun

API anahtarı şu anda **2 Supabase Edge Function** içinde hardcoded:

| Dosya | Kullanım |
|-------|----------|
| `supabase/functions/demo-analysis/index.ts` | Ana sayfa demo analizi (auth gerektirmez) |
| `supabase/functions/analyze-radiograph/index.ts` | Giriş yapmış kullanıcı analizi (JWT auth) |

**Problem**: Lovable Cloud Edge Functions, Cloudflare Secrets'a erişemez. Bu fonksiyonlar Deno/Supabase ortamında çalışır.

## Çözüm: Cloudflare Pages Functions

Cloudflare Pages, `/functions` klasöründeki dosyaları otomatik olarak serverless fonksiyonlar olarak deploy eder. Bu fonksiyonlar `context.env` üzerinden Cloudflare Secrets'a erişebilir.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              YENİ MİMARİ                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Frontend (Cloudflare Pages)                                                    │
│       │                                                                         │
│       ├── Demo Analizi ───► /api/demo-submit ────► Gateway API                 │
│       │   (Auth yok)         (GATEWAY_API_KEY)     (api.diagnosethat.net)      │
│       │                                                                         │
│       └── Giriş Yapmış ───► /api/user-submit ────► Gateway API                 │
│           Kullanıcı          (JWT doğrulama +      (api.diagnosethat.net)      │
│                               GATEWAY_API_KEY)                                  │
│                                                                                 │
│  Secrets: context.env.GATEWAY_API_KEY                                          │
│           context.env.SUPABASE_SERVICE_ROLE_KEY                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Uygulama Planı

### Adım 1: Cloudflare Pages Functions Klasör Yapısı

Proje kök dizininde `/functions` klasörü oluştur:

```
/functions
├── api/
│   ├── demo-submit.ts      # POST /api/demo-submit
│   ├── demo-poll.ts        # GET  /api/demo-poll?job_id=xxx
│   ├── user-submit.ts      # POST /api/user-submit (JWT auth)
│   └── user-poll.ts        # POST /api/user-poll (JWT auth)
├── types.d.ts              # TypeScript tanımlamaları
└── tsconfig.json           # Functions için TypeScript config
```

### Adım 2: wrangler.toml Oluştur

Proje kök dizininde Pages Functions için wrangler.toml:

```toml
name = "diagnosethat"
pages_build_output_dir = "./dist"
compatibility_date = "2024-01-01"

[vars]
GATEWAY_API_URL = "https://api.diagnosethat.net"
SUPABASE_URL = "https://bllvnenslgntvkvgwgqh.supabase.co"

# Secrets (set via Cloudflare Dashboard or `wrangler secret put`):
# - GATEWAY_API_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### Adım 3: Pages Functions Oluştur

**functions/api/demo-submit.ts** (Authentication gerektirmez):

```typescript
interface Env {
  GATEWAY_API_KEY: string;
  GATEWAY_API_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { image_base64, clinic_ref, radiograph_type } = await context.request.json();
  
  // Base64 -> Blob dönüşümü
  const binaryString = atob(image_base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const imageBlob = new Blob([bytes], { type: 'image/jpeg' });

  // Gateway'e gönder
  const formData = new FormData();
  formData.append('image', imageBlob, 'radiograph.jpg');
  formData.append('doctor_ref', 'MainPageDemo');
  formData.append('clinic_ref', clinic_ref || 'DiagnoseThat');
  formData.append('patient_ref', 'DemoPatient');
  formData.append('radiograph_type', radiograph_type || 'panoramic');

  const response = await fetch(`${context.env.GATEWAY_API_URL}/v1/submit-analysis`, {
    method: 'POST',
    headers: { 'X-API-Key': context.env.GATEWAY_API_KEY },
    body: formData,
  });

  const result = await response.json();
  const jobId = result.job_id ?? result.data?.job_id;
  
  return new Response(JSON.stringify({ job_id: jobId, status: 'pending' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**functions/api/user-submit.ts** (JWT Authentication gerektirir):

```typescript
import { createClient } from '@supabase/supabase-js';

interface Env {
  GATEWAY_API_KEY: string;
  GATEWAY_API_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // JWT doğrulama
  const supabase = createClient(context.env.SUPABASE_URL, context.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  const { radiograph_id } = await context.request.json();

  // Radiograph ve profil bilgilerini al, görüntüyü indir, Gateway'e gönder
  // ... (mevcut analyze-radiograph mantığı)

  return new Response(JSON.stringify({ job_id, status: 'processing' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Adım 4: Frontend Güncellemeleri

**DemoAnalysis.tsx:**
```typescript
// Eski:
const submitResponse = await fetch(
  `https://bllvnenslgntvkvgwgqh.supabase.co/functions/v1/demo-analysis?action=submit`,
  ...
);

// Yeni:
const submitResponse = await fetch('/api/demo-submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image_base64: base64Data, clinic_ref: clinicRef }),
});
```

**Analysis.tsx:**
```typescript
// Eski:
const { data, error } = await supabase.functions.invoke('analyze-radiograph', {
  body: { radiograph_id: radiographData.id, action: 'submit' }
});

// Yeni:
const session = await supabase.auth.getSession();
const response = await fetch('/api/user-submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.data.session?.access_token}`,
  },
  body: JSON.stringify({ radiograph_id: radiographData.id }),
});
const data = await response.json();
```

### Adım 5: Eski Edge Functions'ı Sil

| Dosya | İşlem |
|-------|-------|
| `supabase/functions/demo-analysis/` | Sil |
| `supabase/functions/analyze-radiograph/` | Sil |
| `src/config/api-keys.txt` | Sil |

### Adım 6: Cloudflare Secrets Ayarlama (Manuel - Deployment Sonrası)

Cloudflare Dashboard üzerinden veya CLI ile:

```bash
# CLI ile (proje dizininde)
npx wrangler pages secret put GATEWAY_API_KEY
# Prompt'a API anahtarını yapıştırın

npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY
# Prompt'a Supabase service role key yapıştırın
```

Veya Cloudflare Dashboard:
1. Workers & Pages > Projenizi seçin
2. Settings > Environment variables > Add
3. "Encrypt" seçeneğini işaretleyerek secret ekleyin

---

## Dosya Değişiklikleri Özeti

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `functions/api/demo-submit.ts` | **Yeni** | Demo analiz submit |
| `functions/api/demo-poll.ts` | **Yeni** | Demo analiz polling |
| `functions/api/user-submit.ts` | **Yeni** | User analiz submit (JWT auth) |
| `functions/api/user-poll.ts` | **Yeni** | User analiz polling (JWT auth) |
| `functions/types.d.ts` | **Yeni** | TypeScript tipler |
| `functions/tsconfig.json` | **Yeni** | Functions TS config |
| `wrangler.toml` | **Yeni** | Pages Functions config |
| `src/components/home/DemoAnalysis.tsx` | Güncelle | URL'leri değiştir |
| `src/pages/Analysis.tsx` | Güncelle | supabase.functions.invoke → fetch |
| `supabase/functions/demo-analysis/` | **Sil** | Artık gerekli değil |
| `supabase/functions/analyze-radiograph/` | **Sil** | Artık gerekli değil |
| `src/config/api-keys.txt` | **Sil** | Hardcoded key temizliği |
| `.gitignore` | Güncelle | `.dev.vars` ekle |

---

## Güvenlik Avantajları

1. **API anahtarı kodda yok** - Cloudflare Secrets'ta şifreli saklanır
2. **Secrets git'e commit edilmez** - `.dev.vars` gitignore'da
3. **JWT doğrulama** - Kullanıcı endpoint'leri Supabase JWT ile korunur
4. **Tek kaynak** - Tüm API çağrıları aynı domain'den (`/api/*`)

## Deployment Sonrası Yapılacaklar

1. Cloudflare Dashboard'da secrets ekle:
   - `GATEWAY_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Projeyi yeniden deploy et
3. Test et:
   - Ana sayfa demo analizi
   - Giriş yapmış kullanıcı analizi
   - Dashboard'dan röntgen görüntüleme

