"""
Emotion and Custom Category Classification.
Supports multi-class and multi-label emotion analysis (Joy, Sadness, Anger, Fear, Love, Surprise, etc.)
and custom business categories (Complaint, Appreciation, Delivery Issue, Product Issue, etc.).
Checks if dataset contains emotion/category labels before training; never fabricates labels.
"""

import os
import json
from typing import List, Dict, Any, Optional, Union
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class EmotionClassifier(nn.Module):
    """
    Neural Classifier for multi-class or multi-label emotion & business categories.
    Can be used with either CNN or BiLSTM text feature representations.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        num_emotions: int = 6,
        is_multilabel: bool = False,
        dropout: float = 0.5,
        pad_idx: int = 0
    ):
        super(EmotionClassifier, self).__init__()
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.num_emotions = num_emotions
        self.is_multilabel = is_multilabel
        self.dropout_rate = dropout
        self.pad_idx = pad_idx

        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)
        self.lstm = nn.LSTM(
            embed_dim,
            hidden_dim,
            num_layers=1,
            bidirectional=True,
            batch_first=True
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * 2, num_emotions)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        embedded = self.dropout(self.embedding(x))
        _, (h_n, _) = self.lstm(embedded)
        # Concatenate forward and backward final hidden states
        hidden = torch.cat((h_n[-2, :, :], h_n[-1, :, :]), dim=1)
        hidden = self.dropout(hidden)
        logits = self.fc(hidden)
        return logits

    def predict_emotions(self, x: torch.Tensor, threshold: float = 0.5) -> torch.Tensor:
        """
        Return probabilities (Sigmoid for multi-label, Softmax for single-label).
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            if self.is_multilabel:
                return torch.sigmoid(logits)
            else:
                return F.softmax(logits, dim=1)

    def get_config(self) -> Dict[str, Any]:
        return {
            "model_type": "EmotionClassifier",
            "vocab_size": self.vocab_size,
            "embed_dim": self.embed_dim,
            "hidden_dim": self.hidden_dim,
            "num_emotions": self.num_emotions,
            "is_multilabel": self.is_multilabel,
            "dropout": self.dropout_rate,
            "pad_idx": self.pad_idx
        }


def check_emotion_dataset(df_or_columns: Union[List[str], Any]) -> Dict[str, Any]:
    """
    Inspects whether the dataset contains emotion or custom category labels.
    If no emotion column is present, returns a clear report requiring labelled data.
    """
    if hasattr(df_or_columns, 'columns'):
        columns = [str(c).lower().strip() for c in df_or_columns.columns]
    else:
        columns = [str(c).lower().strip() for c in df_or_columns]

    candidates = ['emotion', 'emotions', 'mood', 'feeling', 'sentiment_emotion', 'category', 'aspect']
    found = [c for c in candidates if c in columns]

    if not found:
        return {
            "status": "unavailable",
            "message": "Emotion model requires an emotion-labelled training dataset.",
            "supported": False
        }

    return {
        "status": "available",
        "detected_columns": found,
        "message": f"Emotion label column(s) detected: {found}",
        "supported": True
    }
