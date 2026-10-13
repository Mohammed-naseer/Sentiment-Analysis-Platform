"""
Model Evaluation and Comparison Metrics Module.
Calculates Accuracy, Precision, Recall, Macro/Weighted F1, Confusion Matrix,
and produces comparative performance tables and inference latency benchmarks.
"""

import time
from typing import List, Dict, Any, Optional, Union
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)


def evaluate_predictions(
    y_true: Union[List[int], np.ndarray, List[str]],
    y_pred: Union[List[int], np.ndarray, List[str]],
    labels: Optional[List[str]] = None,
    target_names: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Compute comprehensive classification metrics:
    - Accuracy
    - Precision (macro, weighted, per-class)
    - Recall (macro, weighted, per-class)
    - F1-Score (macro, weighted, per-class)
    - Confusion Matrix
    - Formatted Classification Report
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    accuracy = float(accuracy_score(y_true, y_pred))

    # Macro & Weighted metrics
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average='macro', zero_division=0
    )
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, average='weighted', zero_division=0
    )

    # Per-class metrics
    p_per_class, r_per_class, f1_per_class, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=labels).tolist()

    # Classification report string
    report_dict = classification_report(
        y_true, y_pred, labels=labels, target_names=target_names, output_dict=True, zero_division=0
    )

    per_class_summary = {}
    names = target_names or labels or [str(i) for i in range(len(p_per_class))]
    for i, name in enumerate(names):
        if i < len(p_per_class):
            per_class_summary[str(name)] = {
                "precision": round(float(p_per_class[i]), 4),
                "recall": round(float(r_per_class[i]), 4),
                "f1_score": round(float(f1_per_class[i]), 4),
                "support": int(support[i]) if support is not None and i < len(support) else 0
            }

    return {
        "accuracy": round(accuracy, 4),
        "macro_precision": round(float(p_macro), 4),
        "macro_recall": round(float(r_macro), 4),
        "macro_f1": round(float(f1_macro), 4),
        "weighted_precision": round(float(p_weighted), 4),
        "weighted_recall": round(float(r_weighted), 4),
        "weighted_f1": round(float(f1_weighted), 4),
        "confusion_matrix": cm,
        "labels": [str(l) for l in (labels or target_names or [])],
        "per_class": per_class_summary,
        "report": report_dict
    }


def generate_comparison_table(
    models_evaluation: Dict[str, Dict[str, Any]]
) -> pd.DataFrame:
    """
    Format a comparison table across CNN, LSTM, RoBERTa, and Ensemble models.
    Columns: Model | Accuracy | Precision (Macro) | Recall (Macro) | F1 (Macro) | Weighted F1 | Latency (ms)
    """
    rows = []
    for model_name, metrics in models_evaluation.items():
        rows.append({
            "Model": model_name,
            "Accuracy": f"{metrics.get('accuracy', 0):.4f}",
            "Precision (Macro)": f"{metrics.get('macro_precision', 0):.4f}",
            "Recall (Macro)": f"{metrics.get('macro_recall', 0):.4f}",
            "F1 (Macro)": f"{metrics.get('macro_f1', 0):.4f}",
            "Weighted F1": f"{metrics.get('weighted_f1', 0):.4f}",
            "Avg Latency (ms)": f"{metrics.get('avg_latency_ms', 0):.2f}"
        })
    return pd.DataFrame(rows)
