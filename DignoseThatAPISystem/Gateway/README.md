# DiagnoseThat API Gateway

Cloudflare Worker tabanlı API Gateway. HBYS sistemlerinden gelen analiz isteklerini alır ve işler.

## Özellikler

- 🔐 API Key doğrulama
- 📤 Streaming image upload (düşük bellek kullanımı)
- ⚡ Rate limiting
- 📊 Non-blocking logging

## Kurulum

```bash
cd services/api-gateway
npm install
```

## Environment Variables

Wrangler secrets olarak ayarlanmalı:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Geliştirme

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

## API Endpoints

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/health` | Sistem sağlık kontrolü |
| POST | `/v1/submit-analysis` | Yeni analiz gönder |
| GET | `/v1/get-result` | Analiz sonucunu al |

## Rate Limits

- Varsayılan: 100 istek/dakika (API key bazında özelleştirilebilir)

## Örnek İstek

```bash
curl -X POST https://api.diagnosethat.net/v1/submit-analysis \
  -H "X-API-Key: dt_live_xxx" \
  -F "image=@radiograph.jpg"
```
