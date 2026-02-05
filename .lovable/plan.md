

# Dinamik Sekme Başlığı ve Favicon

## Özet

Domain'e göre tarayıcı sekmesinin başlığını ve favicon'unu dinamik olarak değiştireceğiz:
- `diagnosethat.net` → Başlık: "DiagnoseThat", Favicon: DiagnoseThat ikonu
- `taniyorum.net` → Başlık: "TanıYorum", Favicon: TanıYorum ikonu

## Uygulama Planı

### Adım 1: Favicon Dosyaları Oluştur

Ana sayfadaki sol üstteki ikon (gradient arka planlı `Scan` ikonu) temel alınarak iki favicon oluşturacağız:

| Dosya | Domain |
|-------|--------|
| `public/favicon-en.svg` | diagnosethat.net |
| `public/favicon-tr.svg` | taniyorum.net |

Her iki favicon da aynı tasarımı kullanacak (gradient arka plan + diş tarama ikonu).

### Adım 2: I18nProvider'da Document Title ve Favicon Güncelle

`src/lib/i18n/context.tsx` dosyasındaki mevcut `useEffect` hook'una document.title ve favicon güncellemesi ekleyeceğiz:

```typescript
useEffect(() => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('taniyorum.net') || hostname.includes('taniyorum')) {
    setLanguageState('tr');
    document.title = 'TanıYorum';
    updateFavicon('/favicon-tr.svg');
  } else if (hostname.includes('diagnosethat.net') || hostname.includes('diagnosethat')) {
    setLanguageState('en');
    document.title = 'DiagnoseThat';
    updateFavicon('/favicon-en.svg');
  } else {
    // Local development
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('tr')) {
      setLanguageState('tr');
      document.title = 'TanıYorum';
      updateFavicon('/favicon-tr.svg');
    } else {
      setLanguageState('en');
      document.title = 'DiagnoseThat';
      updateFavicon('/favicon-en.svg');
    }
  }
}, []);

// Helper function
function updateFavicon(href: string) {
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (link) {
    link.href = href;
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.href = href;
    document.head.appendChild(newLink);
  }
}
```

### Adım 3: Dil Değişikliğinde Title ve Favicon Güncelle

Kullanıcı manuel olarak dil değiştirdiğinde de başlık ve favicon güncellenecek:

```typescript
const setLanguage = (lang: Language) => {
  setLanguageState(lang);
  localStorage.setItem('language', lang);
  
  // Update document title and favicon
  const title = lang === 'tr' ? 'TanıYorum' : 'DiagnoseThat';
  document.title = title;
  updateFavicon(lang === 'tr' ? '/favicon-tr.svg' : '/favicon-en.svg');
};
```

### Adım 4: index.html Varsayılan Favicon'u Güncelle

`index.html` dosyasına varsayılan favicon link'i ekleyeceğiz (JavaScript ile değiştirilecek):

```html
<link rel="icon" type="image/svg+xml" href="/favicon-en.svg" />
<title>DiagnoseThat</title>
```

---

## Dosya Değişiklikleri

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `public/favicon-en.svg` | **Yeni** | İngilizce favicon (gradient + scan icon) |
| `public/favicon-tr.svg` | **Yeni** | Türkçe favicon (gradient + scan icon) |
| `src/lib/i18n/context.tsx` | Güncelle | document.title ve favicon güncelleme mantığı |
| `index.html` | Güncelle | Varsayılan title ve favicon link |
| `public/favicon.ico` | Sil (opsiyonel) | Artık kullanılmayacak |

---

## Teknik Detaylar

### SVG Favicon Formatı

SVG format kullanıyoruz çünkü:
1. Vektörel - her boyutta keskin görünür
2. Küçük dosya boyutu
3. Gradient desteği
4. Modern tarayıcılarda tam destek

### Favicon SVG Yapısı

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#grad)"/>
  <!-- Scan icon path -->
  <path d="..." fill="white"/>
</svg>
```

