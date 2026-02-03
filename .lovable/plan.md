
# Ana Sayfa Yeniden Tasarımı - DiagnoseThat / TanıYorum

## Sorun Analizi

### Mevcut Problemler
1. **Demo sistemi çalışmıyor**: API bağlantısı mock data kullanıyor ve gerçek Gateway ile entegre değil
2. **Roadmap veritabanı hatası**: `Invalid schema: public` hatası - Supabase'de tablolar `api` şemasında olmalı
3. **Tema yeşil ağırlıklı**: Turuncu tema isteniyor
4. **Arka plan zayıf**: Daha belirgin ve etkileyici animasyon isteniyor
5. **Tasarım farklı**: Referans Landing.tsx dosyasına benzemeli

---

## Değişiklikler

### 1. Renk Paleti - Turuncu Tema (index.css)

```text
Light Mode:
- Primary: Turuncu tonu (24 95% 53%) - parlak turuncu
- Primary Foreground: Beyaz
- Accent: Açık turuncu arka plan

Dark Mode:
- Primary: Canlı turuncu
- Arka plan tonları güncelleme
```

### 2. Arka Plan Animasyonu - Geliştirilmiş Versiyon

Referans dosyasındaki gibi CSS keyframe animasyonları ile:
- Daha belirgin çapraz çizgiler
- Pulse efektli ışıltı
- Gradient arka plan katmanları
- Blur efektli dekoratif daireler

```text
Yeni keyframes:
- slideRight: Çizgilerin kayması
- pulseGlowSubtle: Hafif parlama efekti

Gradient tanımları:
- gradient-primary: Turuncu gradient
- gradient-hero: Hero section arka plan
```

### 3. Home Sayfası Yeniden Tasarımı

Referans Landing.tsx'e benzer yapı:

**Header:**
- Fixed pozisyonlu, blur efektli
- Logo + marka adı + "Demo" etiketi
- Ülke/dil seçici
- Giriş/Kayıt butonları (hero variant)

**Hero Section:**
- Gradient arka plan
- Büyük blur daireler (dekoratif)
- Ana başlık ve alt başlık
- "Başlayın" ve "Deneyin" butonları

**Demo Section:**
- Geliştirilmiş QuickAnalysisDemo bileşeni
- Gerçek API entegrasyonu (Gateway ile)
- Polling mekanizması (2-3 saniye)
- Turuncu tema ile diş maskeleri, kırmızı hastalık maskeleri

**Features Section:**
- 4 özellik kartı (Scan, Zap, Shield, BarChart3 ikonları)
- Hover efektleri
- Turuncu vurgular

**About Section:**
- Gradient arka plan
- Şirket hakkında metin

**Roadmap Section:**
- Numaralı kartlar
- Veritabanından dinamik çekilecek (şema düzeltilecek)

**Footer:**
- Şirket bilgisi

### 4. Button Bileşeni - Yeni Varyantlar

```text
hero: Turuncu gradient, gölge, hover efekti
hero-outline: Turuncu kenarlık, şeffaf arka plan
size xl: Daha büyük boyut
```

### 5. Demo Analiz Sistemi Düzeltmesi

**Gerçek API Entegrasyonu:**
```text
1. Görüntü yükle
2. Gateway'e POST /v1/submit-analysis
3. job_id al
4. 2-3 saniyede bir GET /v1/get-result?job_id=xxx
5. status: completed olunca sonuçları göster
```

**Renk Güncellemesi:**
- Dişler: Turuncu/amber tonu (%20 şeffaflık)
- Hastalıklar: Kırmızı (%30 şeffaflık)

### 6. Roadmap Veritabanı Düzeltmesi

Supabase sorguları `api` şemasını kullanmalı veya RLS politikaları düzeltilmeli.

---

## Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `src/index.css` | Turuncu tema, gradient tanımları, animasyon keyframes |
| `src/components/ui/button.tsx` | hero, hero-outline varyantları, xl boyut |
| `src/pages/Home.tsx` | Landing.tsx benzeri tam yeniden yazım |
| `src/components/home/AnimatedBackground.tsx` | CSS-based çizgiler, gradient katmanları |
| `src/components/home/DemoAnalysis.tsx` | API entegrasyonu, turuncu tema, polling |
| `src/components/home/Roadmap.tsx` | Numaralı kartlar, yeni tasarım |
| `src/lib/i18n/translations.ts` | Hakkımızda, yeni metinler ekleme |
| `src/components/layout/Header.tsx` | Fixed header, hero butonları, dil seçici |

---

## Teknik Detaylar

### Yeni CSS Animasyonları
```css
@keyframes slideRight {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@keyframes pulseGlowSubtle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

### API Entegrasyonu (Edge Function kullanarak)
Gateway URL'si environment variable olarak saklanacak. Demo çağrılarında:
- `doctor_ref: 'MainPageDemo'`
- `clinic_ref: domain'e göre DiagnoseThat veya TanıYorum`

### Polling Mekanizması
```text
1. submit-analysis -> job_id
2. Her 3 saniyede get-result kontrolü
3. pending/processing ise devam
4. completed ise sonuçları göster
5. error ise hata mesajı
```
