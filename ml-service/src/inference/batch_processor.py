"""
Batch and Stream Processor for Large Datasets.
Supports chunked CSV ingestion, memory-safe mini-batch model evaluation,
progress tracking, and aggregated analytics generation.
"""

import os
import time
from typing import Dict, Any, List, Optional, Generator, Callable
import pandas as pd
import numpy as np


class LargeCSVProcessor:
    """
    Memory-efficient CSV processor for large datasets (e.g. 1M+ rows).
    Processes data in configurable chunks and aggregates multi-model predictions.
    """
    def __init__(
        self,
        chunk_size: int = 5000,
        batch_size: int = 64
    ):
        self.chunk_size = chunk_size
        self.batch_size = batch_size

    def process_csv_chunks(
        self,
        filepath: str,
        text_column: str,
        predict_fn: Callable[[List[str]], List[Dict[str, Any]]],
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Process a large CSV file in chunks.
        Args:
            filepath: Path to the CSV file.
            text_column: Name of the text column to analyze.
            predict_fn: Function that takes a batch of raw strings and returns predictions.
            progress_callback: Optional callback for streaming status updates.
        Returns:
            Aggregated analytics summary.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        total_processed = 0
        sentiment_counts: Dict[str, int] = {}
        confidence_sums: Dict[str, float] = {}
        start_time = time.time()

        for chunk_idx, chunk in enumerate(pd.read_csv(filepath, chunksize=self.chunk_size)):
            valid_chunk = chunk.dropna(subset=[text_column])
            texts = valid_chunk[text_column].astype(str).tolist()

            if not texts:
                continue

            # Process in mini-batches
            for i in range(0, len(texts), self.batch_size):
                batch_texts = texts[i : i + self.batch_size]
                batch_results = predict_fn(batch_texts)

                for res in batch_results:
                    sent = res.get("sentiment", "Unknown")
                    conf = res.get("confidence", 0.0)

                    sentiment_counts[sent] = sentiment_counts.get(sent, 0) + 1
                    confidence_sums[sent] = confidence_sums.get(sent, 0.0) + conf
                    total_processed += 1

            if progress_callback:
                progress_callback({
                    "chunk_index": chunk_idx + 1,
                    "processed_so_far": total_processed,
                    "elapsed_time": round(time.time() - start_time, 2)
                })

        # Calculate average confidence per sentiment
        avg_confidence = {
            s: round(confidence_sums[s] / max(sentiment_counts[s], 1), 4)
            for s in sentiment_counts
        }

        # Calculate distribution percentages
        distribution_pct = {
            s: round((count / max(total_processed, 1)) * 100, 2)
            for s, count in sentiment_counts.items()
        }

        return {
            "total_processed": total_processed,
            "sentiment_counts": sentiment_counts,
            "distribution_percentage": distribution_pct,
            "average_confidence": avg_confidence,
            "processing_time_seconds": round(time.time() - start_time, 2),
            "rows_per_second": round(total_processed / max(time.time() - start_time, 0.001), 2)
        }
