

# Şifre Sıfırlama E-postası Sorunu Çözümü

## Sorun

`LoginDialog.tsx` bileşenindeki şifre sıfırlama fonksiyonu eksik - Supabase API'sini çağırmadan doğrudan başarı mesajı gösteriyor.

## Çözüm

`handleForgotPassword` fonksiyonunu gerçek Supabase şifre sıfırlama API'sini kullanacak şekilde güncelleyeceğiz.

## Değişiklikler

`src/components/auth/LoginDialog.tsx` dosyasında:

| Mevcut | Düzeltilecek |
|--------|--------------|
| Sadece `setSuccess()` çağırıyor | `supabase.auth.resetPasswordForEmail()` API'sini çağıracak |
| Hata kontrolü yok | Hata durumunu kontrol edecek |

## Teknik Detay

Satır 148-154 arasındaki fonksiyon şu şekilde güncellenecek:

```typescript
const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsLoading(true);
  
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t.auth.resetEmailSent);
    }
  } catch (err) {
    setError(t.common.error);
  } finally {
    setIsLoading(false);
  }
};
```

## Gerekli İmport

`supabase` client'ını dosyaya import etmek gerekiyor:
```typescript
import { supabase } from '@/integrations/supabase/client';
```

## Ek Kontrol: Supabase URL Ayarları

E-posta gönderilse bile kullanıcıya ulaşmaması durumunda:

1. Supabase Dashboard > Authentication > URL Configuration bölümünden:
   - **Site URL**: `https://diagnosethat.net` olarak ayarlanmalı
   - **Redirect URLs**: Preview ve production URL'leri eklenmeli

2. E-posta spam klasörü kontrol edilmeli

