"""
Automated Training Script for Lumina AI Sentiment Models using the uploaded IMDB Dataset.
Location of dataset: datasets/aclImdb_v1/aclImdb/
Trained models: TextCNN and TextLSTM (with Ensemble support)
Artifacts saved to: ml-service/models/
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from typing import List, Tuple

# Fix Windows console encoding if needed
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader

# Ensure ml-service root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from src.preprocessing.nlp_pipeline import clean_text, Vocabulary, LabelEncoder
from src.models.cnn import TextCNN
from src.models.lstm import TextLSTM
from src.training.trainer import TextDataset, train_pytorch_model
from src.evaluation.metrics import evaluate_predictions


def load_imdb_subset(folder_path: str, max_per_class: int = 5000) -> Tuple[List[str], List[str]]:
    """
    Loads reviews and labels from pos and neg folders inside an aclImdb directory.
    """
    texts = []
    labels = []
    
    pos_dir = os.path.join(folder_path, "pos")
    neg_dir = os.path.join(folder_path, "neg")
    
    # Load Positive reviews
    if os.path.exists(pos_dir):
        files = [f for f in os.listdir(pos_dir) if f.endswith(".txt")]
        if max_per_class > 0:
            files = files[:max_per_class]
        print(f"Loading {len(files)} positive reviews from {pos_dir}...")
        for filename in files:
            filepath = os.path.join(pos_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().strip()
                    if content:
                        texts.append(content)
                        labels.append("Positive")
            except Exception as e:
                continue

    # Load Negative reviews
    if os.path.exists(neg_dir):
        files = [f for f in os.listdir(neg_dir) if f.endswith(".txt")]
        if max_per_class > 0:
            files = files[:max_per_class]
        print(f"Loading {len(files)} negative reviews from {neg_dir}...")
        for filename in files:
            filepath = os.path.join(neg_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().strip()
                    if content:
                        texts.append(content)
                        labels.append("Negative")
            except Exception as e:
                continue

    return texts, labels


def main():
    parser = argparse.ArgumentParser(description="Train CNN and LSTM on uploaded IMDB Dataset")
    parser.add_argument("--data_dir", type=str, default="../datasets/aclImdb_v1/aclImdb", help="Path to aclImdb directory")
    parser.add_argument("--output_dir", type=str, default="./models", help="Output directory for model weights & vocab")
    parser.add_argument("--max_train_per_class", type=int, default=5000, help="Max reviews per class for train (0 for all 12,500)")
    parser.add_argument("--max_test_per_class", type=int, default=1500, help="Max reviews per class for test (0 for all 12,500)")
    parser.add_argument("--epochs", type=int, default=8, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=64, help="DataLoader batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--max_vocab", type=int, default=20000, help="Max vocabulary size")
    parser.add_argument("--max_seq_len", type=int, default=128, help="Max sequence length for padding")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu", help="Device (cpu or cuda)")
    args = parser.parse_args()

    print("=================================================================")
    print(">>> LUMINA AI: IMDB DATASET MODEL TRAINING PIPELINE")
    print(f"Dataset Path: {os.path.abspath(args.data_dir)}")
    print(f"Target Output: {os.path.abspath(args.output_dir)}")
    print(f"Device: {args.device}")
    print("=================================================================")

    train_dir = os.path.join(args.data_dir, "train")
    test_dir = os.path.join(args.data_dir, "test")

    if not os.path.exists(train_dir):
        # Check alternative path if aclImdb is directly inside datasets
        alt_path = "../datasets/aclImdb"
        if os.path.exists(alt_path):
            args.data_dir = alt_path
            train_dir = os.path.join(args.data_dir, "train")
            test_dir = os.path.join(args.data_dir, "test")
        else:
            raise FileNotFoundError(f"Could not locate dataset train folder at {train_dir}")

    # 1. Load Data
    print("\n[Step 1/6] Loading IMDB Training Data...")
    train_texts_raw, train_labels_raw = load_imdb_subset(train_dir, max_per_class=args.max_train_per_class)
    print(f"Total training samples loaded: {len(train_texts_raw)}")

    print("\n[Step 2/6] Loading IMDB Test / Validation Data...")
    test_texts_raw, test_labels_raw = load_imdb_subset(test_dir, max_per_class=args.max_test_per_class)
    print(f"Total validation samples loaded: {len(test_texts_raw)}")

    # 2. Text Preprocessing
    print("\n[Step 3/6] Cleaning and Normalizing Text...")
    train_texts = [clean_text(t) for t in train_texts_raw]
    test_texts = [clean_text(t) for t in test_texts_raw]

    # 3. Vocabulary and Label Encoding
    print("\n[Step 4/6] Building Vocabulary & Label Encoder...")
    vocab = Vocabulary(min_freq=2, max_size=args.max_vocab)
    vocab.build_vocab(train_texts)
    print(f"Vocabulary built! Total vocab size: {len(vocab)} words.")

    label_encoder = LabelEncoder()
    label_encoder.fit(train_labels_raw)
    print(f"Classes identified: {label_encoder.classes_}")

    # Convert text to tensor sequences
    train_seqs = vocab.batch_to_sequences(train_texts, max_len=args.max_seq_len)
    train_targets = label_encoder.transform(train_labels_raw)

    test_seqs = vocab.batch_to_sequences(test_texts, max_len=args.max_seq_len)
    test_targets = label_encoder.transform(test_labels_raw)

    train_dataset = TextDataset(train_seqs, train_targets)
    val_dataset = TextDataset(test_seqs, test_targets)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    os.makedirs(args.output_dir, exist_ok=True)
    vocab_file = os.path.join(args.output_dir, "vocab.json")
    labels_file = os.path.join(args.output_dir, "labels.json")
    vocab.save(vocab_file)
    label_encoder.save(labels_file)
    print(f"Saved vocabulary -> {vocab_file}")
    print(f"Saved label encoder -> {labels_file}")

    num_classes = len(label_encoder)
    vocab_size = len(vocab)

    # 4. Train TextCNN
    print("\n" + "=" * 65)
    print("[Step 5/6] Training TextCNN Model...")
    print("=" * 65)
    cnn_model = TextCNN(vocab_size=vocab_size, embed_dim=128, num_classes=num_classes, num_filters=100, filter_sizes=[3, 4, 5], dropout=0.5)
    
    cnn_train_results = train_pytorch_model(
        model=cnn_model,
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=args.epochs,
        lr=args.lr,
        device=args.device,
        patience=3
    )

    cnn_model_path = os.path.join(args.output_dir, "cnn_model.pt")
    torch.save(cnn_train_results["model"].state_dict(), cnn_model_path)
    print(f"TextCNN trained successfully! Best Val Loss: {cnn_train_results['best_val_loss']:.4f} in {cnn_train_results['training_time_seconds']}s")
    print(f"Saved CNN weights -> {cnn_model_path}")

    # Evaluate CNN on validation set
    cnn_model.eval()
    val_seq_tensor = torch.tensor(test_seqs, dtype=torch.long, device=args.device)
    with torch.no_grad():
        cnn_probs = cnn_model.predict_proba(val_seq_tensor).cpu().numpy()
    cnn_preds = np.argmax(cnn_probs, axis=1)
    cnn_metrics = evaluate_predictions(test_targets, cnn_preds, target_names=label_encoder.classes_)
    print(f"\n[METRICS] TextCNN Test Accuracy: {cnn_metrics['accuracy']:.4f} | Macro F1: {cnn_metrics['macro_f1']:.4f}")

    # 5. Train TextLSTM
    print("\n" + "=" * 65)
    print("[Step 6/6] Training TextLSTM (Bidirectional) Model...")
    print("=" * 65)
    lstm_model = TextLSTM(vocab_size=vocab_size, embed_dim=128, hidden_dim=128, num_classes=num_classes, num_layers=2, bidirectional=True, dropout=0.5)
    
    lstm_train_results = train_pytorch_model(
        model=lstm_model,
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=args.epochs,
        lr=args.lr,
        device=args.device,
        patience=3
    )

    lstm_model_path = os.path.join(args.output_dir, "lstm_model.pt")
    torch.save(lstm_train_results["model"].state_dict(), lstm_model_path)
    print(f"TextLSTM trained successfully! Best Val Loss: {lstm_train_results['best_val_loss']:.4f} in {lstm_train_results['training_time_seconds']}s")
    print(f"Saved LSTM weights -> {lstm_model_path}")

    # Evaluate LSTM on validation set
    lstm_model.eval()
    with torch.no_grad():
        lstm_probs = lstm_model.predict_proba(val_seq_tensor).cpu().numpy()
    lstm_preds = np.argmax(lstm_probs, axis=1)
    lstm_metrics = evaluate_predictions(test_targets, lstm_preds, target_names=label_encoder.classes_)
    print(f"\n[METRICS] TextLSTM Test Accuracy: {lstm_metrics['accuracy']:.4f} | Macro F1: {lstm_metrics['macro_f1']:.4f}")

    # 6. Ensemble Evaluation
    print("\n" + "=" * 65)
    print(">>> Model Ensemble Evaluation on Test Set")
    print("=" * 65)
    ensemble_probs = (cnn_probs + lstm_probs) / 2.0
    ensemble_preds = np.argmax(ensemble_probs, axis=1)
    ensemble_metrics = evaluate_predictions(test_targets, ensemble_preds, target_names=label_encoder.classes_)
    print(f"[METRICS] Ensemble Test Accuracy: {ensemble_metrics['accuracy']:.4f} | Macro F1: {ensemble_metrics['macro_f1']:.4f}")

    # Save summary report
    summary = {
        "dataset": "IMDB Large Movie Review Dataset (aclImdb)",
        "train_samples": len(train_texts_raw),
        "test_samples": len(test_texts_raw),
        "vocab_size": vocab_size,
        "classes": label_encoder.classes_,
        "cnn_metrics": {
            "accuracy": cnn_metrics["accuracy"],
            "macro_f1": cnn_metrics["macro_f1"]
        },
        "lstm_metrics": {
            "accuracy": lstm_metrics["accuracy"],
            "macro_f1": lstm_metrics["macro_f1"]
        },
        "ensemble_metrics": {
            "accuracy": ensemble_metrics["accuracy"],
            "macro_f1": ensemble_metrics["macro_f1"]
        }
    }
    summary_path = os.path.join(args.output_dir, "training_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"\nSaved training summary report -> {summary_path}")
    print("\n>>> Training Complete! Models and artifacts are ready to serve.")


if __name__ == "__main__":
    main()
