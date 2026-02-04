
# Eksik Özelliklerin Tamamlanması ve Navigasyon Barı Uyumlulaştırma Planı

## Tespit Edilen Eksiklikler

### 1. Navigasyon Barı Uyumsuzlukları

**Mevcut Durum (AppSidebar.tsx):**
- Navigasyon barı "Home, Dashboard, Patients, Suggestions, Guide, Admin, Settings" linklerini gösteriyor
- Çıkış butonu ve kullanıcı bilgileri sidebar'ın alt kısmında

**Belgedeki Gereksinim (Sayfa 7):**
- Navigasyon barının en üstünde sistemin adı ve altında "Dental teşhis asistanı" yazısı yer alacak
- Diş hekimi için: Karşılama (dashboard), Hastalarım, Kullanım Kılavuzu, Öneride Bulun, Ayarlar, Yönetici Paneli
- Hasta için: Karşılama (dashboard), Radyograflarım, Ayarlar, Yönetici Paneli
- Barın en altında çıkış yap butonu olacak
- Üst barda kullanıcı adı ve yuvarlak profil fotoğrafı

**Eksikler:**
- "Dental teşhis asistanı" / "Dental diagnosis assistant" alt yazısı yok
- Hasta rolü için "Radyograflarım" linki yok
- Rol bazlı navigasyon tam uyumlu değil

### 2. Analiz Sayfası Eksik Kontrolleri

**Mevcut Durum (Analysis.tsx):**
- "Dişleri belirt" ve "Rahatsızlıkları belirt" switch'leri var
- Parlaklık ve kontrast slider'ları var

**Belgedeki Gereksinim (Sayfa 9-10):**
- Dört onay kutusu olmalı:
  1. Dişleri belirt (varsayılan açık)
  2. Diş numaralarını göster (varsayılan açık)
  3. Rahatsızlıkları belirt (varsayılan açık)
  4. Rahatsızlık adlarını göster (varsayılan açık, sadece rahatsızlıklar açıkken aktif)
- Fare tekerleği ile zoom

**Eksikler:**
- "Diş numaralarını göster" switch'i yok
- "Rahatsızlık adlarını göster" switch'i yok (bağımlı durum kontrolü)
- Mouse wheel zoom yok

### 3. Şifre Sıfırlama (Auth.tsx)

**Mevcut Durum:**
- `handleForgotPassword` fonksiyonu TODO olarak işaretli
- Sadece success mesajı gösteriyor, gerçek e-posta göndermiyor

**Gereksinim:**
- Gerçek şifre sıfırlama e-postası gönderilmeli

### 4. Rapor Düzenleme (Analysis.tsx)

**Mevcut Durum:**
- Rapor tablosu salt okunur

**Belgedeki Gereksinim (Sayfa 10):**
- Rapor elle düzenlenebilir olmalı
- Satır eklenebilmeli ve silinebilmeli
- Kaydedilebilmeli
- Orijinal haline geri getirilebilmeli

---

## Uygulama Planı

### Adım 1: Navigasyon Barını Güncelle

**Dosya: `src/components/layout/AppSidebar.tsx`**

Değişiklikler:
- Header kısmına alt yazı ekle: "Dental teşhis asistanı" / "Dental diagnosis assistant"
- Hasta rolü için "Radyograflarım" linki ekle (yeni sayfa oluşturulacak)
- Rol bazlı navigasyonu düzelt

```tsx
// Header'a alt yazı ekleme
<SidebarHeader className="p-4">
  <Link to="/" className="flex flex-col">
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
        {brandName[0]}
      </div>
      {!collapsed && (
        <span className="text-lg font-bold text-primary">{brandName}</span>
      )}
    </div>
    {!collapsed && (
      <span className="text-xs text-muted-foreground mt-1">
        {language === 'tr' ? 'Dental teşhis asistanı' : 'Dental diagnosis assistant'}
      </span>
    )}
  </Link>
</SidebarHeader>

// Hasta için Radyograflarım linki
{ title: language === 'tr' ? 'Radyograflarım' : 'My Radiographs', url: '/my-radiographs', icon: Image, show: isPatient && !isDentist },
```

### Adım 2: Analiz Sayfasına Eksik Kontrolleri Ekle

**Dosya: `src/pages/Analysis.tsx`**

Değişiklikler:
- `showToothNumbers` ve `showDiseaseNames` state'leri ekle
- İlgili switch'leri ekle (rahatsızlık adları switch'i bağımlı olacak)
- Mouse wheel zoom fonksiyonelliği ekle

