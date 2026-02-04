"""
Tooth segmentation using YOLO segmentation model
"""

from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from ultralytics import YOLO


class ToothSegmenter:
    """
    Segments individual teeth in dental radiographs.
    Uses class names directly from the loaded YOLO model.
    """
    
    def __init__(self, model_path: Path, confidence_threshold: float = 0.5):
        """
        Initialize segmenter with model.
        
        Args:
            model_path: Path to the YOLO segmentation model (.pt file)
            confidence_threshold: Minimum confidence for detections
        """
        self.model = YOLO(str(model_path))
        self.confidence_threshold = confidence_threshold
        print(f"[ToothSegmenter] Model loaded with classes: {self.model.names}")
    
    def _get_tooth_id(self, class_idx: int) -> int | str:
        """Get tooth ID directly from model names."""
        names = self.model.names
        if isinstance(names, (list, tuple)):
            raw_name = names[class_idx] if class_idx < len(names) else class_idx
        else:
            raw_name = names.get(class_idx, class_idx)
        
        # Convert to int if it's an FDI number, otherwise keep as string
        try:
            return int(raw_name)
        except (ValueError, TypeError):
            return raw_name
    
    def segment(self, image: np.ndarray) -> tuple[List[Dict[str, Any]], np.ndarray | None]:
        """
        Segment teeth in a radiograph image.
        
        Args:
            image: Input image as numpy array (H, W, C)
            
        Returns:
            Tuple of:
            - List of tooth detections with FDI number, confidence, and polygon
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
        
        teeth = []
        polygons_xy = result.masks.xy       # XY coordinates (original image resolution)
        masks_data = result.masks.data      # Tensor for IoU (model resolution, e.g. 640x640)
        boxes = result.boxes
        
        for i, (polygon, box) in enumerate(zip(polygons_xy, boxes)):
            class_idx = int(box.cls[0])
            confidence = float(box.conf[0])
            
            # Get tooth ID from model names
            tooth_id = self._get_tooth_id(class_idx)
            
            # Convert polygon to int list [[x,y], [x,y], ...]
            polygon_list = polygon.astype(int).tolist()
            
            teeth.append({
                'tooth_id': tooth_id,
                'confidence': round(confidence, 4),
                'polygon': polygon_list,
                '_mask_idx': i,  # Temporary reference for IoU mapper
            })
        
        return teeth, masks_data.cpu().numpy()
