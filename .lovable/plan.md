
# Kritik Güvenlik Düzeltmesi: user_roles Privilege Escalation

## Tehdit Seviyesi: 🔴 CRITICAL

Herhangi bir kullanıcı kendisine `admin` rolü atayabilir ve tam sistem yetkisi kazanabilir.

---

## Düzeltme Planı

### 1. RLS Policy Değişikliği (Database Migration)

Mevcut tehlikeli policy'yi kaldırıp, sadece `dentist` veya `patient` rollerinin insert edilmesine izin veren yeni policy ekle:

```sql
-- Tehlikeli policy'yi kaldır
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;

-- Güvenli policy ekle - sadece dentist/patient izinli
CREATE POLICY "Users can insert safe roles during signup"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND role IN ('dentist', 'patient')
        AND NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );
```

Bu policy:
- ✅ Sadece kendi user_id'si için insert yapabilir
- ✅ Sadece `dentist` veya `patient` rolü insert edebilir (`admin` ENGELLENDİ)
- ✅ Zaten rolü varsa tekrar insert yapamaz (tek seferlik)

### 2. Kod Tarafı Güvenlik (useAuth.tsx)

`fetchRoles` fonksiyonundaki metadata'dan rol oluşturma kısmını güvenli hale getir:

```typescript
// Satır 107: admin'i hariç tut
if (roleFromMetadata && ['dentist', 'patient'].includes(roleFromMetadata)) {
```

### 3. signUp fonksiyonu zaten güvenli
SignUp fonksiyonu TypeScript ile `role: 'dentist' | 'patient'` olarak tip sınırlı, bu güvenli. Fakat RLS policy asıl savunma hattı olmalı.

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| Database Migration | RLS policy değişikliği |
| `src/hooks/useAuth.tsx` | `admin` rolünü metadata'dan oluşturmayı engelle |

---

## Test Senaryoları

1. Normal kayıt (dentist/patient) - çalışmalı
2. DevTools ile admin rol insert deneme - **ENGELLENMELİ**
3. user_metadata'ya admin yazıp kayıt - **ENGELLENMELİ**
4. Mevcut adminler etkilenmemeli
