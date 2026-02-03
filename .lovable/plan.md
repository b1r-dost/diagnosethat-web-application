
# DiagnoseThat / TanıYorum Web Uygulaması - Uygulama Planı

## 🎯 Proje Özeti
Diş hekimleri ve hastalar için yapay zeka destekli röntgen analiz platformu. Tek codebase ile iki domain'de (diagnosethat.net - İngilizce, taniyorum.net - Türkçe) hizmet verecek.

---

## 📐 Teknik Altyapı

### Veritabanı Yapısı
- **Kullanıcı Yönetimi**: Profiller, roller (Diş Hekimi, Hasta, Yönetici), ref numaraları
- **Hasta Kayıtları**: Hasta bilgileri, hekim bağlantıları
- **Röntgen Yönetimi**: Görüntü metadata, analiz sonuçları, Storage referansları
- **Ödeme Sistemi**: Abonelik kayıtları, destekleme paketleri
- **İletişim**: Öneriler, ticket sistemi, duyurular
- **Yol Haritası**: Dinamik roadmap öğeleri

### Güvenlik (KVKK, GDPR, HIPAA Uyumlu)
- Row Level Security (RLS) ile veri izolasyonu
- Hasta verileri şifrelemesi
- Rol tabanlı erişim kontrolü
- Detaylı audit log sistemi

---

## 🌐 Çok Dilli Yapı & Domain Yönetimi

### Otomatik Dil ve Marka Seçimi
- Domain kontrolü ile otomatik dil ve marka belirleme
- **taniyorum.net** → Türkçe arayüz, TanıYorum markası
- **diagnosethat.net** → İngilizce arayüz, DiagnoseThat markası
- Tüm metinler, butonlar, hata mesajları lokalize edilecek

---

## 🏠 Ana Sayfa

### Tasarım
- Modern & minimal arayüz
- Hafif hareketli ince çapraz çizgili arka plan
- Sade renk paleti (beyaz, gri, mavi aksanlar)

### Bileşenler
1. **Üst Bar**: Logo, giriş/kayıt butonları
2. **Demo Alanı**: 
   - Sürükle-bırak röntgen yükleme
   - Gateway'e anlık API çağrısı
   - Dişler yeşil, hastalıklar kırmızı maske ile gösterim
   - "Tam özellikler için kayıt olun" mesajı
   - Sonuçların klinik olmadığı uyarısı
3. **Yol Haritası Bölümü**: 
   - Admin panelinden yönetilebilir
   - Gelecek özellikler listesi (3D analiz, onaylar, vb.)
4. **Alt Bilgi**: İletişim, yasal bilgiler

---

## 🔐 Kimlik Doğrulama Sistemi

### Kayıt & Giriş
- E-posta/şifre ile kayıt (ana sayfada inline form)
- Rol seçimi: Diş Hekimi veya Hasta
- Her kullanıcıya otomatik `patient_ref` ve `doctor_ref` atanması
- Şifre sıfırlama akışı
- E-posta doğrulama

---

## 👨‍⚕️ Diş Hekimi Deneyimi

### Karşılama Sayfası
- Hoş geldin mesajı, hekim adı, kurum logosu
- Son kaydedilen hastalar kutucuğu
- Hızlı hasta kaydı butonu
- Duyurular paneli
- Destekleme paketi rozeti (alınmışsa)

### Hasta Listesi Sayfası
- Akıllı arama (ad, soyad, kimlik no)
- Kronolojik hasta listesi
- Yeni hasta kaydı butonu

### Hasta Kaydı Sayfası
- Zorunlu: Ad, Soyad
- Opsiyonel: Kimlik no, telefon, adres, doğum tarihi
- Otomatik `patient_ref` üretimi
- Röntgen yükleme alanı (hızlı kayıt için)

### Hasta Detay Sayfası
- Hasta bilgileri (genişletilebilir)
- Röntgen galerisi (thumbnail listesi)
- Hastalık önizleme katmanı
- Yeni röntgen yükleme
- Silme (onay gerekli)

---

## 🩺 Hasta Deneyimi

### Karşılama Sayfası
- Hoş geldin mesajı
- Kendi röntgenleri galerisi
- Röntgen yükleme alanı
- Hastalık önizleme katmanı
- Analiz sayfasına geçiş

### Erişebileceği Sayfalar
- Karşılama
- Kendi röntgenleri ve analizleri
- Ayarlar

---

## 🔬 Analiz Sayfası (Ortak)

### Görüntü İşleme
- Yükleme sırasında "Analiz bekleniyor" durumu
- Hastalık maskeleri (çürük: kırmızı, apikal lezyon: turuncu)
- Orijinal boyutu aşmayan gösterim

