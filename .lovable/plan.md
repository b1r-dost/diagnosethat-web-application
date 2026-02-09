
# Server-Side Pagination ve Arama: Patients Sayfası

Mevcut yapıda tüm hastalar client'a çekilip JavaScript ile filtreleniyor. Bu, veri büyüdükçe ciddi performans sorunlarına yol açar.

---

## Mevcut Durum (Sorunlu)

```typescript
// Tüm hastalar çekiliyor
const { data } = await supabase
  .from('patients')
  .select('*')
  .order('created_at', { ascending: false });

// Client'ta filtreleme
const filteredPatients = patients.filter(patient => {
  return patient.first_name.toLowerCase().includes(query) || ...
});
```

**Problem:** 1000 hasta varsa, her sayfa yüklemesinde 1000 satır transfer ediliyor.

---

## Yeni Yaklaşım

### 1. Server-Side Arama (ilike)

```typescript
let query = supabase
  .from('patients')
  .select('*', { count: 'exact' });

if (searchQuery.trim()) {
  query = query.or(
    `first_name.ilike.%${searchQuery}%,` +
    `last_name.ilike.%${searchQuery}%,` +
    `patient_ref.ilike.%${searchQuery}%,` +
    `phone.ilike.%${searchQuery}%`
  );
}

query = query
  .order('created_at', { ascending: false })
  .range(from, to);
```

### 2. Pagination (.range)

```typescript
const PAGE_SIZE = 10;
const [currentPage, setCurrentPage] = useState(1);

const from = (currentPage - 1) * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;

// Supabase query
.range(from, to)
```

### 3. Debounced Search

Kullanıcı her tuşa bastığında sorgu göndermemek için 300ms debounce:

```typescript
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
    setCurrentPage(1); // Arama değişince sayfa 1'e dön
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### 4. Toplam Kayıt Sayısı

```typescript
const { count } = await supabase
  .from('patients')
  .select('*', { count: 'exact', head: true });

const totalPages = Math.ceil(count / PAGE_SIZE);
```

---

## UI Değişiklikleri

### Pagination Bileşeni

Sayfa altına pagination kontrolü eklenecek:

```
[◀ Önceki] [1] [2] [3] ... [10] [Sonraki ▶]
```

### Sonuç Bilgisi

```
"25 hastadan 1-10 arası gösteriliyor"
```

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/Patients.tsx` | Server-side arama, pagination, debounce |
| `src/lib/i18n/translations.ts` | Pagination çevirileri (opsiyonel) |

---

## Teknik Detaylar

### State Yapısı

```typescript
const [patients, setPatients] = useState<Patient[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [totalCount, setTotalCount] = useState(0);

const PAGE_SIZE = 10;
const totalPages = Math.ceil(totalCount / PAGE_SIZE);
```

### fetchPatients Fonksiyonu (Yeni)

```typescript
const fetchPatients = async () => {
  setIsLoading(true);
  try {
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    // Server-side search
    if (debouncedSearch.trim()) {
      const searchTerm = `%${debouncedSearch.trim()}%`;
      query = query.or(
        `first_name.ilike.${searchTerm},` +
        `last_name.ilike.${searchTerm},` +
        `patient_ref.ilike.${searchTerm},` +
        `phone.ilike.${searchTerm}`
      );
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    setPatients(data || []);
    setTotalCount(count || 0);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    setIsLoading(false);
  }
};
```

### useEffect Dependencies

```typescript
// Debounce effect
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
    setCurrentPage(1);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// Fetch effect
useEffect(() => {
  if (user && isDentist) {
    fetchPatients();
  }
}, [user, isDentist, debouncedSearch, currentPage]);
```

---

## Performans Karşılaştırması

| Metrik | Önce | Sonra |
|--------|------|-------|
| İlk yükleme (1000 hasta) | ~1000 satır transfer | 10 satır transfer |
| Arama | Client CPU | Database indeks |
| Sayfa değişimi | Anlık (ama tüm veri zaten yüklü) | ~50ms DB sorgusu |
| Bellek kullanımı | Yüksek | Düşük |

---

## Pagination Bileşeni Kullanımı

Projede zaten `src/components/ui/pagination.tsx` mevcut. Bu bileşeni kullanarak:

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious 
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
      />
    </PaginationItem>
    
    {/* Sayfa numaraları */}
    
    <PaginationItem>
      <PaginationNext 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
      />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```
