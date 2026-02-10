

# CORS Ayarlarini Domain ile Sinirla

## Sorun

`functions/api/` altindaki tum API fonksiyonlarinda `Access-Control-Allow-Origin: '*'` kullaniliyor. Bu, herhangi bir web sitesinin bu API'leri cagirabilmesine izin veriyor.

## Cozum

`*` yerine sadece izin verilen domainleri belirle. Cloudflare Pages Functions'da `context.request.headers.get('Origin')` kontrol edilerek dinamik CORS uygulanacak.

### Yaklasim

Her 4 dosyada ayni degisiklik yapilacak:

```typescript
const ALLOWED_ORIGINS = [
  'https://diagnosethat.net',
  'https://www.diagnosethat.net',
  'https://diagnosethat.pages.dev',
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}
```

Preview ortaminda test edebilmek icin Lovable preview URL'si de eklenmeli.

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `functions/api/demo-submit.ts` | Statik `corsHeaders` yerine `getCorsHeaders(request)` |
| `functions/api/demo-poll.ts` | Ayni degisiklik |
| `functions/api/user-submit.ts` | Ayni degisiklik |
| `functions/api/user-poll.ts` | Ayni degisiklik |

## Teknik Detay

- `Origin` header'i kontrol edilir, izin verilen listedeyse o origin dondurulur
- Listede degilse varsayilan domain (`diagnosethat.net`) dondurulur
- Her Response objesinde (basarili, hata, OPTIONS) dinamik CORS header'lari kullanilir
- Preview/development icin Lovable preview URL'si de listeye eklenir

