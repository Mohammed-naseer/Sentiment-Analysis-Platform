"""
Training and Optimization Pipeline for CNN, LSTM, and RoBERTa Models.
Includes Early Stopping, Learning Rate Scheduling, Gradient Clipping,
and Checkpoint Serialization.
"""

import os
import time
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import f1_score


class TextDataset(Dataset):
    """PyTorch Dataset wrapper for sequence tensors and labels."""
    def __init__(self, sequences: np.ndarray, labels: np.ndarray):
        self.sequences = torch.tensor(sequences, dtype=torch.long)
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.labels[idx]


class EarlyStopping:
    """Early stops the training if validation loss doesn't improve after a given patience."""
    def __init__(self, patience: int = 4, min_delta: float = 1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = float('inf')
        self.early_stop = False
        self.best_state_dict = None

    def __call__(self, val_loss: float, model: nn.Module) -> bool:
        if val_loss < (self.best_loss - self.min_delta):
            self.best_loss = val_loss
            self.counter = 0
            self.best_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        return self.early_stop


def train_pytorch_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    num_epochs: int = 15,
    lr: float = 1e-3,
    weight_decay: float = 1e-4,
    patience: int = 4,
    clip_grad: float = 5.0,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Standard PyTorch training loop for CNN and LSTM models.
    """
    model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2)
    early_stopping = EarlyStopping(patience=patience)

    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "val_f1": []
    }

    start_time = time.time()

    for epoch in range(1, num_epochs + 1):
        # Training Phase
        model.train()
        total_train_loss = 0.0
        correct_train = 0
        total_train_samples = 0

        for seqs, targets in train_loader:
            seqs, targets = seqs.to(device), targets.to(device)
            optimizer.zero_grad()
            logits = model(seqs)
            loss = criterion(logits, targets)
            loss.backward()

            if clip_grad > 0:
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=clip_grad)

            optimizer.step()

            total_train_loss += loss.item() * seqs.size(0)
            preds = torch.argmax(logits, dim=1)
            correct_train += (preds == targets).sum().item()
            total_train_samples += seqs.size(0)

        epoch_train_loss = total_train_loss / max(total_train_samples, 1)
        epoch_train_acc = correct_train / max(total_train_samples, 1)

        # Validation Phase
        model.eval()
        total_val_loss = 0.0
        correct_val = 0
        total_val_samples = 0
        all_val_preds = []
        all_val_targets = []

        with torch.no_grad():
            for seqs, targets in val_loader:
                seqs, targets = seqs.to(device), targets.to(device)
                logits = model(seqs)
                loss = criterion(logits, targets)

                total_val_loss += loss.item() * seqs.size(0)
                preds = torch.argmax(logits, dim=1)
                correct_val += (preds == targets).sum().item()
                total_val_samples += seqs.size(0)

                all_val_preds.extend(preds.cpu().numpy())
                all_val_targets.extend(targets.cpu().numpy())

        epoch_val_loss = total_val_loss / max(total_val_samples, 1)
        epoch_val_acc = correct_val / max(total_val_samples, 1)
        epoch_val_f1 = float(f1_score(all_val_targets, all_val_preds, average='macro', zero_division=0))

        scheduler.step(epoch_val_loss)

        history["train_loss"].append(round(epoch_train_loss, 4))
        history["train_acc"].append(round(epoch_train_acc, 4))
        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_acc"].append(round(epoch_val_acc, 4))
        history["val_f1"].append(round(epoch_val_f1, 4))

        if early_stopping(epoch_val_loss, model):
            print(f"Early stopping triggered at epoch {epoch}")
            break

    # Restore best checkpoint
    if early_stopping.best_state_dict is not None:
        model.load_state_dict(early_stopping.best_state_dict)

    training_time = round(time.time() - start_time, 2)

    return {
        "model": model,
        "history": history,
        "best_val_loss": early_stopping.best_loss,
        "training_time_seconds": training_time
    }
