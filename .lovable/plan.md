
# Sidebar Navigasyon Düzenleme Planı

## Sorun
Şu an sidebar'da hem "Ana Sayfa" hem de "Panel" linkleri görünüyor. Giriş yapmış kullanıcılar için bu kafa karıştırıcı çünkü:
- Ana Sayfa zaten giriş yapınca Dashboard'a yönlendiriyor
- İki benzer isimli link kullanıcıyı şaşırtıyor

## Çözüm
Giriş yapmış kullanıcılar için "Ana Sayfa" linkini gizle, sadece "Panel" linki görünsün.

## Yapılacak Değişiklik

### `src/components/layout/AppSidebar.tsx`
Satır 58'deki `mainMenuItems` dizisinde "Ana Sayfa" için `show` koşulunu değiştir:

```typescript
// Önceki
{ title: t.nav.home, url: '/', icon: Home, show: true },

// Sonraki  
{ title: t.nav.home, url: '/', icon: Home, show: !user },
```

Bu değişiklikle:
- **Giriş yapmamış kullanıcılar**: Ana Sayfa linki görünür (landing page'e erişebilirler)
- **Giriş yapmış kullanıcılar**: Sadece Panel ve diğer ilgili linkler görünür

## Teknik Detaylar
- Tek satırlık değişiklik
- `!user` koşulu, kullanıcı giriş yapmamışsa `true` döner
- Mevcut `user` değişkeni zaten `useAuth()` hook'undan alınıyor
