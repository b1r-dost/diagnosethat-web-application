
# Tüm Hukuki Belgeler: HTML Şablon Sistemine Geçiş

## Mevcut Durum

Şu an 4 belge türü de PDF dosyası yüklenerek iframe ile gösteriliyor:
- `terms_of_service` (Kullanıcı Sözleşmesi) — Auth.tsx ve LoginDialog.tsx
- `privacy_policy` (Gizlilik Politikası) — Auth.tsx ve LoginDialog.tsx
- `pre_information` (Ön Bilgilendirme Formu) — Payment.tsx
- `distance_sales` (Mesafeli Satış Sözleşmesi) — Payment.tsx

## Hedef

PDF yükleme tamamen kaldırılacak. Admin panelinde her belge için zengin bir metin editörü sunulacak. Metin içinde `{{AD}}`, `{{SOYAD}}`, `{{AD_SOYAD}}`, `{{EMAIL}}`, `{{TARIH}}` gibi yer tutucular kullanılabilecek. Gösterim anında bunlar gerçek kullanıcı verileriyle doldurulacak.

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| Supabase migration | `legal_documents` tablosuna `content text` sütunu ekle |
| `src/components/admin/LegalDocumentsTab.tsx` | PDF yükleme arayüzü tamamen kaldırılır, her belge için `Textarea` editörü eklenir |
| `src/pages/Auth.tsx` | iframe kaldırılır, `content` HTML olarak render edilir |
| `src/components/auth/LoginDialog.tsx` | iframe kaldırılır, `content` HTML olarak render edilir |
| `src/pages/Payment.tsx` | iframe kaldırılır, profil çekilir, `{{AD_SOYAD}}` yer tutucuları doldurulur |
| `src/lib/i18n/translations.ts` | Admin paneli için yeni çeviri anahtarları eklenir |

---

## Veritabanı Değişikliği

`legal_documents` tablosuna tek bir sütun eklenir:

```sql
ALTER TABLE legal_documents ADD COLUMN content text;
```

Mevcut `file_url` ve `original_filename` sütunları silinmez, geriye dönük uyumluluk için yerinde bırakılır (boş kalacak artık).

---

## Admin Paneli — Yeni Arayüz

Her belge için:

```text
┌─────────────────────────────────────────────────────┐
│  📄 Kullanıcı Sözleşmesi              [Son güncelleme: 18.02.2026]
│                                                     │
│  Kullanılabilir yer tutucular:                      │
│  {{AD}}  {{SOYAD}}  {{AD_SOYAD}}  {{EMAIL}}  {{TARIH}}
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ <Textarea — HTML metin editörü>              │   │
│  │                                              │   │
│  │                                              │   │
│  └─────────────────────────────────────────────┘   │
│                              [Kaydet]               │
└─────────────────────────────────────────────────────┘
```

Kaydedilince `content` sütununa yazılır. Kaydetme başarılı olursa toast gösterilir.

---

## Yer Tutucu Sistemi

| Yer Tutucu | Değer |
|---|---|
| `{{AD}}` | Kullanıcının adı |
| `{{SOYAD}}` | Kullanıcının soyadı |
| `{{AD_SOYAD}}` | Ad ve soyad birleşik |
| `{{EMAIL}}` | Kullanıcının e-posta adresi |
| `{{TARIH}}` | Belgenin açıldığı tarih (GG.AA.YYYY) |

Yer tutucular basit `string.replace()` ile doldurulur, ek kütüphane gerekmez.

---

## Gösterim Mantığı (Tüm Dialoglar)

```text
content sütunu dolu mu?
  ├── Evet → Yer tutucuları doldur → <div dangerouslySetInnerHTML> ile render et
  └── Hayır → "Belge henüz eklenmemiştir." mesajı göster
```

---

## Teknik Detaylar

- Kullanıcı profili (`first_name`, `last_name`) Payment.tsx'te `supabase.from('profiles').select(...)` ile çekilir; `user.email` ise zaten `useAuth()` içinde mevcut.
- Auth.tsx ve LoginDialog.tsx'te kayıt formundaki `firstName`/`lastName` state değerleri direkt kullanılır (henüz kayıt olmadığından profil çekmeye gerek yok).
- `dangerouslySetInnerHTML` güvenle kullanılabilir çünkü içerik yalnızca admin tarafından girilmektedir.
- Dialog içeriği kaydırılabilir (`overflow-y-auto`) olacak, sabit yükseklik (`max-h-[70vh]`) korunacak.
- Belge tipi başına tek kayıt tutulacak (`upsert` mantığı korunuyor).
