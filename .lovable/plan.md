
# SupportPrompt: Kapatildiginda Sag Tarafa Kucuk Sekme Olarak Kalsin

## Mevcut Davranis
Kart kapatildiginda tamamen kayboluyor (`visible = false` ve `return null`).

## Yeni Davranis
Kart kapatildiginda tamamen kaybolmak yerine, ekranin sag kenarinda kucuk bir sekme/cikiniti olarak kalacak. Bu sekme:
- Sag kenara yapisik, dikey olarak ortalanmis veya alt kisimda sabit
- Icinde ici bos bir kalp ikonu (`Heart` with no fill) olacak
- Tiklandiginda kart tekrar acilacak (tam boyutuna donecek)
- Yumusak bir animasyonla kuculmesi ve buyumesi saglanacak

## Teknik Degisiklikler

**Dosya:** `src/components/dashboard/SupportPrompt.tsx`

- `visible` state yerine `collapsed` state eklenir
- Kapatma (X) butonuna tiklandiginda `collapsed = true` yapilir (ve dismissed_prompts'a kayit atilir)
- `collapsed` durumunda: sag kenarda kucuk yuvarlak/dikdortgen bir buton gosterilir (ici bos Heart ikonu)
- Bu butona tiklandiginda `collapsed = false` yapilir ve kart tekrar acilir
- `loading` true ise veya kullanici uygun degilse (aktif abone / bugun dismiss) hicbir sey gosterilmez
- Gecis animasyonu icin `transition-all duration-300` kullanilacak

### Gorsel Tasarim

```text
Acik hali (mevcut):
+---------------------------+
| [kalp] Baslik          [X]|
|         Mesaj metni        |
| [  Destekleme Paketi Al  ] |
+---------------------------+

Kapali hali (yeni):
        Ekranin sag kenari
                |
            +---+
            | ♡ |  <-- ici bos kalp, tiklanabilir
            +---+
```

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `src/components/dashboard/SupportPrompt.tsx` | `collapsed` state eklenmesi, iki gorunum (acik/kapali), animasyon |
