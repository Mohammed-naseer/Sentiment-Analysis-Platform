import os
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Any, Optional, Union

try:
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class RoBERTaClassifier:
    """
    Wrapper for fine-tuning and running inference with pre-trained RoBERTa.
    Supports dynamic number of classes and device placement (CPU/CUDA).
    """
    def __init__(
        self,
        model_name_or_path: str = "roberta-base",
        num_classes: int = 3,
        id2label: Optional[Dict[int, str]] = None,
        label2id: Optional[Dict[str, int]] = None,
        device: Optional[str] = None
    ):
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "transformers package is not installed. Please run: pip install transformers"
            )

        self.model_name_or_path = model_name_or_path
        self.num_classes = num_classes
        self.id2label = id2label or {i: f"CLASS_{i}" for i in range(num_classes)}
        self.label2id = label2id or {f"CLASS_{i}": i for i in range(num_classes)}
        
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load pretrained tokenizer and model with classification head."""
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name_or_path)
        
        config = AutoConfig.from_pretrained(
            self.model_name_or_path,
            num_labels=self.num_classes,
            id2label={int(k): str(v) for k, v in self.id2label.items()},
            label2id={str(k): int(v) for k, v in self.label2id.items()}
        )
        
        # If loading from local checkpoint vs base pretrained
        if os.path.isdir(self.model_name_or_path):
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name_or_path,
                config=config
            )
        else:
            # When fine-tuning a base model on custom classes
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name_or_path,
                config=config,
                ignore_mismatched_sizes=True
            )
            
        self.model.to(self.device)

    def tokenize(self, texts: Union[str, List[str]], max_length: int = 128) -> Dict[str, torch.Tensor]:
        """Tokenize single text or list of texts."""
        if isinstance(texts, str):
            texts = [texts]
        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt"
        )
        return {k: v.to(self.device) for k, v in encoded.items()}

    def predict_proba(self, texts: Union[str, List[str]], max_length: int = 128) -> torch.Tensor:
        """Compute Softmax probabilities for text inputs."""
        self.model.eval()
        inputs = self.tokenize(texts, max_length=max_length)
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = F.softmax(logits, dim=1)
            return probs

    def predict(self, texts: Union[str, List[str]], max_length: int = 128) -> Any:
        """
        Run inference on texts and return predicted class and confidence.
        """
        if isinstance(texts, str):
            single_input = True
            texts = [texts]
        else:
            single_input = False

        probs = self.predict_proba(texts, max_length=max_length).cpu().numpy()
        results = []

        for prob in probs:
            top_idx = int(np.argmax(prob))
            top_label = self.id2label.get(top_idx, str(top_idx))
            confidence = float(prob[top_idx])
            
            all_scores = {
                self.id2label.get(i, str(i)): float(score)
                for i, score in enumerate(prob)
            }

            results.append({
                "label": top_label,
                "confidence": confidence,
                "probabilities": all_scores
            })

        return results[0] if single_input else results

    def save(self, save_directory: str):
        """Save fine-tuned model weights and tokenizer."""
        os.makedirs(save_directory, exist_ok=True)
        self.model.save_pretrained(save_directory)
        self.tokenizer.save_pretrained(save_directory)

    @classmethod
    def load(cls, save_directory: str, device: Optional[str] = None) -> "RoBERTaClassifier":
        """Load saved fine-tuned model checkpoint."""
        return cls(model_name_or_path=save_directory, device=device)
