
# Hasta Röntgeni Analiz Hatasını Düzeltme Planı

## Tespit Edilen Sorunlar

### 1. Kritik: Kullanıcı Profili Eksik
Giriş yapan kullanıcının (`1a0034eb-f1d1-4fea-a286-3af1412a3692`) `profiles` tablosunda kaydı yok. Edge function, analiz gönderiminde `doctor_ref` almak icin profil sorgusu yapiyor ve bulamayinca "User profile not found" hatasi donduruyor.

### 2. Kritik: Gateway API Yanit Yapisi Hatasi
`analyze-radiograph` edge function'da polling sirasinda Gateway API'nin yaniti yanlis okunuyor:
- Gateway yaniti: `{ success: true, data: { status, result } }`
- Mevcut kod: `pollResult.status` (undefined donuyor)
- Olmasi gereken: `pollResult.data?.status`

### 3. Guvenlik: Hardcoded API Key
Edge function'larda API anahtari kod icinde sabit yazilmis. Bu guvenlik riski olusturuyor ve anahtar degisikligini zorlastiriyor.

---

## Cozum Plani

### Adim 1: Gateway API Yanit Normalizing (analyze-radiograph)

`supabase/functions/analyze-radiograph/index.ts` dosyasinda polling kismini duzelt:

```typescript
// Satir 223-250 arasi degisecek
const pollResult = await pollResponse.json();

// Gateway yaniti { success: true, data: { status, result } } formatinda
// Normalize et: hem ust seviye hem data icinden oku
const status = pollResult.status ?? pollResult.data?.status;
const result = pollResult.result ?? pollResult.data?.result;
const errorMessage = pollResult.error_message ?? pollResult.data?.error_message;

console.log('Poll result - status:', status, 'hasResult:', !!result);

// Eger tamamlandiysa veya hata olduysa veritabanini guncelle
if (status === 'completed' || status === 'error' || status === 'failed') {
  const updateData = {
    analysis_status: status === 'completed' ? 'completed' : 'failed',
    updated_at: new Date().toISOString(),
    ...(status === 'completed' && result ? { analysis_result: result } : {})
  };

  await supabase
    .from('radiographs')
    .update(updateData)
    .eq('job_id', job_id);
}

// Normalize edilmis yanit don
return new Response(
  JSON.stringify({ status, result, error_message: errorMessage }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### Adim 2: Profil Olusturma Fallback

Profil bulunamazsa otomatik olusturma eklenir:

```typescript
// Satir 78-92 arasi degisecek
let { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('doctor_ref')
  .eq('user_id', user.id)
  .single();

// Profil yoksa otomatik olustur
if (profileError || !profile) {
  console.log('Profile not found, creating one for user:', user.id);
  
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
    })
    .select('doctor_ref')
    .single();

  if (createError || !newProfile) {
    console.error('Failed to create profile:', createError);
    return new Response(
      JSON.stringify({ error: 'Failed to create user profile' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  profile = newProfile;
}
```

### Adim 3: Patient Join Esneklik (Opsiyonel)

Radiograph sorgusunda `!inner` yerine normal join kullanarak patient olmadan da calismasini sagla:

```typescript
// Satir 61-65 arasi degisecek
const { data: radiograph, error: radiographError } = await supabase
  .from('radiographs')
  .select('*, patients(patient_ref, dentist_id)')  // !inner kaldirildi
  .eq('id', radiograph_id)
  .single();
```

### Adim 4: API Key Guvenlik (Opsiyonel - Sonraki Asamada)

API anahtarini Supabase secrets'a tasima:
1. `GATEWAY_API_KEY` secret'ini Supabase'e ekle
2. Edge function'da `Deno.env.get('GATEWAY_API_KEY')` kullan

---

## Teknik Degisiklikler Ozeti

| Dosya | Degisiklik |
|-------|-----------|
| `supabase/functions/analyze-radiograph/index.ts` | Gateway yanit normalizasyonu, profil fallback, patient join esnekligi |

## Beklenen Sonuc

- Kullanici profili yoksa otomatik olusturulacak
- Gateway API yanitlari dogru parse edilecek
- Polling sirasinda `status` ve `result` dogru okunacak
- Analiz sonuclari veritabanina dogru kaydedilecek
