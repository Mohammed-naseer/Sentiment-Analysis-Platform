"""
LSTM (Long Short-Term Memory) Neural Network for Sentiment and Sequence Classification.
Architecture:
Input -> Embedding -> Bidirectional/Stacked LSTM -> Dropout -> Dense Head -> Output
Captures long-range sequential dependencies and context transitions.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Optional, Dict, Any


class TextLSTM(nn.Module):
    """
    Bidirectional or Stacked LSTM text classifier with configurable depth and dropout.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 128,
        num_classes: int = 3,
        num_layers: int = 2,
        bidirectional: bool = True,
        dropout: float = 0.5,
        pad_idx: int = 0
    ):
        super(TextLSTM, self).__init__()
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.num_classes = num_classes
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.dropout_rate = dropout
        self.pad_idx = pad_idx

        # Embedding layer
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)

        # LSTM Layer
        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            bidirectional=bidirectional,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )

        # Output Dimension multiplier for Bidirectional
        num_directions = 2 if bidirectional else 1

        # Regularization & Classification Head
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_dim * num_directions, hidden_dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_dim, num_classes)

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
        embedded = self.dropout(embedded)

        # LSTM output: (batch_size, seq_len, hidden_dim * num_directions)
        # hidden state h_n: (num_layers * num_directions, batch_size, hidden_dim)
        lstm_out, (h_n, c_n) = self.lstm(embedded)

        if self.bidirectional:
            # Concatenate the final forward and backward hidden states
            # h_n shape: (num_layers * 2, batch_size, hidden_dim)
            h_forward = h_n[-2, :, :]
            h_backward = h_n[-1, :, :]
            hidden = torch.cat((h_forward, h_backward), dim=1)
        else:
            hidden = h_n[-1, :, :]

        # Dense Head with Dropout
        out = self.dropout(hidden)
        out = self.relu(self.fc1(out))
        out = self.dropout(out)
        logits = self.fc2(out)
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
            "model_type": "TextLSTM",
            "vocab_size": self.vocab_size,
            "embed_dim": self.embed_dim,
            "hidden_dim": self.hidden_dim,
            "num_classes": self.num_classes,
            "num_layers": self.num_layers,
            "bidirectional": self.bidirectional,
            "dropout": self.dropout_rate,
            "pad_idx": self.pad_idx
        }
