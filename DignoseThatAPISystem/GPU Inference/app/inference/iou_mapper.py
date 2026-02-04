"""
IoU-based disease to tooth mapping using model-resolution masks
"""

from typing import List, Dict, Any

import numpy as np


class IoUMapper:
    """
    Maps detected diseases to teeth based on Intersection over Union (IoU)
    of their segmentation masks.
    
    Uses model-resolution masks for fast IoU calculation.
    """
    
    def __init__(self, iou_threshold: float = 0.1):
        """
        Initialize mapper.
        
        Args:
            iou_threshold: Minimum IoU to consider a disease as belonging to a tooth
        """
        self.iou_threshold = iou_threshold
    
    def map_diseases_to_teeth(
        self,
        teeth: List[Dict[str, Any]],
        teeth_masks: np.ndarray | None,
        diseases: List[Dict[str, Any]],
        disease_masks: np.ndarray | None,
    ) -> Dict[str, Any]:
        """
        Map diseases to teeth based on mask IoU.
        
        Each disease is assigned to the tooth with highest IoU above threshold.
        Uses model-resolution masks for fast calculation.
        
        Args:
            teeth: List of tooth detections with 'polygon' and '_mask_idx' fields
            teeth_masks: Mask tensor from segmenter (N_teeth, H_model, W_model)
            diseases: List of disease detections with 'polygon' and '_mask_idx' fields
            disease_masks: Mask tensor from detector (N_diseases, H_model, W_model)
            
        Returns:
            Dict with 'teeth', 'diseases', and 'analysis_summary'
        """
        # Build teeth list (without diseases embedded)
        teeth_result = []
        for tooth in teeth:
            teeth_result.append({
                'tooth_id': tooth['tooth_id'],
                'confidence': tooth['confidence'],
                'polygon': tooth['polygon'],
            })
        
        # Sort teeth by FDI number
        teeth_result.sort(key=lambda x: x['tooth_id'])
        
        # Build diseases list with tooth_id mapping
        diseases_result = []
        
        if teeth_masks is not None and disease_masks is not None:
            for disease in diseases:
                if '_mask_idx' not in disease:
                    continue
                
                disease_mask = disease_masks[disease['_mask_idx']].astype(bool)
                
                # Find best matching tooth
                best_tooth_id = None
                best_iou = 0.0
                
                for tooth in teeth:
                    if '_mask_idx' not in tooth:
                        continue
                    
                    tooth_mask = teeth_masks[tooth['_mask_idx']].astype(bool)
                    iou = self._calculate_mask_iou(tooth_mask, disease_mask)
                    
                    if iou >= self.iou_threshold and iou > best_iou:
                        best_iou = iou
                        best_tooth_id = tooth['tooth_id']
                
                # Add disease with tooth_id (or None if no match)
                disease_entry = {
                    'type': disease['type'],
                    'confidence': disease['confidence'],
                    'polygon': disease['polygon'],
                }
                if best_tooth_id is not None:
                    disease_entry['tooth_id'] = best_tooth_id
                
                diseases_result.append(disease_entry)
        
        return {
            'teeth': teeth_result,
            'diseases': diseases_result,
        }
    
    def _calculate_mask_iou(
        self,
        mask1: np.ndarray,
        mask2: np.ndarray
    ) -> float:
        """
        Calculate Intersection over Union between two boolean masks.
        
        Works on model-resolution masks (e.g. 640x640) for speed.
        
        Args:
            mask1: First boolean mask
            mask2: Second boolean mask
            
        Returns:
            IoU score between 0 and 1
        """
        # Calculate intersection and union
        intersection = np.logical_and(mask1, mask2).sum()
        union = np.logical_or(mask1, mask2).sum()
        
        if union == 0:
            return 0.0
        
        return float(intersection) / float(union)
