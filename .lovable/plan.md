

# Destekleme Paketi Sistemi (Odeme Altyapisi Haric)

Odeme entegrasyonu (Lemon Squeezy) sonra eklenecek. Su an UI tarafini, prompt mantigi, rozet/tesekkur mesaji ve Settings abonelik sekmesini hazirlayacagiz. Butonlar simdilik placeholder olarak kalacak.

---

## 1. SupportPrompt Bileseni (Sag Alt Popup)

**Yeni dosya:** `src/components/dashboard/SupportPrompt.tsx`

- Giris yapmis kullanicilara sag altta `fixed` pozisyonlu kucuk bir kart gosterilecek
- Icerik: baslik, mesaj, CTA butonu (simdilik `disabled` veya toast ile "Yakin zamanda" mesaji), kapatma (X) butonu
- Ceviriler zaten mevcut: `t.support.title`, `t.support.message`, `t.support.button`, `t.support.close`

### Gosterim / Gizleme Mantigi

1. Kullanici giris yapmis mi? Hayir ise gosterme
2. Bu ay aktif `subscriptions` kaydi var mi? Evet ise gosterme
3. Bugun `dismissed_prompts` tablosunda `prompt_type = 'support_prompt'` ve `dismissed_at = bugun` kaydi var mi? Evet ise gosterme
4. Hepsi gecildi ise goster

### Kapatma Islemi

- X'e tiklandiginda `dismissed_prompts` tablosuna insert:
  - `user_id`: mevcut kullanici
  - `prompt_type`: `'support_prompt'`
  - `dismissed_at`: bugunun tarihi (YYYY-MM-DD)
- Component state ile aninda gizle

---

## 2. Dashboard Rozet ve Tesekkur Mesaji

**Dosya:** `src/pages/Dashboard.tsx`

- Sayfa yuklenirken `subscriptions` tablosundan kontrol:
  - `user_id = auth.uid()`
  - `status = 'active'`
  - `package_month = mevcut_ay_adi` ve `package_year = mevcut_yil`
- Aktif destekci ise karsilama alanina:
  - Bir `Badge` ile `Heart` ikonu ve `t.dashboard.supportBadge` metni
  - Altina `t.dashboard.thankYou` mesaji
- Sayfanin altina `SupportPrompt` bileseni eklenir
- Ceviriler zaten mevcut: `t.dashboard.supportBadge`, `t.dashboard.thankYou`

---

## 3. Settings Abonelik Sekmesi

**Dosya:** `src/pages/Settings.tsx` satir 577-597

- Mevcut "Gelistiriliyor" placeholder'i guncellenecek
- Aktif abonelik varsa: paket adi, baslangic/bitis tarihi gosterilecek
- Aktif abonelik yoksa: "Destekleme Paketi Al" butonu (simdilik disabled, "Odeme sistemi yakin zamanda aktif olacak" mesaji ile)
- Ceviriler zaten mevcut: `t.settings.subscription.*`

---

## Degisecek / Olusturulacak Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `src/components/dashboard/SupportPrompt.tsx` | Yeni: sag alt prompt bileseni |
| `src/pages/Dashboard.tsx` | SupportPrompt ekleme + rozet/tesekkur mantigi |
| `src/pages/Settings.tsx` | Abonelik sekmesi: durum gosterimi + placeholder buton |

Odeme butonu simdilik devre disi (disabled) olacak; Lemon Squeezy entegrasyonu yapildiginda butonlar aktif hale getirilecek.
