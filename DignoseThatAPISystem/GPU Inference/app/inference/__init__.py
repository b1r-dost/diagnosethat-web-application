"""
Inference pipeline for dental radiograph analysis
"""

from pathlib import Path
from typing import Any
import io

import numpy as np
from PIL import Image

from app.config import settings
from app.inference.classifier import RadiogaphClassifier
from app.inference.segmenter import ToothSegmenter
from app.inference.disease_detector import DiseaseDetector
from app.inference.iou_mapper import IoUMapper


class InferencePipeline:
    """
    Complete inference pipeline for dental radiograph analysis.
    
    Pipeline steps:
    1. Classify radiograph type (panoramic, bitewing, periapical)
    2. Segment individual teeth
    3. Detect diseases
    4. Map diseases to teeth using IoU
    """
    
    def __init__(
        self,
        model_path: Path,
        confidence_threshold: float = 0.5,
        iou_threshold: float = 0.1,
    ):
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        
        # Models (loaded lazily)
        self.classifier: RadiogaphClassifier | None = None
        self.segmenters: dict[str, ToothSegmenter] = {}
        self.disease_detectors: dict[str, DiseaseDetector] = {}
        self.iou_mapper = IoUMapper(iou_threshold=iou_threshold)
    
    def load_models(self):
        """Load all YOLO models"""
        # Classifier
        self.classifier = RadiogaphClassifier(
            self.model_path / settings.classifier_model
        )
        
        # Segmenters for each radiograph type - with confidence threshold
        self.segmenters = {
            'panoramic': ToothSegmenter(
                self.model_path / settings.pano_segment_model,
                confidence_threshold=self.confidence_threshold
            ),
            'bitewing': ToothSegmenter(
                self.model_path / settings.bite_segment_model,
                confidence_threshold=self.confidence_threshold
            ),
            'periapical': ToothSegmenter(
                self.model_path / settings.peri_segment_model,
                confidence_threshold=self.confidence_threshold
            ),
        }
        
        # Disease detectors for each radiograph type - with confidence threshold
        self.disease_detectors = {
            'panoramic': DiseaseDetector(
                self.model_path / settings.pano_disease_model,
                confidence_threshold=self.confidence_threshold
            ),
            'bitewing': DiseaseDetector(
                self.model_path / settings.bite_disease_model,
                confidence_threshold=self.confidence_threshold
            ),
            'periapical': DiseaseDetector(
                self.model_path / settings.peri_disease_model,
                confidence_threshold=self.confidence_threshold
            ),
        }
        
        print(f"[Pipeline] Models loaded with confidence_threshold={self.confidence_threshold}")
    
    def analyze(self, image_bytes: bytes) -> dict[str, Any]:
        """
        Run complete analysis pipeline on an image.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Analysis results with radiograph type, teeth, diseases, and summary
        """
        # Load image
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        image_shape = image_np.shape[:2]  # (H, W)
        
        # Step 1: Classify radiograph type
        radiograph_type, type_confidence = self.classifier.classify(image_np)
        
        # Handle unsupported image type
        if radiograph_type == 'unsupported_image_type':
            return {
                'radiograph_type': radiograph_type,
                'inference_version': '1.0.1',
                'teeth': [],
                'diseases': [],
                'analysis_summary': [],
                'message': 'Unsupported radiograph type',
            }
        
        # Step 2: Segment teeth (returns polygons + mask tensor)
        segmenter = self.segmenters.get(radiograph_type)
        if not segmenter:
            raise ValueError(f"No segmenter for type: {radiograph_type}")
        
        teeth, teeth_masks = segmenter.segment(image_np)
        
        # Step 3: Detect diseases (returns polygons + mask tensor)
        disease_detector = self.disease_detectors.get(radiograph_type)
        if not disease_detector:
            raise ValueError(f"No disease detector for type: {radiograph_type}")
        
        diseases, disease_masks = disease_detector.detect(image_np)
        
        # Step 4: Map diseases to teeth using IoU on model-resolution masks
        mapping_result = self.iou_mapper.map_diseases_to_teeth(
            teeth, teeth_masks,
            diseases, disease_masks
        )
        
        # Build result
        return {
            'radiograph_type': radiograph_type,
            'inference_version': '1.0.1',
            'teeth': mapping_result['teeth'],
            'diseases': mapping_result['diseases'],
        }
