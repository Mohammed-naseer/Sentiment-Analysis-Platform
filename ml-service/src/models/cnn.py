"""
1D Convolutional Neural Network (CNN) for NLP Text Classification.
Architecture:
Input -> Embedding -> Multiple 1D Convolutions (kernel sizes 3, 4, 5) -> ReLU -> MaxPool1d -> Dropout -> Dense Head -> Output
Supports dynamic number of classes (Positive, Negative, Neutral, Mixed, etc.).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Optional, Dict, Any


class TextCNN(nn.Module):
    """
    1D CNN Text Classifier with multi-scale kernels for extracting local n-gram patterns.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        num_classes: int = 3,
        num_filters: int = 100,
        filter_sizes: List[int] = [3, 4, 5],
        dropout: float = 0.5,
        pad_idx: int = 0
    ):
        super(TextCNN, self).__init__()
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.num_classes = num_classes
        self.num_filters = num_filters
        self.filter_sizes = filter_sizes
        self.dropout_rate = dropout
        self.pad_idx = pad_idx

        # Embedding layer
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)

        # Multi-scale 1D Convolutional layers
        self.convs = nn.ModuleList([
            nn.Conv1d(
                in_channels=embed_dim,
                out_channels=num_filters,
                kernel_size=fs
            )
            for fs in filter_sizes
        ])

        # Regularization & Classification Head
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(len(filter_sizes) * num_filters, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: Tensor of shape (batch_size, seq_len) with word indices.
        Returns:
            logits: Tensor of shape (batch_size, num_classes)
        """
        # Embed: (batch_size, seq_len, embed_dim)
        embedded = self.embedding(x)

        # Conv1d expects (batch_size, in_channels, seq_len)
        embedded = embedded.permute(0, 2, 1)

        # Convolve + ReLU + MaxPool over time for each filter size
        pooled_outputs = []
        for conv in self.convs:
            # conv output: (batch_size, num_filters, seq_len - kernel_size + 1)
            conved = F.relu(conv(embedded))
            # max pool over full sequence: (batch_size, num_filters, 1)
            pooled = F.max_pool1d(conved, kernel_size=conved.shape[2]).squeeze(2)
            pooled_outputs.append(pooled)

        # Concatenate multi-scale representations: (batch_size, len(filter_sizes) * num_filters)
        cat = torch.cat(pooled_outputs, dim=1)
        dropped = self.dropout(cat)

        # Output logits
        logits = self.fc(dropped)
        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """Compute Softmax class probabilities."""
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            return F.softmax(logits, dim=1)

    def get_config(self) -> Dict[str, Any]:
        """Return model architecture configuration for checkpoint restoration."""
        return {
            "model_type": "TextCNN",
            "vocab_size": self.vocab_size,
            "embed_dim": self.embed_dim,
            "num_classes": self.num_classes,
            "num_filters": self.num_filters,
            "filter_sizes": self.filter_sizes,
            "dropout": self.dropout_rate,
            "pad_idx": self.pad_idx
        }
