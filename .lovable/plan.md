

# Şifre Sıfırlama Akışı Düzeltmesi

## Sorun Analizi

Şifre sıfırlama linkine tıklandığında:
- Link `http://localhost:3000/#access_token=...&type=recovery` şeklinde geliyor
- Bu, Supabase'deki Site URL'in hâlâ `localhost:3000` olarak ayarlı olduğunu gösteriyor
- Ayrıca uygulama `type=recovery` token'ını okuyup yeni şifre formu göstermiyor

## Gerekli Düzeltmeler

### 1. Supabase Dashboard Ayarları (Sizin yapmanız gereken)

**Authentication > URL Configuration** bölümünde:

| Ayar | Mevcut | Olması Gereken |
|------|--------|----------------|
| Site URL | `http://localhost:3000` | `https://diagnosethat.net` |
| Redirect URLs | - | `https://diagnosethat.net/*` ekleyin |

Bu ayar yapılmadan e-postalardaki linkler localhost'a yönlenmeye devam edecek.

### 2. Kod Değişiklikleri

#### A. useAuth.tsx - PASSWORD_RECOVERY olayını dinle

`onAuthStateChange` callback'ine `PASSWORD_RECOVERY` event'i eklenerek kullanıcı şifre sıfırlama sayfasına yönlendirilecek.

#### B. Auth.tsx - Yeni şifre belirleme modu ekle

Auth sayfasına `reset` modu eklenerek:
- URL'deki `type=recovery` algılanacak
- Kullanıcıya yeni şifre girme formu gösterilecek
- `supabase.auth.updateUser({ password })` ile şifre güncellenecek

#### C. Translations - Yeni şifre formu metinleri

Türkçe ve İngilizce için yeni çeviri anahtarları eklenecek.

## Akış Şeması

```text
Kullanıcı "Şifremi Unuttum" tıklar
         │
         ▼
resetPasswordForEmail() çağrılır
         │
         ▼
E-posta gönderilir (Site URL: diagnosethat.net)
         │
         ▼
Kullanıcı linke tıklar
         │
         ▼
diagnosethat.net/#access_token=...&type=recovery
         │
         ▼
onAuthStateChange "PASSWORD_RECOVERY" algılar
         │
         ▼
Auth sayfası "reset" moduna geçer
         │
         ▼
Kullanıcı yeni şifre girer
         │
         ▼
updateUser({ password }) çağrılır
         │
         ▼
Başarılı → Dashboard'a yönlendir
```

## Teknik Detay

### useAuth.tsx değişikliği (satır 144-173)

`onAuthStateChange` callback'ine eklenecek:
```typescript
if (event === 'PASSWORD_RECOVERY') {
  // Şifre sıfırlama sayfasına yönlendir
  window.location.href = '/auth?mode=reset';
}
```

### Auth.tsx değişiklikleri

1. Mode state'ine `'reset'` eklenir
2. `handleResetPassword` fonksiyonu eklenir:
```typescript
const handleResetPassword = async (e: React.FormEvent) => {
  // Yeni şifre ve onay kontrolü
  // supabase.auth.updateUser({ password: newPassword })
  // Başarılı ise dashboard'a yönlendir
};
```
3. JSX'e yeni şifre formu eklenir

### translations.ts değişiklikleri

```typescript
// Türkçe
newPassword: 'Yeni Şifre',
setNewPassword: 'Yeni Şifre Belirle',
passwordResetSuccess: 'Şifreniz başarıyla güncellendi',

// İngilizce
newPassword: 'New Password',
setNewPassword: 'Set New Password',
passwordResetSuccess: 'Your password has been updated successfully',
```