### Kontrol Paneli
- ☑️ Dişleri belirt (varsayılan açık) - rastgele renkli %20 şeffaf maskeler
- ☑️ Diş numaralarını göster (dişler açıksa aktif)
- ☑️ Rahatsızlıkları belirt (varsayılan açık)
- ☑️ Rahatsızlık adlarını göster (rahatsızlıklar açıksa aktif)

### Görüntü Araçları
- Fare tekerleği ile zoom
- Kontrast/parlaklık ayarları
- Diğer röntgenlere geçiş barı

### Rapor Tablosu
- 4 sütun: Sıra, Hastalık, İlgili Diş, Öneri
- Düzenlenebilir satırlar
- Satır ekleme/silme
- Orijinal haline geri dönme
- Yazdırma özelliği
- Yeniden analiz butonu

---

## 💳 Ödeme Sistemi

### Destekleme Paketi Konsepti
- Tüm özellikler ücretsiz kullanılabilir
- İsteğe bağlı aylık destekleme paketi
- Aylık isimli paketler (örn: "Ocak Destekleme Paketi")

### Kullanıcı Deneyimi
- Giriş sonrası sağ alt köşede telkin penceresi
- Bir kez kapatılınca o gün gösterilmez
- Satın alanlar için rozet ve teşekkür mesajı

### Entegrasyon
- Türkiye: Sanal POS uyumlu (ileride entegre)
- Uluslararası: Stripe uyumlu (ileride entegre)
- Şu an: "Geliştiriliyor" uyarısı

---

## ⚙️ Kullanıcı Ayarları

### Sekmeler
1. **Abonelik**: Paket alma/iptal, mevcut durum
2. **Şifre**: Şifre değiştirme
3. **Profilim**: 
   - Rol değişimi (hekim ↔ hasta)
   - Ad, soyad düzenleme
   - Kurum bilgileri (hekimler için)
   - Profil fotoğrafı yükleme
4. **Hesabım**: Hesap silme (onay gerekli)

---

## 🛡️ Admin Paneli

### Kullanıcılar Sayfası
- Tüm kullanıcı listesi
- Kayıt tarihi, son giriş, ülke, e-posta, roller
- Filtreleme ve arama

### Öneriler Sekmesi
- Ticket listesi
- Yanıt yazma
- Durum yönetimi

### Yol Haritası Sekmesi
- Roadmap öğeleri ekleme/düzenleme
- Ana sayfada dinamik gösterim

### Sunucu Yönetimi
- Şimdilik inaktif placeholder

---

## 💡 Öneriler Sayfası (Hekimler İçin)

- Öneri formu (metin + görsel)
- Kendi önerileri listesi
- Yönetici yanıtlarını görme
- Ticket durumu takibi

---

## 📖 Kullanım Kılavuzu

- Sistem kullanım rehberi
- Adım adım görev açıklamaları
- Sık sorulan sorular
- İki dilde içerik

---

## 🔄 API Entegrasyonu

### Gateway İletişimi
- Supabase secret olarak API key saklanacak
- Domain bazlı `clinic_ref` (DiagnoseThat / TanıYorum)
- Demo çağrılarında `doctor_ref=MainPageDemo`
- Hasta çağrılarında sadece `patient_ref`
- Hekim çağrılarında `doctor_ref` + `patient_ref`

### Polling Mekanizması
- İlk yanıt: job_id ve bekleme süresi
- 2-3 saniye aralıklarla sorgulama
- "pending" → "processing" → "completed" durumları

---

## 📱 Responsive Tasarım

- Mobil öncelikli yaklaşım
- Tablet ve masaüstü optimizasyonu
- Touch-friendly arayüz elemanları

---

## 🚀 Geliştirme Aşamaları

### Aşama 1: Temel Altyapı
- Veritabanı şeması ve RLS politikaları
- Çok dilli yapı ve domain yönetimi
- Kimlik doğrulama sistemi

### Aşama 2: Ana Sayfa & Demo
- Hareketli arka planlı ana sayfa
- Demo röntgen analiz alanı
- Yol haritası bölümü

### Aşama 3: Hekim Akışı
- Karşılama, hasta listesi, hasta kaydı
- Röntgen yönetimi
- Analiz sayfası

### Aşama 4: Hasta Akışı
- Hasta karşılama sayfası
- Kendi röntgenleri görüntüleme
- Analiz erişimi

### Aşama 5: Admin & Yardımcı
- Admin paneli
- Öneriler sistemi
- Kullanım kılavuzu
- Ayarlar sayfaları

### Aşama 6: Ödeme & Polish
- Ödeme sistemi placeholder
- Son düzenlemeler
- Performans optimizasyonu
