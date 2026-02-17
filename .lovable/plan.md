

# PDF Belge Goruntulemesi ve Build Hatasi Duzeltmesi

## 1. Belge dialoglarini PDF iframe ile gosterme

Admin panelinden yuklenen PDF dosyalari, kayit ve odeme sayfalarindaki dialoglarda dogrudan tarayicinin yerlesik PDF goruntuleyicisi ile gosterilecek. Google Docs Viewer gibi harici servislere gerek kalmayacak.

### Degisecek dosyalar ve degisiklikler:

| Dosya | Degisiklik |
|-------|-----------|
| `src/components/auth/LoginDialog.tsx` | Sozlesme dialoglarinda indirme linki yerine `<iframe src={fileUrl}>` ile PDF icerik gosterimi |
| `src/pages/Auth.tsx` | Ayni degisiklik - iframe ile PDF gosterimi |
| `src/pages/Payment.tsx` | Ayni degisiklik - iframe ile PDF gosterimi |
| `src/components/admin/LegalDocumentsTab.tsx` | Dosya kabul tipini `.pdf` olarak degistirme (`accept=".pdf"`) |
| `src/components/ui/chart.tsx` | recharts v3 tip uyumsuzlugu duzeltmesi |

### Dialog icerigi

Mevcut indirme linki yerine:

```text
+------------------------------------------+
|  [X]  Kullanici Sozlesmesi               |
|------------------------------------------|
|                                          |
|  <iframe src="dosya.pdf"                 |
|   class="w-full h-[60vh] border-0" />    |
|                                          |
+------------------------------------------+
```

Belge yuklenmemisse: "Belge henuz yuklenmemistir." mesaji gosterilecek.

### Teknik detay
- iframe src dogrudan Supabase storage public URL'si olacak
- Tarayicilar PDF'i native olarak renderlar, ek kutuphane gerekmez
- Admin panelinde dosya kabul tipi `.docx,.doc,.pdf` yerine sadece `.pdf` olacak

## 2. chart.tsx build hatasi duzeltmesi

`recharts` v3 ile gelen tip degisiklikleri nedeniyle `ChartTooltipContent` ve `ChartLegendContent` bilesenlerinde TypeScript hatalari olusuyor. `payload`, `label` ve `verticalAlign` props'larina `any` type assertion uygulanacak.

