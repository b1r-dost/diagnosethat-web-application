

# Çapraz Çizgilerin Yatay Görünme Sorunu - Düzeltme Planı

## Sorun

Sayfa yüklenirken arka plandaki çapraz çizgiler önce yatay görünüyor, sonra animasyon başlayınca çapraz hale geliyor. Bu görsel bir "flash" (yanıp sönme) etkisi yaratıyor.

## Teknik Analiz

**Mevcut Durum:**

```css
@keyframes slideDiagonal {
  from { transform: rotate(-15deg) translateX(-100%); }
  to { transform: rotate(-15deg) translateX(100%); }
}
```

```tsx
// AnimatedBackground.tsx
<div
  style={{
    animation: `slideDiagonal ${15 + i * 2}s linear infinite`,
    animationDelay: `${i * 1.5}s`,
    // transform yok! Animasyon başlayana kadar yatay kalıyor
  }}
/>
```

**Sorunun Kaynağı:**

1. Çizgilere başlangıç `transform` değeri verilmemiş
2. `animationDelay` nedeniyle bazı çizgiler geç başlıyor
3. CSS animasyonları varsayılan olarak `animation-fill-mode: none` kullanır - yani animasyon başlamadan önceki kareleri uygulamaz

## Çözüm

İki aşamalı düzeltme:

### 1. Başlangıç Transform Değeri Ekle

Çizgilere animasyon başlamadan önce de çapraz görünmeleri için `transform: rotate(-15deg)` ekle:

```tsx
// AnimatedBackground.tsx
<div
  style={{
    transform: 'rotate(-15deg) translateX(-100%)', // Başlangıç değeri
    animation: `slideDiagonal ${15 + i * 2}s linear infinite`,
    animationDelay: `${i * 1.5}s`,
  }}
/>
```

### 2. animation-fill-mode: backwards Ekle

Bu, animasyonun başlamadan önce ilk kare stillerini uygulamasını sağlar:

```tsx
style={{
  transform: 'rotate(-15deg) translateX(-100%)',
  animation: `slideDiagonal ${15 + i * 2}s linear infinite backwards`,
  // 'backwards' animasyon başlamadan önce from{} stillerini uygular
}}
```

## Değişecek Dosya

| Dosya | Değişiklik |
|-------|------------|
| `src/components/home/AnimatedBackground.tsx` | `transform` başlangıç değeri ve `animation-fill-mode: backwards` ekle |

## Sonuç

Sayfa yüklendiğinde çizgiler anında çapraz görünecek, yataydan çapraza geçiş "flash" efekti olmayacak.

