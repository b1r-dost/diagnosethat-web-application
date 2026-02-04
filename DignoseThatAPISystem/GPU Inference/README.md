# DiagnoseThat GPU Inference Service

Python/FastAPI tabanlı GPU destekli inference mikroservisi. YOLO modellerini kullanarak diş röntgeni analizi yapar.

## Özellikler

- 🦷 Radyografi tipi sınıflandırma (panoramik, bitewing, periapikal)
- 🔍 Diş segmentasyonu (FDI numaralandırma)
- 🏥 Hastalık tespiti (çürük, kemik kaybı, kanal tedavisi vb.)
- 📊 IoU tabanlı hastalık-diş eşleştirme
- 🔄 PostgreSQL tabanlı job queue

## Gereksinimler

- NVIDIA GPU (CUDA 12.1+)
- Docker + NVIDIA Container Toolkit
- Python 3.11+ (yerel geliştirme için)

## Model Dosyaları

Aşağıdaki model dosyaları `models/` klasörüne yerleştirilmelidir:

```
models/
├── radtipi.pt                    # Radyografi tipi sınıflandırıcı
├── panodissegment.pt             # Panoramik diş segmentasyonu
├── panohastalik.pt               # Panoramik hastalık tespiti
├── bitedissegment.pt             # Bitewing diş segmentasyonu
├── bitehastalik.pt               # Bitewing hastalık tespiti
├── periapikaldissegment.pt       # Periapikal diş segmentasyonu
└── periapikalhastalik.pt         # Periapikal hastalık tespiti
```

## Environment Variables

```bash
# .env dosyası oluşturun
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKER_ID=inference-1
POLL_INTERVAL=2
MODEL_PATH=/app/models
```

## Kurulum

### Docker ile (Önerilen)

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Logs
docker-compose logs -f
```

### Yerel Geliştirme

```bash
# Virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## API Endpoints

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/health` | Sistem sağlık kontrolü |
| GET | `/metrics` | Prometheus metrikleri |

## Çalışma Prensibi

1. Worker, Supabase'den `claim_next_job()` fonksiyonunu çağırarak bekleyen job alır
2. `FOR UPDATE SKIP LOCKED` ile race condition önlenir
3. Görüntü Supabase Storage'dan indirilir
4. Sırasıyla sınıflandırma → segmentasyon → hastalık tespiti yapılır
5. IoU hesaplamasıyla hastalıklar dişlere eşlenir
6. Sonuç `jobs.result_json` alanına yazılır

## Monitoring

```bash
# Health check
curl http://localhost:8000/health

# Prometheus metrics
curl http://localhost:8000/metrics
```
