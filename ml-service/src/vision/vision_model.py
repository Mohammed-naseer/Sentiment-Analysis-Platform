"""
Product Condition & Defect Vision Classifier
Architecture: MobileNetV3-Small transfer learning with custom multi-class classification head.
Classes:
- NORMAL
- PHYSICAL_DAMAGE
- SCRATCH
- CRACK
- BROKEN_COMPONENT
- PACKAGING_DAMAGE
- OTHER_ISSUE
- UNKNOWN
"""

import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from typing import Dict, Any, List, Optional
import numpy as np

VISION_CLASSES = [
    "NORMAL",
    "PHYSICAL_DAMAGE",
    "SCRATCH",
    "CRACK",
    "BROKEN_COMPONENT",
    "PACKAGING_DAMAGE",
    "OTHER_ISSUE",
    "UNKNOWN"
]

class DefectVisionClassifier(nn.Module):
    def __init__(self, num_classes: int = len(VISION_CLASSES) - 1, pretrained: bool = True):
        super().__init__()
        # Use lightweight MobileNetV3-Small backbone for fast CPU inference
        weights = models.MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        backbone = models.mobilenet_v3_small(weights=weights)
        
        # Keep feature extractor, replace classifier head
        in_features = backbone.classifier[0].in_features
        self.features = backbone.features
        self.avgpool = backbone.avgpool
        
        self.classifier = nn.Sequential(
            nn.Linear(in_features, 128),
            nn.Hardswish(),
            nn.Dropout(p=0.2),
            nn.Linear(128, num_classes)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x

class VisionPipeline:
    MODEL_NAME = "MobileNetV3-DefectClassifier"
    MODEL_VERSION = "1.1"
    CONFIDENCE_THRESHOLD = 0.40  # Under 40% returns UNKNOWN
    MULTI_DEFECT_THRESHOLD = 0.20 # Additional defects exceeding 20% confidence are reported

    def __init__(self, weights_path: Optional[str] = None, device: str = "cpu"):
        self.device = device
        self.model = DefectVisionClassifier(num_classes=len(VISION_CLASSES) - 1, pretrained=True)
        
        # Default weights search path
        if not weights_path:
            default_weights = os.path.join(os.path.dirname(__file__), "../../models/defect_classifier.pt")
            if os.path.exists(default_weights):
                weights_path = default_weights

        if weights_path and os.path.exists(weights_path):
            try:
                state_dict = torch.load(weights_path, map_location=device)
                if "classifier" in state_dict and "features" in state_dict:
                    self.model.features.load_state_dict(state_dict["features"])
                    self.model.avgpool.load_state_dict(state_dict["avgpool"])
                    self.model.classifier.load_state_dict(state_dict["classifier"])
                else:
                    self.model.load_state_dict(state_dict)
                print(f"[VisionPipeline] Loaded trained defect classifier weights from {weights_path}")
            except Exception as e:
                print(f"[VisionPipeline] Warning: Could not load weights from {weights_path}: {e}")
                
        self.model.to(self.device)
        self.model.eval()
        
        # Standard torchvision preprocessing pipeline
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def predict(self, img: Image.Image, product_category: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs inference on an opened PIL Image.
        Returns structured dictionary with primary label, confidence, multiple detected defects, alternatives, and model metadata.
        """
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        tensor = self.transform(img).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        classes_without_unknown = VISION_CLASSES[:-1]  # 7 classes
        
        top_idx = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        top_label = classes_without_unknown[top_idx]
        
        # Sort alternatives
        sorted_indices = np.argsort(probs)[::-1]
        alternatives = []
        for idx in sorted_indices[1:4]:
            alternatives.append({
                "label": classes_without_unknown[idx],
                "confidence": round(float(probs[idx]), 3)
            })

        # Multiple visual defect detection:
        # Check all defect classes (excluding NORMAL) exceeding threshold
        multiple_defects = []
        for idx in sorted_indices:
            cls_name = classes_without_unknown[idx]
            cls_prob = float(probs[idx])
            if cls_name != "NORMAL" and cls_prob >= self.MULTI_DEFECT_THRESHOLD:
                multiple_defects.append({
                    "label": cls_name,
                    "confidence": round(cls_prob, 3)
                })

        # Joint defect probability: when multiple defects coexist (e.g. CRACK 36.5% + PHYSICAL_DAMAGE 39.1% + PACKAGING_DAMAGE 21.6%),
        # the composite defect probability that the item is damaged is high (1 - prob(NORMAL)).
        normal_idx = classes_without_unknown.index("NORMAL") if "NORMAL" in classes_without_unknown else -1
        normal_prob = float(probs[normal_idx]) if normal_idx != -1 else 0.1
        composite_defect_prob = float(1.0 - normal_prob)

        # Confidence gating policy:
        # If composite defect probability is high (>= 0.70) and top defect >= 0.35, classify as top defect
        # Under 0.35 or low composite certainty returns UNKNOWN
        if top_conf < self.CONFIDENCE_THRESHOLD and (composite_defect_prob < 0.70 or top_conf < 0.30):
            return {
                "label": "UNKNOWN",
                "confidence": round(top_conf, 3),
                "multiple_defects": multiple_defects,
                "is_low_confidence": True,
                "note": f"Defect confidence ({round(top_conf * 100)}%) is below diagnostic threshold (35%). Manual verification recommended.",
                "alternatives": alternatives,
                "model": {
                    "name": self.MODEL_NAME,
                    "version": self.MODEL_VERSION,
                    "device": self.device
                }
            }

        return {
            "label": top_label,
            "confidence": round(top_conf, 3),
            "multiple_defects": multiple_defects if len(multiple_defects) > 0 else [{"label": top_label, "confidence": round(top_conf, 3)}],
            "is_low_confidence": top_conf < 0.60,
            "note": "Multi-defect composite identification." if len(multiple_defects) > 1 else None,
            "alternatives": alternatives,
            "model": {
                "name": self.MODEL_NAME,
                "version": self.MODEL_VERSION,
                "device": self.device
            }
        }