```tsx
// Yeni state'ler
const [showToothNumbers, setShowToothNumbers] = useState(true);
const [showDiseaseNames, setShowDiseaseNames] = useState(true);
const [zoom, setZoom] = useState(100);

// Mouse wheel zoom handler
const handleWheel = (e: React.WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -10 : 10;
  setZoom(prev => Math.min(200, Math.max(50, prev + delta)));
};

// Yeni switch'ler
<div className="flex items-center gap-2">
  <Switch 
    id="tooth-numbers" 
    checked={showToothNumbers}
    onCheckedChange={setShowToothNumbers}
    disabled={!showTeethMask}
  />
  <Label htmlFor="tooth-numbers" className="text-sm">
    {t.analysis.controls.showToothNumbers}
  </Label>
</div>

<div className="flex items-center gap-2">
  <Switch 
    id="disease-names" 
    checked={showDiseaseNames}
    onCheckedChange={setShowDiseaseNames}
    disabled={!showDiseaseMask}
  />
  <Label htmlFor="disease-names" className="text-sm">
    {t.analysis.controls.showDiseaseNames}
  </Label>
</div>
```

### Adım 3: Şifre Sıfırlamayı Tamamla

**Dosya: `src/pages/Auth.tsx`**

Değişiklik:
- `handleForgotPassword` fonksiyonunda gerçek Supabase API çağrısı

```tsx
const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsLoading(true);

  try {
    const { resetPassword } = useAuth();
    const { error } = await resetPassword(email);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(t.auth.resetEmailSent);
    }
  } catch (err) {
    setError(t.common.error);
  } finally {
    setIsLoading(false);
  }
};
```

### Adım 4: Rapor Düzenleme Özelliği Ekle

**Dosya: `src/pages/Analysis.tsx`**

Değişiklikler:
- `editableFindings` state'i ekle (orijinal findings'i korumak için)
- Satır düzenleme, ekleme, silme fonksiyonları
- "Orijinal Haline Getir" butonu

```tsx
// State'ler
const [editableFindings, setEditableFindings] = useState<Finding[]>([]);
const [isEditing, setIsEditing] = useState(false);

// Fonksiyonlar
const handleAddRow = () => {
  setEditableFindings([...editableFindings, {
    id: Date.now(),
    tooth_number: '-',
    condition: '',
    confidence: 0,
    severity: ''
  }]);
};

const handleRemoveRow = (id: number) => {
  setEditableFindings(editableFindings.filter(f => f.id !== id));
};

const handleResetReport = () => {
  setEditableFindings([...findings]);
};

// Butonlar
<div className="flex gap-2 mt-4">
  <Button size="sm" variant="outline" onClick={handleAddRow}>
    {t.analysis.report.addRow}
  </Button>
  <Button size="sm" variant="outline" onClick={handleResetReport}>
    {t.analysis.report.resetReport}
  </Button>
</div>
```

### Adım 5: Hasta Rolü için "Radyograflarım" Sayfası Oluştur

**Yeni Dosya: `src/pages/MyRadiographs.tsx`**

- Hasta rolündeki kullanıcıların kendi röntgenlerini görebileceği sayfa
- Röntgen yükleme özelliği
- Analiz sonuçlarını görüntüleme

### Adım 6: App.tsx'e Yeni Route Ekle

```tsx
<Route path="/my-radiographs" element={<MyRadiographs />} />
```

---

## Teknik Değişiklikler Özeti

| Dosya | Değişiklik Türü | Açıklama |
|-------|-----------------|----------|
| `src/components/layout/AppSidebar.tsx` | Güncelleme | Alt yazı, rol bazlı navigasyon |
| `src/pages/Analysis.tsx` | Güncelleme | Diş/hastalık numarası switch'leri, zoom, rapor düzenleme |
| `src/pages/Auth.tsx` | Güncelleme | Şifre sıfırlama fonksiyonelliği |
| `src/pages/MyRadiographs.tsx` | Yeni Dosya | Hasta röntgen sayfası |
| `src/App.tsx` | Güncelleme | Yeni route ekleme |

## Beklenen Sonuçlar

1. Navigasyon barı belgedeki tasarıma uyumlu hale gelecek
2. Analiz sayfasında diş numaraları ve hastalık adları gösterme kontrolleri çalışacak
3. Şifre sıfırlama gerçek e-posta gönderecek
4. Rapor tablosu düzenlenebilir olacak
5. Hastalar kendi röntgenlerini görüntüleyebilecek
