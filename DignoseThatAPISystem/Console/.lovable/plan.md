# API Response Format - Final

## JSON Yapısı

```json
{
  "success": true,
  "data": {
    "job_id": "xxx",
    "status": "completed",
    "radiograph_type": "panoramic",
    "inference_version": "1.0.1",
    "result": {
      "teeth": [
        { "tooth_id": 36, "confidence": 0.92, "polygon": [[x1,y1], ...] }
      ],
      "diseases": [
        { "type": "caries", "confidence": 0.88, "tooth_id": 36, "polygon": [[x1,y1], ...] }
      ]
    }
  }
}
```

## Notlar

- `analysis_summary` kaldırıldı - hastalık-diş ilişkisi `diseases` listesindeki `tooth_id` ile takip edilir
- Timestamps (`created_at`, `completed_at`) API yanıtından çıkarıldı
- `classification_confidence`, `image_shape`, `iou_score` kaldırıldı

---

## Deployment

GPU Sunucu Restart:
```bash
sudo systemctl restart diagnosethat-inference
```

