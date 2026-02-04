"""
Configuration settings for the inference service
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # Cloudflare Queues
    cf_account_id: str
    cf_queue_id: str = "inference-jobs"
    cf_queues_token: str
    
    # Worker settings
    worker_id: str = "worker-1"
    poll_interval: float = 0.25  # Initial backoff (seconds)
    max_backoff: float = 5.0     # Maximum backoff when no messages
    visibility_timeout_ms: int = 300000  # 5 minutes
    batch_size: int = 5
    
    # Models
    model_path: str = "/app/models"
    
    # Model filenames
    classifier_model: str = "radtipi.pt"
    pano_segment_model: str = "panodissegment.pt"
    pano_disease_model: str = "panohastalik.pt"
    bite_segment_model: str = "bitedissegment.pt"
    bite_disease_model: str = "bitehastalik.pt"
    peri_segment_model: str = "periapikaldissegment.pt"
    peri_disease_model: str = "periapikalhastalik.pt"
    
    # Inference
    confidence_threshold: float = 0.1
    iou_threshold: float = 0.1
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
