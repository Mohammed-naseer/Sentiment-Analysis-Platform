"""
Ensemble and Multi-Model Decision Layer.
Combines predictions from CNN, LSTM, and RoBERTa models using:
1. Majority Voting
2. Confidence-Weighted Soft Voting
Includes diagnostic reasoning for model agreements and disagreements.
"""

from typing import List, Dict, Any, Optional
import numpy as np


class DecisionLayer:
    """
    Ensemble decision layer that combines multi-model predictions
    and details disagreements without assuming automatic superiority.
    """
    def __init__(
        self,
        strategy: str = "confidence_weighted",
        weights: Optional[Dict[str, float]] = None
    ):
        """
        Args:
            strategy: 'confidence_weighted' or 'majority_voting'
            weights: Optional custom weights for each model, e.g. {'cnn': 1.0, 'lstm': 1.0, 'roberta': 1.5}
        """
        self.strategy = strategy
        self.weights = weights or {"cnn": 1.0, "lstm": 1.0, "roberta": 1.2}

    def combine(
        self,
        predictions: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Combine individual model prediction dictionaries:
        predictions = {
            "cnn": {"label": "Positive", "confidence": 0.85, "probabilities": {"Positive": 0.85, "Negative": 0.1, ...}},
            "lstm": {"label": "Positive", "confidence": 0.78, "probabilities": {...}},
            "roberta": {"label": "Neutral", "confidence": 0.62, "probabilities": {...}}
        }
        """
        available_models = [m for m, p in predictions.items() if p and "label" in p]
        if not available_models:
            return {
                "sentiment": "Unknown",
                "confidence": 0.0,
                "strategy": self.strategy,
                "agreement_percentage": 0,
                "is_unanimous": False,
                "disagreement_reason": "No valid model predictions provided."
            }

        labels = [predictions[m]["label"] for m in available_models]
        confidences = [predictions[m]["confidence"] for m in available_models]

        # Check agreement
        unique_labels = list(set(labels))
        is_unanimous = len(unique_labels) == 1

        # Calculate agreement percentage
        most_common_count = max(labels.count(lbl) for lbl in unique_labels)
        agreement_percentage = round((most_common_count / len(available_models)) * 100, 1)

        # 1. Majority Voting
        if self.strategy == "majority_voting":
            from collections import Counter
            counts = Counter(labels)
            top_label, top_count = counts.most_common(1)[0]

            # If there's a tie, fall back to highest confidence model
            if list(counts.values()).count(top_count) > 1:
                best_model = max(available_models, key=lambda m: predictions[m]["confidence"])
                final_label = predictions[best_model]["label"]
                final_confidence = predictions[best_model]["confidence"]
                disagreement_reason = f"Vote tied across labels. Selected highest-confidence prediction from {best_model}."
            else:
                final_label = top_label
                # Average confidence among winning models
                winning_confs = [predictions[m]["confidence"] for m in available_models if predictions[m]["label"] == top_label]
                final_confidence = float(np.mean(winning_confs))
                disagreement_reason = "" if is_unanimous else f"Majority vote ({top_count}/{len(available_models)}) selected {top_label}."

        # 2. Confidence-Weighted Soft Voting (Default)
        else:
            # Aggregate weighted probabilities if probability distributions are available
            all_classes = set()
            for m in available_models:
                if "probabilities" in predictions[m]:
                    all_classes.update(predictions[m]["probabilities"].keys())

            if all_classes:
                weighted_scores: Dict[str, float] = {c: 0.0 for c in all_classes}
                total_weight = 0.0

                for m in available_models:
                    w = self.weights.get(m, 1.0)
                    total_weight += w
                    probs = predictions[m].get("probabilities", {})
                    for c in all_classes:
                        weighted_scores[c] += probs.get(c, 0.0) * w

                for c in weighted_scores:
                    weighted_scores[c] /= max(total_weight, 1e-6)

                final_label = max(weighted_scores, key=weighted_scores.get)
                final_confidence = float(weighted_scores[final_label])
            else:
                # Fallback to model-confidence weighting by discrete votes
                score_by_label: Dict[str, float] = {}
                for m in available_models:
                    w = self.weights.get(m, 1.0)
                    lbl = predictions[m]["label"]
                    conf = predictions[m]["confidence"]
                    score_by_label[lbl] = score_by_label.get(lbl, 0.0) + (conf * w)

                final_label = max(score_by_label, key=score_by_label.get)
                final_confidence = float(np.mean([predictions[m]["confidence"] for m in available_models if predictions[m]["label"] == final_label]))

            if is_unanimous:
                disagreement_reason = "All models unanimously agree."
            else:
                disagreeing = [f"{m}: {predictions[m]['label']} ({predictions[m]['confidence']:.2f})" for m in available_models]
                disagreement_reason = f"Models diverged: {', '.join(disagreeing)}. Confidence-weighted consensus: {final_label}."

        return {
            "sentiment": final_label,
            "confidence": round(final_confidence, 4),
            "strategy": self.strategy,
            "agreement_percentage": agreement_percentage,
            "is_unanimous": is_unanimous,
            "disagreement_reason": disagreement_reason,
            "models_participating": available_models
        }
