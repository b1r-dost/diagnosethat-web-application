
# Şifre Sıfırlama - Login Sorunu Düzeltmesi

## Sorun Analizi

Şifre sıfırlama e-postasındaki linke tıklandığında:
1. Supabase, URL hash'inde `access_token` ve `type=recovery` parametreleri ile yönlendiriyor
2. Bu token ile kullanıcı otomatik olarak "authenticated" (giriş yapmış) oluyor - bu beklenen davranış
3. Ancak `Auth.tsx`'deki redirect mantığı, kullanıcı login olduğunda ve mode 'reset' değilse dashboard'a yönlendiriyor
4. `PASSWORD_RECOVERY` eventi tetiklenmeden önce sayfa yükleniyor ve yönlendirme gerçekleşiyor

## Çözüm

Auth sayfası yüklendiğinde URL hash'ini kontrol edip `type=recovery` varsa otomatik olarak reset moduna geçmeli.

## Değişiklikler

### src/pages/Auth.tsx

**useEffect eklenmesi** - URL hash'inden recovery tipini algıla:

```typescript
// URL hash'inden recovery tipini kontrol et
useEffect(() => {
  const hash = window.location.hash;
  if (hash.includes('type=recovery')) {
    setMode('reset');
  }
}, []);
```

Bu kod sayfa yüklendiğinde çalışacak ve URL'de `type=recovery` varsa mode'u 'reset' olarak ayarlayacak. Böylece:
- Kullanıcı login olmuş olsa bile reset formunu görecek
- Mevcut redirect logic'i `mode === 'reset'` olduğu için yönlendirme yapmayacak

## Akış (Düzeltme Sonrası)

```text
Kullanıcı e-postadaki linke tıklar
         │
         ▼
diagnosethat.net/#access_token=...&type=recovery
         │
         ▼
Auth.tsx yüklenir, useEffect URL hash'ini kontrol eder
         │
         ▼
type=recovery bulunur → setMode('reset')
         │
         ▼
Redirect useEffect'i: mode === 'reset' → yönlendirme yok
         │
         ▼
Yeni şifre formu gösterilir
         │
         ▼
Kullanıcı yeni şifre girer → updateUser() çağrılır
         │
         ▼
Başarılı → signOut() → login sayfasına yönlendir
```

## Alternatif Yaklaşım (Opsiyonel)

useAuth.tsx'deki `PASSWORD_RECOVERY` event handling'i de güncellenebilir, ancak event bazen gecikmeli tetiklenebileceği için URL hash kontrolü daha güvenilir bir çözüm.
