
# Hasta Rol ve Profil Sorunları Düzeltme Planı

## Tespit Edilen Kök Nedenler

### 1. Veritabanında Eksik Veriler
Sorguladığımda kullanıcı için:
- `user_roles` tablosunda kayıt YOK (boş dizi döndü)
- `profiles` tablosunda kayıt YOK (406 hatası - 0 satır)

Kullanıcının JWT token'ında `user_metadata.role = "patient"` bilgisi var, ancak bu bilgi `user_roles` tablosuna yazılmamış.

### 2. Signup Sırasında INSERT Başarısızlığı
`useAuth.tsx` signUp fonksiyonunda profil ve rol INSERT edilirken RLS politikası devreye giriyor. Mevcut politikalar:

**profiles tablosu INSERT politikası:**
```sql
WITH CHECK Expression: (auth.uid() = user_id)
```

**user_roles tablosu INSERT politikası:**
```sql
-- Yalnızca admin rolü olan kullanıcılar INSERT yapabilir
WITH CHECK Expression: has_role(auth.uid(), 'admin'::app_role)

-- VEYA kullanıcı kendi rolünü ekleyebilir (signup için)
WITH CHECK Expression: (auth.uid() = user_id)
```

**Sorun:** Signup sonrası `supabase.auth.signUp` tamamlandığında, hemen ardından yapılan INSERT işlemleri token henüz güncellenmediği için başarısız olabilir. 

### 3. Login Sonrası Eksik Rol Fallback
`useAuth.tsx` içinde `roles = []` olduğunda `isPatient = false` oluyor, bu yüzden:
- Sidebar'da "Radyograflarım" linki görünmüyor (`show: isPatient && !isDentist`)
- Dashboard'da hasta bölümü görünmüyor (`isPatient && !isDentist`)

---

## Çözüm Planı

### Adım 1: Login Sırasında Eksik Profil/Rol Oluştur (Fallback)

`useAuth.tsx` içinde login sonrası profil ve rol bulunamazsa, bunları otomatik oluşturacak fallback mantığı ekle:

```typescript
// fetchProfile içinde - eğer profil yoksa oluştur
const fetchProfile = useCallback(async (userId: string, userMetadata?: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') {
    // Profil yok - oluştur
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        first_name: userMetadata?.first_name || null,
        last_name: userMetadata?.last_name || null,
      })
      .select()
      .single();

    if (!insertError) {
      return newProfile as Profile;
    }
  }

  return data as Profile | null;
}, []);
```

### Adım 2: user_metadata'dan Rol Fallback

JWT token içindeki `user_metadata.role` bilgisini kullanarak eksik rolü oluştur:

```typescript
// fetchRoles içinde - eğer rol yoksa user_metadata'dan al ve oluştur
const fetchRoles = useCallback(async (userId: string, userMetadata?: any) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (!error && (!data || data.length === 0)) {
    // Rol yok - user_metadata'dan al ve oluştur
    const roleFromMetadata = userMetadata?.role as AppRole;
    if (roleFromMetadata) {
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: roleFromMetadata,
        });

      if (!insertError) {
        return [roleFromMetadata];
      }
    }
  }

  return (data?.map(r => r.role) || []) as AppRole[];
}, []);
```

### Adım 3: Dashboard'da Hasta Röntgenlerini Göster

`Dashboard.tsx` içinde hasta için röntgen verilerini çek ve göster:

```typescript
// fetchDashboardData yerine hasta için de veri çek
useEffect(() => {
  if (user) {
    fetchAnnouncements();
    if (isDentist) {
      fetchDashboardData();
    } else if (isPatient) {
      fetchPatientRadiographs(); // YENİ
    } else {
      setDataLoading(false);
    }
  }
}, [user, isDentist, isPatient]);

// Hasta röntgenlerini çek
const fetchPatientRadiographs = async () => {
  const { data } = await supabase
    .from('radiographs')
    .select('*')
    .eq('owner_user_id', user!.id)
    .order('created_at', { ascending: false });

  setRecentRadiographs(data || []);
  setDataLoading(false);
};
```

### Adım 4: Dashboard Hasta Bölümünü Geliştir

Dashboard'da hasta için röntgen listesi ve yükleme butonu ekle:

```tsx
{/* My Radiographs - Patient only */}
{isPatient && !isDentist && (
  <Card className="md:col-span-2">
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>{language === 'tr' ? 'Röntgenlerim' : 'My Radiographs'}</CardTitle>
        <CardDescription>
          {language === 'tr' ? 'Yüklediğiniz röntgenler' : 'Your uploaded radiographs'}
        </CardDescription>
      </div>
      <Button asChild>
        <Link to="/my-radiographs">
          <Upload className="h-4 w-4 mr-2" />
          {language === 'tr' ? 'Yeni Yükle' : 'Upload New'}
        </Link>
      </Button>
    </CardHeader>
    <CardContent>
      {dataLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : recentRadiographs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {language === 'tr' ? 'Henüz röntgen yüklenmemiş.' : 'No radiographs uploaded yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          {recentRadiographs.slice(0, 5).map(radiograph => (
            // Röntgen kartları...
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)}
```

---

## Teknik Değişiklikler Özeti

| Dosya | Değişiklik | Açıklama |
|-------|------------|----------|
| `src/hooks/useAuth.tsx` | Güncelleme | Eksik profil/rol fallback mantığı |
| `src/pages/Dashboard.tsx` | Güncelleme | Hasta röntgen listesi ve yükleme butonu |

## Beklenen Sonuçlar

1. Profil/rol eksik kullanıcılar login yaptığında otomatik olarak oluşturulacak
2. `isPatient` doğru olarak true dönecek
3. Sidebar'da "Radyograflarım" linki görünecek
4. Dashboard'da hasta röntgenleri listelenecek ve yükleme butonu görünecek
5. Yeni röntgen yükleme işlemi çalışacak
