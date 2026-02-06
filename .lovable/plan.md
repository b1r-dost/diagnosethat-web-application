
## Hedef
Şifre sıfırlama linkine tıklanınca Supabase’ın kullanıcıyı “otomatik login” yapması teknik olarak normal; fakat uygulama bunu “normal giriş yapılmış kullanıcı” gibi yorumlayıp:
- ana sayfaya (/), dashboard’a (/dashboard) yönlendirebiliyor
- uygulama sidebar/menu (AppSidebar) görünür kalıyor
- kullanıcı “zaten login olmuş” hissi yaşıyor

Bizim hedefimiz:
1) Recovery linki ile gelen kullanıcıya **yalnızca “Yeni şifre belirle” ekranını** göstermek (uygulama kabuğu/sidebar olmadan)
2) Kullanıcı yeni şifreyi belirleyene kadar **dashboard’a otomatik yönlendirmeleri engellemek**
3) Şifre güncellenince **hemen signOut** yapıp login ekranına döndürmek (zaten var, daha sağlamlaştıracağız)

---

## Mevcut durum (kök neden)
- Recovery linki geldiğinde Supabase session oluştuğu için `useAuth` içerisindeki `user` dolu geliyor.
- `src/pages/Auth.tsx` şu an `MainLayout` ile render ediliyor; bu da sidebar + topbar + user menüsünü gösteriyor.
- Bazı sayfalar (özellikle `src/pages/Home.tsx`) `user` varsa otomatik `/dashboard` yönlendirmesi yapıyor. Eğer kullanıcı recovery linkinden **root path “/”**’e düşerse (Site URL / eski e-posta / yanlış redirect), reset ekranına geçemeden dashboard’a gidebiliyor.
- `useAuth.tsx` içinde `PASSWORD_RECOVERY` event’i ile `/auth?mode=reset`’e yönlendirme var; fakat bu yönlendirme **hash’i (access_token vs) kaybetme** riskine sahip ve her zaman event zamanlaması garanti değil.

---

## Uygulanacak değişiklikler

### 1) Auth ekranını uygulama kabuğundan ayır (Sidebar/Topbar göstermesin)
**Dosya:** `src/pages/Auth.tsx`

- `MainLayout` importunu ve sarmalamasını kaldıracağız.
- Auth ekranını “standalone” bir sayfa gibi (full-screen center card) render edeceğiz.
- Sonuç: `mode=reset` ekranında sidebar/topbar görünmeyecek; kullanıcı “login olmuş” hissi yaşamayacak.

Ek küçük iyileştirme:
- `authLoading` durumunda da MainLayout yerine basit bir loader (full screen) gösterilecek.

### 2) Recovery hash’i root “/” üzerinden gelirse dashboard’a değil reset ekranına git
**Dosya:** `src/pages/Home.tsx`

Şu an:
- user varsa `/dashboard`’a yönlendiriyor.

Güncelleme:
- Eğer `window.location.hash` içinde `type=recovery` varsa:
  - `/dashboard` yerine `/auth?mode=reset`’e yönlendir.
- Böylece yanlış/eskimiş e-postalar veya Site URL kaynaklı “/” inişleri bile reset akışına düşer.

### 3) PASSWORD_RECOVERY yönlendirmesini hash kaybetmeyecek şekilde güçlendir
**Dosya:** `src/hooks/useAuth.tsx`

Şu an:
- `window.location.href = '/auth?mode=reset';`

Güncelleme:
- Hash’i koruyacak şekilde yönlendirme:
  - `window.location.assign('/auth?mode=reset' + window.location.hash)`
- Ayrıca event bazen gecikebildiği için, bu değişiklik Home/Auth tarafındaki “hash tespiti” ile birlikte daha dayanıklı çalışacak.

Not:
- Burada “login olmasın” gibi bir şey yapmayacağız; çünkü Supabase password recovery mantığında session oluşması normal ve `updateUser({ password })` çağrısı için gerekir.
- Biz sadece bu session’ı “normal login UI” gibi göstermeyeceğiz.

### 4) Reset tamamlandığında güvenli çıkış + temiz URL (opsiyonel ama önerilir)
**Dosya:** `src/pages/Auth.tsx`

Zaten `updateUser` sonrası `supabase.auth.signOut()` var.
Ek olarak:
- Başarı sonrası `window.location.hash` temizliği (örn. `window.history.replaceState(null, '', '/auth?mode=login')`) ile token’ların URL’de kalmasını engelleyeceğiz.

---

## Test senaryoları (kritik)
1) **Gerçek sıfırlama e-postası** iste → gelen linke tıkla:
   - `/auth?mode=reset` açılmalı
   - Sidebar/Topbar görünmemeli
   - “Yeni Şifre / Yeni Şifre Tekrar” formu görünmeli
2) Aynı linki kopyalayıp farklı sekmede aç:
   - Yine reset ekranı açılmalı, dashboard’a atmasın
3) Yeni şifreyi belirle:
   - başarı mesajı
   - otomatik signOut
   - login moduna dön
4) Eski e-postalardan biri root path’e (/) düşürüyorsa:
   - Home sayfası `/dashboard` yerine `/auth?mode=reset`’e yönlendirmeli

---

## Değişecek dosyalar
- `src/pages/Auth.tsx` (MainLayout kaldırma + reset sonrası URL temizliği)
- `src/pages/Home.tsx` (recovery hash varsa reset moduna yönlendirme)
- `src/hooks/useAuth.tsx` (PASSWORD_RECOVERY redirect hash koruyarak)

---

## Beklenen sonuç
- Recovery linkine tıklayan kullanıcı “login olmuş” gibi uygulama panelini görmez.
- Her koşulda reset formuna düşer.
- Şifre değişimi sonrası sistemden çıkartılıp login ekranına döner.
