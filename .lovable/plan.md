
# Yol Haritası Yönetimi — Admin Paneli

## Mevcut Durum

- `roadmap_items` tablosu veritabanında zaten mevcut (title_tr, title_en, description_tr, description_en, display_order, is_active, icon alanları mevcut)
- RLS politikaları hazır: adminler tam yetki, herkes aktif öğeleri görebilir
- Ana sayfadaki `Roadmap` bileşeni zaten bu tablodan veri çekiyor
- Admin panelindeki Yol Haritası sekmesi yalnızca "yakında eklenecek" yazıyor — işlevsel değil

---

## Yapılacaklar

### 1. Yeni bileşen: `src/components/admin/RoadmapTab.tsx`

Tam CRUD arayüzü içerecek:

```text
┌───────────────────────────────────────────────────────┐
│  Yol Haritası Yönetimi          [+ Yeni Öğe Ekle]    │
├───────────────────────────────────────────────────────┤
│  #  │ Türkçe Başlık  │ İngilizce Başlık │ Durum │ İşlem
│  1  │ Özellik A      │ Feature A        │ ✅    │ ✏️ 🗑️
│  2  │ Özellik B      │ Feature B        │ ✅    │ ✏️ 🗑️
│  3  │ Özellik C      │ Feature C        │ ⬜    │ ✏️ 🗑️
├───────────────────────────────────────────────────────┤
│  Yeni Öğe / Düzenleme Formu                          │
│  Türkçe Başlık: [____________]                        │
│  İngilizce Başlık: [____________]                     │
│  Türkçe Açıklama: [____________]                      │
│  İngilizce Açıklama: [____________]                   │
│  Sıra: [__]  Aktif: [toggle]                         │
│                              [İptal] [Kaydet]         │
└───────────────────────────────────────────────────────┘
```

**Özellikler:**
- Mevcut öğeleri listele (display_order sırasıyla)
- Yeni öğe ekleme formu
- Mevcut öğeyi düzenleme (satıra tıklayınca form açılır)
- Öğeyi silme (onay dialog'u)
- Aktif/pasif toggle (checkbox ile)
- Türkçe ve İngilizce başlık + açıklama
- Sıra (display_order) numarası

### 2. Admin.tsx güncelleme

Roadmap sekmesindeki "yakında eklenecek" metni kaldırılır, `<RoadmapTab />` bileşeni eklenir.

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/components/admin/RoadmapTab.tsx` | Yeni dosya — tam CRUD yönetim bileşeni |
| `src/pages/Admin.tsx` | Roadmap tab içeriği `<RoadmapTab />` ile değiştirilir |

Veritabanı değişikliği **gerekmez** — tablo ve RLS politikaları zaten hazır.

---

## Teknik Detaylar

- Supabase'den `roadmap_items` tablosu okunur, `display_order` ile sıralanır
- Ekleme: `supabase.from('roadmap_items').insert(...)`
- Güncelleme: `supabase.from('roadmap_items').update(...).eq('id', id)`
- Silme: `supabase.from('roadmap_items').delete().eq('id', id)`
- Form gösterimi: Liste ile aynı sayfada, bir "Ekle / Düzenle" formu açılır kapanır
- Silme işleminde `AlertDialog` (onay dialog'u) kullanılır
- Ana sayfadaki `Roadmap` bileşeni değişmez — aynı tablodan zaten okuyacak
