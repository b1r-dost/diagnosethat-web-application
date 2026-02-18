
# Placeholder Sorunu: Köken Analizi ve Düzeltme Planı

## Sorunun Kaynağı

Üç ayrı sorun tespit edildi:

### Sorun 1 — Auth.tsx ve LoginDialog.tsx: `fillPlaceholders` hiç yok

`Auth.tsx` (satır 456) ve `LoginDialog.tsx` (satır 433) şu şekilde render ediyor:

```tsx
dangerouslySetInnerHTML={{ __html: termsContent }}
```

Herhangi bir yer tutucu doldurma işlemi yapılmıyor. `{{AD}}`, `{{TARIH}}` gibi ifadeler ham metin olarak gösteriliyor. Bu dosyalarda `fillPlaceholders` fonksiyonu tanımlanmamış.

### Sorun 2 — Payment.tsx: Zamanlama (Race Condition)

`Payment.tsx`'te `fillPlaceholders` fonksiyonu mevcut ancak `profile` asenkron olarak çekiliyor. Dialog açıldığı anda `profile` henüz `null` olabilir:

```
fetchLegalDocs()  ─→ tamamlanır (içerik set edilir)
fetchProfile()    ─→ biraz daha geç tamamlanır
      ↓
Kullanıcı diyaloğu açar → profile hâlâ null → {{AD_SOYAD}} → " " (boş)
```

Ancak session replay'e göre `{{TARIH}}` de çalışmıyor — bu tarih için profil gerekmez. Bu da içeriğin **HTML olarak değil düz metin olarak** girildiğine işaret ediyor.

### Sorun 3 — Düz metin içerik HTML olarak render edilmiyor

İçerik textarea'ya düz metin olarak girilmiş (`\n` ile satır sonları). Ancak `dangerouslySetInnerHTML` HTML işler; düz metin satır sonlarını (`\n`) göstermez — her şey tek satırda görünür. `{{TARIH}}` gibi ifadeler ise regex ile bulunup değiştiriliyor, bu kısım doğru çalışmalı.

Session replay log'unda görülen içerik düz metin (HTML etiketi yok). Bu yüzden hem `fillPlaceholders`ın çalışıp çalışmadığı hem de satır sonlarının görünüp görünmediği belirsiz.

---

## Çözüm Planı

### 1. Auth.tsx — `fillPlaceholders` ekle

Kayıt sayfasında kullanıcı henüz kayıt olmadığından profil verisi form state'inden alınır (`firstName`, `lastName`, `email`):

```tsx
const fillPlaceholders = (content: string) => {
  const today = new Date();
  const dateStr = `${...}`;
  return content
    .replace(/\{\{AD\}\}/g, firstName)
    .replace(/\{\{SOYAD\}\}/g, lastName)
    .replace(/\{\{AD_SOYAD\}\}/g, `${firstName} ${lastName}`.trim())
    .replace(/\{\{EMAIL\}\}/g, email)
    .replace(/\{\{TARIH\}\}/g, dateStr);
};
```

Render:
```tsx
dangerouslySetInnerHTML={{ __html: fillPlaceholders(termsContent) }}
```

### 2. LoginDialog.tsx — `fillPlaceholders` ekle

Aynı mantık: form state'indeki `firstName`, `lastName`, `email` kullanılır.

### 3. Payment.tsx — Race condition düzelt

`fillPlaceholders` zaten doğru tanımlı. Ancak `profile` fetch'i yavaş gelebilir. İki düzeltme:

- `fetchProfile()` ve `fetchLegalDocs()` zaten paralel çalışıyor (sorun değil)  
- Dialog render anında `profile` boş olsa bile `user?.email` doğru çalışır; `{{TARIH}}` kesinlikle çalışmalı çünkü profil gerektirmiyor

`{{TARIH}}`'in de çalışmaması, regex'in HTML-encoded karakter sorununa işaret ediyor.

### 4. Düz metin → HTML dönüşümü

Eğer içerik HTML etiketi olmadan düz metin girilmişse, satır sonları (`\n`) HTML'de gösterilmez ve `fillPlaceholders` çalışsa da görsel sorun devam eder. 

İçeriği render ederken `\n` → `<br>` dönüşümü yapılır:

```tsx
const prepareContent = (content: string) => {
  // Eğer HTML etiket yoksa düz metni HTML'e çevir
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
  if (!hasHtmlTags) {
    return content.replace(/\n/g, '<br>');
  }
  return content;
};
```

`fillPlaceholders` çağrısından önce `prepareContent` uygulanır.

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/pages/Auth.tsx` | `fillPlaceholders` fonksiyonu eklenir; Terms ve Privacy dialog'larında kullanılır |
| `src/components/auth/LoginDialog.tsx` | `fillPlaceholders` fonksiyonu eklenir; Terms ve Privacy dialog'larında kullanılır |
| `src/pages/Payment.tsx` | `prepareContent` yardımcı fonksiyonu eklenir; `fillPlaceholders` öncesinde uygulanır |

---

## Teknik Özet

| Sorun | Dosya | Çözüm |
|---|---|---|
| `fillPlaceholders` hiç çağrılmıyor | Auth.tsx, LoginDialog.tsx | Fonksiyon eklenir, her dialog render'ında uygulanır |
| `{{TARIH}}` de çalışmıyor | Payment.tsx | `prepareContent` ile düz metin → HTML dönüşümü yapılır |
| Satır sonları görünmüyor | Tüm dosyalar | `\n` → `<br>` otomatik dönüşümü |
