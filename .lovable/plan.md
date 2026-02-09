
# Beyaz Sayfa Sorunu Çözümü: Error Boundary ve Hata Yönetimi

Analiz gönderildikten sonra uygulamanın beyaz sayfaya düşmesi, yakalanmayan bir JavaScript hatasından kaynaklanıyor. React'ta rendering dışında oluşan asenkron hatalar Error Boundary tarafından yakalanmaz.

---

## Sorunun Analizi

### Tespit Edilen Problemler

1. **Global Error Boundary Eksik** - Yakalanmayan hatalar tüm React ağacını çökertiyor
2. **Polling Hata Yönetimi Yetersiz** - `pollForResult` içindeki `try/catch` hataları yalnızca konsola yazdırıyor, kullanıcıya bildirim yapılmıyor
3. **Unhandled Promise Rejection** - Asenkron hatalar React Error Boundary'nin kapsamı dışında

---

## Çözüm Planı

### 1. Global Error Boundary Ekle

`src/components/ErrorBoundary.tsx` oluştur:

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h2 className="text-xl font-bold mb-4">Bir hata oluştu</h2>
            <p className="text-muted-foreground mb-4">
              Sayfa yüklenirken bir sorun oluştu.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 2. App.tsx'e Global Unhandled Rejection Handler Ekle

```typescript
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", event.reason);
    toast.error("Beklenmeyen bir hata oluştu");
    event.preventDefault();
  };

  window.addEventListener("unhandledrejection", handleRejection);
  return () => window.removeEventListener("unhandledrejection", handleRejection);
}, []);
```

### 3. DemoAnalysis.tsx Polling Hata Yönetimini Güçlendir

**Mevcut kod (yetersiz):**
```typescript
} catch (err) {
  console.error('Polling error:', err);
  // Don't stop polling on transient errors
}
```

**Yeni kod (geliştirilmiş):**
```typescript
} catch (err) {
  console.error('Polling error:', err);
  pollingErrorCount++;
  
  // 3 ardışık hatadan sonra durdur
  if (pollingErrorCount >= 3) {
    clearInterval(pollingRef.current!);
    setError(language === 'tr' 
      ? 'Bağlantı hatası. Lütfen tekrar deneyin.' 
      : 'Connection error. Please try again.');
    setIsAnalyzing(false);
  }
}
```

---

## Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/ErrorBoundary.tsx` | **Yeni** - Global hata yakalama bileşeni |
| `src/App.tsx` | ErrorBoundary wrapper, unhandledrejection listener |
| `src/components/home/DemoAnalysis.tsx` | Polling hata sayacı, daha sağlam hata yönetimi |

---

## Teknik Detaylar

### Error Boundary Kapsamı

```text
┌─────────────────────────────────────────┐
│ ErrorBoundary                           │
│  ┌───────────────────────────────────┐  │
│  │ QueryClientProvider               │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ I18nProvider                │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │ AuthProvider          │  │  │  │
│  │  │  │  ┌─────────────────┐  │  │  │  │
│  │  │  │  │ Routes          │  │  │  │  │
│  │  │  │  └─────────────────┘  │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Polling Hata Yönetimi Akışı

```text
pollForResult başlar
    │
    ▼
API çağrısı
    │
    ├─ Başarılı ──▶ Sonucu işle
    │
    └─ Hata ──▶ pollingErrorCount++
                    │
                    ├─ < 3 ──▶ Polling devam
                    │
                    └─ >= 3 ──▶ Polling durdur
                                │
                                ▼
                          Kullanıcıya hata göster
```

---

## App.tsx Son Hali (Özet)

```tsx
import ErrorBoundary from './components/ErrorBoundary';
import { toast } from 'sonner';
import { useEffect } from 'react';

function AppContent() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Beklenmeyen bir hata oluştu");
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* ... providers and routes ... */}
    </QueryClientProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);
```
