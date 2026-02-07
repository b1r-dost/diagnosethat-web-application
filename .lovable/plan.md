
# Veritabanı İndeksleri Ekleme Planı

Uygulama sorgularını analiz ettim. Şu anda hiçbir özel indeks tanımlanmamış. Bu, veri büyüdükçe sorguların yavaşlamasına neden olacak.

---

## Eklenecek İndeksler

| Tablo | İndeks | Kullanım Alanı |
|-------|--------|----------------|
| `patients` | `(dentist_id, created_at DESC)` | Hasta listesi sıralaması |
| `radiographs` | `(owner_user_id, created_at DESC)` | Hasta röntgen listesi |
| `radiographs` | `(patient_id, created_at DESC)` | Diş hekimi röntgen listesi |
| `radiographs` | `(analysis_status)` | Bekleyen analiz sayısı |
| `announcements` | `(is_active, priority DESC, created_at DESC)` | Duyuru sıralaması |
| `suggestions` | `(user_id, created_at DESC)` | Öneri listesi |
| `subscriptions` | `(user_id)` | Kullanıcı abonelikleri |
| `user_roles` | `(user_id)` | Rol sorguları |

---

## Migration SQL

```sql
-- Performans İyileştirmesi: Sık kullanılan sorgular için indeksler

-- Patients: dentist_id ile filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_patients_dentist_created 
ON public.patients(dentist_id, created_at DESC);

-- Radiographs: owner_user_id ile filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_radiographs_owner_created 
ON public.radiographs(owner_user_id, created_at DESC);

-- Radiographs: patient_id ile filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_radiographs_patient_created 
ON public.radiographs(patient_id, created_at DESC);

-- Radiographs: analysis_status filtreleme (pending count için)
CREATE INDEX IF NOT EXISTS idx_radiographs_analysis_status 
ON public.radiographs(analysis_status);

-- Announcements: is_active filtreleme + priority/created_at sıralama
CREATE INDEX IF NOT EXISTS idx_announcements_active_priority 
ON public.announcements(is_active, priority DESC, created_at DESC);

-- Suggestions: user_id filtreleme + created_at sıralama
CREATE INDEX IF NOT EXISTS idx_suggestions_user_created 
ON public.suggestions(user_id, created_at DESC);

-- Subscriptions: user_id filtreleme
CREATE INDEX IF NOT EXISTS idx_subscriptions_user 
ON public.subscriptions(user_id);

-- User roles: user_id filtreleme (has_role fonksiyonu için)
CREATE INDEX IF NOT EXISTS idx_user_roles_user 
ON public.user_roles(user_id);
```

---

## Beklenen İyileştirmeler

| Sorgu | Önce | Sonra |
|-------|------|-------|
| Hasta listesi (`/patients`) | Sequential Scan | Index Scan |
| Röntgen listesi (`/my-radiographs`) | Sequential Scan | Index Scan |
| Dashboard istatistikleri | Full Table Scan | Index-Only Scan |
| Duyurular | Sequential Scan | Index Scan |
| Rol kontrolü (`has_role`) | Sequential Scan | Index Scan |

---

## Teknik Notlar

- `IF NOT EXISTS` ile mevcut indekslerin tekrar oluşturulması engellenir
- `DESC` sıralama, `ORDER BY ... DESC` sorgularında ek sıralama maliyetini ortadan kaldırır
- Bileşik indeksler (örn. `dentist_id, created_at`) hem WHERE hem ORDER BY için kullanılabilir
- İndeksler INSERT/UPDATE performansını çok az etkiler ama SELECT performansını önemli ölçüde artırır

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| Database Migration | 8 yeni indeks ekle |
