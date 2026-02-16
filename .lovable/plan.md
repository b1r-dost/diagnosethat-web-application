

# Odeme Sayfasi, Sozlesme Yonetimi ve Kayit Ekrani Guncellemesi

Bu plan 4 ana bolumden olusur: (1) Odeme sayfasi, (2) Kayit ekraninda kullanici sozlesmesi onay kutusu, (3) Sozlesme belgeleri icin veritabani ve storage altyapisi, (4) Admin panelinde sozlesme yonetim sekmesi.

---

## 1. Veritabani ve Storage Degisiklikleri

### Yeni Tablo: `legal_documents`

Sozlesme belgelerini yonetmek icin bir tablo olusturulacak:

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| id | uuid (PK) | Otomatik |
| document_type | text (unique) | `terms_of_service`, `privacy_policy`, `pre_information`, `distance_sales` |
| file_url | text | Storage'daki dosya yolu |
| original_filename | text | Yuklenen dosyanin orijinal adi |
| updated_at | timestamptz | Son guncelleme |
| updated_by | uuid | Guncelleyen admin |

RLS: Herkes okuyabilir (SELECT), sadece adminler yazabilir (INSERT/UPDATE/DELETE).

### Yeni Storage Bucket: `legal-documents`

- Public bucket (herkes okuyabilsin)
- Admin-only upload (RLS ile)
- DOCX dosyalari yuklenecek

---

## 2. Odeme Sayfasi

**Yeni dosya:** `src/pages/Payment.tsx`
**Yeni route:** `/payment` (App.tsx'e eklenecek)

### Sol Taraf - Paket Secimi
- Iki secenek: "Tekli (Bu ay)" ve "Surekli (Her ay otomatik)"
- RadioGroup ile secim
- Secilen paketin ozeti

### Sag Taraf - Odeme Formu (Decoy)
- Kart numarasi, son kullanma tarihi, CVV alanlari
- Tum alanlar gorsel olarak dolu gorunecek ama islevsiz (disabled veya placeholder)
- "Ode" butonu

### Alt Kisim - Sozlesme Onaylari
- Checkbox: "On Bilgilendirme Formunu okudum ve kabul ediyorum" - tiklandiginda Dialog ile icerik gosterilecek
- Checkbox: "Mesafeli Satis Sozlesmesini okudum ve kabul ediyorum" - tiklandiginda Dialog ile icerik gosterilecek
- Her iki onay isaretlenmeden "Ode" butonu disabled kalacak
- Sozlesme icerikleri `legal_documents` tablosundan cekilecek; belge yuklenmemisse varsayilan bir metin gosterilecek

### SupportPrompt ve SubscriptionTab Guncelleme
- `SupportPrompt` icindeki `handleBuyClick` artik toast yerine `/payment` sayfasina yonlendirecek
- `SubscriptionTab` icindeki "Paket Satin Al" butonu da `/payment`'a yonlendirecek

---

## 3. Kayit Ekrani Guncellemesi

**Dosya:** `src/pages/Auth.tsx`

Signup formuna eklenenler:
- Zorunlu checkbox: "Kullanici Sozlesmesini okudum ve kabul ediyorum" - tiklandiginda Dialog ile icerik
- Altinda bilgi yazisi: "Gizlilik politikamizi inceleyebilirsiniz" - tiklandiginda Dialog ile icerik
- Checkbox isaretlenmeden kayit butonu disabled olacak
- Sozlesme icerikleri `legal_documents` tablosundan cekilecek

---

## 4. Admin Paneli - Sozlesmeler Sekmesi

**Yeni dosya:** `src/components/admin/LegalDocumentsTab.tsx`
**Guncellenen dosya:** `src/pages/Admin.tsx`

Admin paneline yeni bir "Sozlesmeler" sekmesi eklenecek (FileText ikonu ile).

4 belge tipi icin ayri ayri yukle/guncelle alanlari:
1. Kullanici Sozlesmesi (`terms_of_service`)
2. Gizlilik Politikasi (`privacy_policy`)
3. On Bilgilendirme Formu (`pre_information`)
4. Mesafeli Satis Sozlesmesi (`distance_sales`)

Her biri icin:
- Mevcut dosya adi ve son guncelleme tarihi gosterilecek
- DOCX dosya yukleme butonu
- Yukleme yapildiginda `legal-documents` bucket'ina kaydedilecek ve `legal_documents` tablosu guncellenecek

---

## 5. Ceviri Eklemeleri

**Dosya:** `src/lib/i18n/translations.ts`

Her iki dil icin yeni anahtarlar:

```text
legal.termsOfService / Kullanici Sozlesmesi / Terms of Service
legal.privacyPolicy / Gizlilik Politikasi / Privacy Policy
legal.preInformation / On Bilgilendirme Formu / Pre-Information Form
legal.distanceSales / Mesafeli Satis Sozlesmesi / Distance Sales Agreement
legal.acceptTerms / ... okudum ve kabul ediyorum / I have read and accept ...
legal.reviewPrivacy / Gizlilik politikamizi inceleyebilirsiniz / You can review our privacy policy
payment.title / Destekleme Paketi / Support Package
payment.oneTime / Tekli (Bu ay) / One-time (This month)
payment.recurring / Surekli (Her ay) / Recurring (Monthly)
payment.payButton / Ode / Pay
payment.cardNumber / Kart Numarasi / Card Number
payment.expiry / Son Kullanma / Expiry
payment.cvv / CVV / CVV
admin.tabs.legal / Sozlesmeler / Legal Documents
admin.legal.title / Sozlesme Yonetimi / Legal Document Management
admin.legal.upload / Belge Yukle / Upload Document
admin.legal.currentFile / Mevcut Dosya / Current File
admin.legal.noFile / Belge yuklenmemis / No document uploaded
```

---

## Degisecek / Olusturulacak Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| SQL migration | `legal_documents` tablosu + RLS + `legal-documents` bucket |
| `src/pages/Payment.tsx` | Yeni: odeme sayfasi (paket secimi + decoy form + sozlesme onaylari) |
| `src/App.tsx` | `/payment` route ekleme |
| `src/pages/Auth.tsx` | Signup formuna kullanici sozlesmesi onay kutusu + gizlilik politikasi linki |
| `src/components/dashboard/SupportPrompt.tsx` | toast yerine navigate('/payment') |
| `src/components/settings/SubscriptionTab.tsx` | toast yerine navigate('/payment') |
| `src/components/admin/LegalDocumentsTab.tsx` | Yeni: admin sozlesme yonetim sekmesi |
| `src/pages/Admin.tsx` | Sozlesmeler sekmesi ekleme |
| `src/lib/i18n/translations.ts` | Yeni ceviri anahtarlari |

