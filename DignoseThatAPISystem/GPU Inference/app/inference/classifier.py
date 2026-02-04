"""
Radiograph type classifier using YOLO classification model
"""

from pathlib import Path
from typing import Tuple

import numpy as np
from ultralytics import YOLO


class RadiogaphClassifier:
    """
    Classifies dental radiographs into types:
    - panoramic
    - bitewing
    - periapical
    - unsupported_image_type
    """
    
    # Normalize model class name variations to standard types
    TYPE_NORMALIZATION = {
        'panoramic': 'panoramic',
        'pano': 'panoramic',
        'opg': 'panoramic',
        'bitewing': 'bitewing',
        'bw': 'bitewing',
        'periapical': 'periapical',
        'peri': 'periapical',
        'pa': 'periapical',
    }
    
    def __init__(self, model_path: Path):
        """
        Initialize classifier with model.
        
        Args:
            model_path: Path to the YOLO classification model (.pt file)
        """
        self.model = YOLO(str(model_path))
        
        # Log model class names for debugging
        print(f"[Classifier] Model loaded with classes: {self.model.names}")
    
    def classify(self, image: np.ndarray) -> Tuple[str, float]:
        """
        Classify a radiograph image.
        
        Args:
            image: Input image as numpy array (H, W, C)
            
        Returns:
            Tuple of (radiograph_type, confidence)
        """
        # Run inference
        results = self.model(image, verbose=False)
        
        if not results or len(results) == 0:
            return 'unsupported_image_type', 0.0
        
        result = results[0]
        
        # Get top prediction
        probs = result.probs
        if probs is None:
            return 'unsupported_image_type', 0.0
        
        top_class_idx = int(probs.top1)
        top_confidence = float(probs.top1conf)
        
        # Get class name from model (not hard-coded mapping)
        raw_name = self.model.names.get(top_class_idx, '')
        if isinstance(raw_name, str):
            name = raw_name.lower().strip()
        else:
            name = str(raw_name).lower().strip()
        
        # Normalize to standard type
        radiograph_type = self.TYPE_NORMALIZATION.get(name, 'unsupported_image_type')
        
        print(f"[Classifier] Predicted: {raw_name} (idx={top_class_idx}) -> {radiograph_type} (conf={top_confidence:.3f})")
        
        return radiograph_type, top_confidence
