"""
Disease detection using YOLO segmentation model
"""

from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from ultralytics import YOLO


class DiseaseDetector:
    """
    Detects dental diseases/conditions in radiographs.
    Uses class names directly from the loaded YOLO model.
    """
    
    def __init__(self, model_path: Path, confidence_threshold: float = 0.5):
        """
        Initialize detector with model.
        
        Args:
            model_path: Path to the YOLO segmentation model (.pt file)
            confidence_threshold: Minimum confidence for detections
        """
        self.model = YOLO(str(model_path))
        self.confidence_threshold = confidence_threshold
        print(f"[DiseaseDetector] Model loaded with classes: {self.model.names}")
    
    def _get_disease_type(self, class_idx: int) -> str:
        """Get disease type directly from model names."""
        names = self.model.names
        if isinstance(names, (list, tuple)):
            return names[class_idx] if class_idx < len(names) else f'unknown_{class_idx}'
        return names.get(class_idx, f'unknown_{class_idx}')
    
    def detect(self, image: np.ndarray) -> tuple[List[Dict[str, Any]], np.ndarray | None]:
        """
        Detect diseases in a radiograph image.
        
        Args:
            image: Input image as numpy array (H, W, C)
            
        Returns:
            Tuple of:
            - List of disease detections with type, confidence, and polygon
            - Mask tensor for IoU calculation (model resolution)
        """
        # Run inference (retina_masks=False for faster IoU on model-size masks)
        results = self.model.predict(
            image,
            conf=self.confidence_threshold,
            retina_masks=True,
            agnostic_nms=True,
            verbose=False
        )
        
        if not results or len(results) == 0:
            return [], None
        
        result = results[0]
        
        # No detections
        if result.masks is None or result.boxes is None:
            return [], None
        
        diseases = []
        polygons_xy = result.masks.xy       # XY coordinates (original image resolution)
        masks_data = result.masks.data      # Tensor for IoU (model resolution)
        boxes = result.boxes
        
        for i, (polygon, box) in enumerate(zip(polygons_xy, boxes)):
            class_idx = int(box.cls[0])
            confidence = float(box.conf[0])
            
            # Get disease type from model names
            disease_type = self._get_disease_type(class_idx)
            
            # Convert polygon to int list [[x,y], [x,y], ...]
            polygon_list = polygon.astype(int).tolist()
            
            diseases.append({
                'type': disease_type,
                'confidence': round(confidence, 4),
                'polygon': polygon_list,
                '_mask_idx': i,  # Temporary reference for IoU mapper
            })
        
        return diseases, masks_data.cpu().numpy()
