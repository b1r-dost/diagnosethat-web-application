

# Duzeltmeler ve Rapor Indirme Ozelligi

Onceki denetimden kalan 4 madde (5. haric) ve PDF rapor indirme ozelligi.

---

## 1. resetPassword Redirect URL Duzeltmesi

**Dosya:** `src/hooks/useAuth.tsx` satir 299

Mevcut `/reset-password` adresi uygulamada yok. `/auth?mode=reset` olarak duzeltilecek.

```typescript
// Onceki:
redirectTo: `${window.location.origin}/reset-password`
// Sonra:
redirectTo: `${window.location.origin}/auth?mode=reset`
```

---

## 2. ErrorBoundary Dil Destegi

**Dosya:** `src/components/ErrorBoundary.tsx`

Sadece Turkce metin gosteriyor. `navigator.language` kontrolu ile EN/TR destegi eklenecek. Class component oldugu icin hook kullanilamaz; `render()` icinde `navigator.language.startsWith('tr')` ile dil tespiti yapilacak.

---

## 3. MyRadiographs Thumbnail Gorseli

**Dosya:** `src/pages/MyRadiographs.tsx` satir 253-255

Placeholder ikon yerine mevcut `RadiographThumbnail` bileseni kullanilacak. Bu bilesen zaten signed URL olusturma ve status badge gosterme islevlerini iceriyor.

---

## 4. PDF Rapor Indirme Ozelligi

**Dosya:** `src/pages/Analysis.tsx` satir 573-576

`jspdf` kutuphanesi kullanilarak profesyonel bir PDF raporu olusturulacak. Rapor icerigi:

- **Baslik:** Klinik adi (profildeki `institution_name`) ve kurum logosu (varsa)
- **Doktor bilgisi:** Profildeki ad/soyad (dentist rolu ise)
- **Hasta bilgisi:** `patient_id` uzerinden hastanin adi/soyadi (varsa)
- **Tarih:** Rontgenin yukleme tarihi
- **Rontgen gorseli:** Canvas'taki goruntu (overlay'ler dahil)
- **Bulgular tablosu:** Dis numarasi, hastalik, guven orani, siddet

### Teknik Detaylar

- `jspdf` paketi eklenir (yeni dependency)
- `fetchRadiograph` sorgusunda `patient_id` zaten mevcut; hasta bilgisi icin ek bir Supabase cagrisi yapilir
- Canvas gorselini `toDataURL('image/jpeg')` ile PDF'e gomulur
- `handleDownloadReport` fonksiyonu olusturulur

### PDF Sayfa Yapisi

```text
+----------------------------------+
|  [Logo]  Klinik Adi              |
|  Dr. Ad Soyad                    |
|  Tarih: 15 Subat 2026            |
+----------------------------------+
|  Hasta: Ad Soyad                 |
|  Dosya: rontgen.jpg              |
+----------------------------------+
|                                  |
|     [Rontgen Gorseli]            |
|                                  |
+----------------------------------+
|  Bulgular Tablosu                |
|  No | Dis | Hastalik | Siddet    |
|  1  | 36  | Caries   | Orta      |
|  2  | 14  | Lezyon   | Ciddi     |
+----------------------------------+
|  Footer: DiagnoseThat/TanıYorum  |
+----------------------------------+
```

---

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `src/hooks/useAuth.tsx` | Satir 299: redirect URL duzeltmesi |
| `src/components/ErrorBoundary.tsx` | EN/TR dil destegi eklenmesi |
| `src/pages/MyRadiographs.tsx` | Placeholder yerine `RadiographThumbnail` kullanimi |
| `src/pages/Analysis.tsx` | `handleDownloadReport` fonksiyonu, hasta bilgisi fetch, PDF olusturma |
| `package.json` | `jspdf` dependency eklenmesi |

