"""
NLP Preprocessing Pipeline for CNN, LSTM, and RoBERTa models.
Implements text cleaning, negation preservation, tokenization, vocabulary mapping,
dataset validation, label encoding, and dataset splitting.
"""

import re
import unicodedata
import json
from typing import List, Dict, Tuple, Optional, Any, Union
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


# Negation words to preserve
NEGATION_WORDS = {
    "not", "no", "never", "none", "neither", "nor", "nowhere", "hardly",
    "scarcely", "barely", "doesn't", "don't", "isn't", "aren't", "wasn't",
    "weren't", "haven't", "hasn't", "hadn't", "won't", "wouldn't", "can't",
    "cannot", "couldn't", "shouldn't", "mustn't", "ain't"
}

# Common English Contractions Map
CONTRACTIONS_MAP = {
    "ain't": "am not", "aren't": "are not", "can't": "cannot", "can't've": "cannot have",
    "'cause": "because", "could've": "could have", "couldn't": "could not",
    "didn't": "did not", "doesn't": "does not", "don't": "do not", "hadn't": "had not",
    "hasn't": "has not", "haven't": "have not", "he'd": "he would", "he'll": "he will",
    "he's": "he is", "how'd": "how did", "how'll": "how will", "how's": "how is",
    "i'd": "i would", "i'll": "i will", "i'm": "i am", "i've": "i have",
    "isn't": "is not", "it'd": "it would", "it'll": "it will", "it's": "it is",
    "let's": "let us", "might've": "might have", "mightn't": "might not",
    "must've": "must have", "mustn't": "must not", "shan't": "shall not",
    "she'd": "she would", "she'll": "she will", "she's": "she is",
    "should've": "should have", "shouldn't": "should not", "that's": "that is",
    "there's": "there is", "they'd": "they would", "they'll": "they will",
    "they're": "they are", "they've": "they have", "wasn't": "was not",
    "we'd": "we would", "we'll": "we will", "we're": "we are", "we've": "we have",
    "weren't": "were not", "what'll": "what will", "what're": "what are",
    "what's": "what is", "what've": "what have", "when's": "when is",
    "where'd": "where did", "where's": "where is", "where've": "where have",
    "who'll": "who will", "who's": "who is", "who've": "who have",
    "won't": "will not", "would've": "would have", "wouldn't": "would not",
    "you'd": "you would", "you'll": "you will", "you're": "you are", "you've": "you have"
}


def normalize_unicode(text: str) -> str:
    """Normalize unicode characters (NFKD)."""
    if not isinstance(text, str):
        return ""
    return unicodedata.normalize('NFKD', text)


def expand_contractions(text: str) -> str:
    """Expand common English contractions while preserving semantic meaning."""
    pattern = re.compile(r'\b(' + '|'.join(re.escape(k) for k in CONTRACTIONS_MAP.keys()) + r')\b', flags=re.IGNORECASE)
    def replace(match):
        return CONTRACTIONS_MAP.get(match.group(0).lower(), match.group(0))
    return pattern.sub(replace, text)


def clean_text(text: str) -> str:
    """
    Clean text for deep learning models:
    - Normalizes unicode
    - Expands contractions
    - Strips URLs, HTML tags, emails, special noise
    - Converts to lowercase
    - Preserves negation words and necessary punctuation patterns
    """
    if not isinstance(text, str):
        return ""

    text = normalize_unicode(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    # Remove emails
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', ' ', text)
    # Expand contractions
    text = expand_contractions(text)
    # Keep alphanumeric characters, spaces, and basic sentiment punctuation
    text = re.sub(r'[^a-zA-Z0-9\s!?\']', ' ', text)
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()


class Vocabulary:
    """
    Vocabulary builder and token-to-integer mapper for CNN and LSTM models.
    Supports <PAD> and <UNK> special tokens.
    """
    def __init__(self, min_freq: int = 1, max_size: Optional[int] = 30000):
        self.min_freq = min_freq
        self.max_size = max_size
        self.PAD_TOKEN = "<PAD>"
        self.UNK_TOKEN = "<UNK>"
        self.word2idx: Dict[str, int] = {self.PAD_TOKEN: 0, self.UNK_TOKEN: 1}
        self.idx2word: Dict[int, str] = {0: self.PAD_TOKEN, 1: self.UNK_TOKEN}
        self.word_counts: Dict[str, int] = {}
        self.is_built: bool = False

    def build_vocab(self, texts: List[str]):
        """Build vocabulary from a list of cleaned text strings."""
        for text in texts:
            tokens = text.split()
            for token in tokens:
                self.word_counts[token] = self.word_counts.get(token, 0) + 1

        # Sort words by frequency
        sorted_words = sorted(self.word_counts.items(), key=lambda x: x[1], reverse=True)
        
        idx = 2
        for word, count in sorted_words:
            if count >= self.min_freq:
                if self.max_size and idx >= self.max_size:
                    break
                self.word2idx[word] = idx
                self.idx2word[idx] = word
                idx += 1

        self.is_built = True

    def text_to_sequence(self, text: str, max_len: int = 128) -> List[int]:
        """Convert a text string to a padded/truncated integer sequence."""
        tokens = text.split()
        seq = [self.word2idx.get(tok, self.word2idx[self.UNK_TOKEN]) for tok in tokens]
        
        # Truncate
        if len(seq) > max_len:
            seq = seq[:max_len]
        # Pad
        else:
            seq = seq + [self.word2idx[self.PAD_TOKEN]] * (max_len - len(seq))
            
        return seq

    def batch_to_sequences(self, texts: List[str], max_len: int = 128) -> np.ndarray:
        """Convert a list of texts to a 2D numpy array of integer sequences."""
        return np.array([self.text_to_sequence(t, max_len) for t in texts], dtype=np.int64)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize vocabulary to dictionary."""
        return {
            "min_freq": self.min_freq,
            "max_size": self.max_size,
            "word2idx": self.word2idx,
            "word_counts": self.word_counts
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Vocabulary":
        """Deserialize vocabulary from dictionary."""
        vocab = cls(min_freq=data["min_freq"], max_size=data["max_size"])
        vocab.word2idx = data["word2idx"]
        vocab.idx2word = {int(v): k for k, v in data["word2idx"].items()}
        vocab.word_counts = data.get("word_counts", {})
        vocab.is_built = True
        return vocab

    def save(self, filepath: str):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "Vocabulary":
        with open(filepath, 'r', encoding='utf-8') as f:
            return cls.from_dict(json.load(f))

    def __len__(self) -> int:
        return len(self.word2idx)


class LabelEncoder:
    """
    Robust Label Encoder for arbitrary classification categories
    (Positive, Negative, Neutral, Mixed, or custom emotion/business categories).
    """
    def __init__(self):
        self.label2idx: Dict[str, int] = {}
        self.idx2label: Dict[int, str] = {}
        self.classes_: List[str] = []

    def fit(self, labels: List[Any]) -> "LabelEncoder":
        """Fit label encoder on a list of labels."""
        unique_labels = sorted(list(set(str(l).strip().capitalize() for l in labels if pd.notna(l))))
        self.classes_ = unique_labels
        self.label2idx = {lbl: idx for idx, lbl in enumerate(unique_labels)}
        self.idx2label = {idx: lbl for idx, lbl in enumerate(unique_labels)}
        return self

    def transform(self, labels: List[Any]) -> np.ndarray:
        """Transform labels to integers."""
        return np.array([self.label2idx[str(l).strip().capitalize()] for l in labels], dtype=np.int64)

    def fit_transform(self, labels: List[Any]) -> np.ndarray:
        return self.fit(labels).transform(labels)

    def inverse_transform(self, indices: Union[List[int], np.ndarray]) -> List[str]:
        """Convert integer predictions back to string labels."""
        return [self.idx2label.get(int(idx), "Unknown") for idx in indices]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "classes": self.classes_,
            "label2idx": self.label2idx
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LabelEncoder":
        le = cls()
        le.classes_ = data["classes"]
        le.label2idx = data["label2idx"]
        le.idx2label = {int(v): k for k, v in data["label2idx"].items()}
        return le

    def save(self, filepath: str):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "LabelEncoder":
        with open(filepath, 'r', encoding='utf-8') as f:
            return cls.from_dict(json.load(f))

    def __len__(self) -> int:
        return len(self.classes_)


class DatasetValidator:
    """
    Validates CSV datasets, detects text/label columns, reports distributions,
    detects anomalies/empty records, and provides stratified dataset splits.
    """
    TEXT_CANDIDATES = ['text', 'review', 'review_text', 'content', 'comment', 'feedback', 'message', 'sentence']
    LABEL_CANDIDATES = ['label', 'sentiment', 'target', 'class', 'rating_label', 'category']
    EMOTION_CANDIDATES = ['emotion', 'emotions', 'mood', 'feeling']

    @classmethod
    def auto_detect_columns(cls, df: pd.DataFrame) -> Dict[str, Optional[str]]:
        """Automatically detect text, label, and emotion columns from DataFrame."""
        cols_lower = {col.lower().strip(): col for col in df.columns}
        
        text_col = next((cols_lower[c] for c in cls.TEXT_CANDIDATES if c in cols_lower), None)
        label_col = next((cols_lower[c] for c in cls.LABEL_CANDIDATES if c in cols_lower), None)
        emotion_col = next((cols_lower[c] for c in cls.EMOTION_CANDIDATES if c in cols_lower), None)

        # Fallback heuristic: pick first object/string column as text if not found
        if not text_col:
            for col in df.columns:
                if df[col].dtype == object or df[col].dtype == 'string':
                    text_col = col
                    break

        return {
            "text_column": text_col,
            "label_column": label_col,
            "emotion_column": emotion_col
        }

    @classmethod
    def validate_and_profile(cls, df: pd.DataFrame, text_col: Optional[str] = None, label_col: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate dataset and return a comprehensive profile.
        Checks missing values, duplicates, class distribution, text lengths, and validity.
        """
        detected = cls.auto_detect_columns(df)
        text_col = text_col or detected["text_column"]
        label_col = label_col or detected["label_column"]
        emotion_col = detected["emotion_column"]

        if not text_col:
            raise ValueError("Could not find or identify a valid text column in the dataset.")

        total_rows = len(df)
        missing_text_count = int(df[text_col].isna().sum())
        duplicate_count = int(df.duplicated(subset=[text_col]).sum())

        # Clean non-null text for stats
        valid_texts = df[text_col].dropna().astype(str)
        text_lengths = valid_texts.apply(lambda x: len(x.split()))
        avg_text_length = float(text_lengths.mean()) if len(text_lengths) > 0 else 0.0
        max_text_length = int(text_lengths.max()) if len(text_lengths) > 0 else 0
        min_text_length = int(text_lengths.min()) if len(text_lengths) > 0 else 0

        class_distribution: Dict[str, int] = {}
        num_classes = 0
        if label_col and label_col in df.columns:
            cleaned_labels = df[label_col].dropna().astype(str).str.strip().str.capitalize()
            class_distribution = cleaned_labels.value_counts().to_dict()
            num_classes = len(class_distribution)

        emotion_distribution: Dict[str, int] = {}
        has_emotion = False
        if emotion_col and emotion_col in df.columns:
            has_emotion = True
            cleaned_emotions = df[emotion_col].dropna().astype(str).str.strip().str.capitalize()
            emotion_distribution = cleaned_emotions.value_counts().to_dict()

        return {
            "total_rows": total_rows,
            "text_column": text_col,
            "label_column": label_col,
            "emotion_column": emotion_col,
            "has_emotion_labels": has_emotion,
            "missing_text_count": missing_text_count,
            "duplicate_count": duplicate_count,
            "avg_text_length": round(avg_text_length, 2),
            "min_text_length": min_text_length,
            "max_text_length": max_text_length,
            "num_classes": num_classes,
            "class_distribution": class_distribution,
            "emotion_distribution": emotion_distribution,
            "is_valid_for_training": (label_col is not None and num_classes >= 2 and (total_rows - missing_text_count) >= 10)
        }

    @classmethod
    def prepare_splits(
        cls,
        df: pd.DataFrame,
        text_col: str,
        label_col: str,
        test_size: float = 0.15,
        val_size: float = 0.15,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Clean data, drop missing/empty records, and perform stratified train/val/test split.
        Prevents data leakage.
        """
        # Filter valid records
        clean_df = df.dropna(subset=[text_col, label_col]).copy()
        clean_df = clean_df[clean_df[text_col].astype(str).str.strip().str.len() > 0]
        clean_df[label_col] = clean_df[label_col].astype(str).str.strip().str.capitalize()
        
        # Clean text
        clean_df['clean_text'] = clean_df[text_col].apply(clean_text)
        clean_df = clean_df[clean_df['clean_text'].str.len() > 0]

        # Stratified train vs temp (val + test)
        temp_size = test_size + val_size
        train_df, temp_df = train_test_split(
            clean_df,
            test_size=temp_size,
            random_state=random_state,
            stratify=clean_df[label_col] if clean_df[label_col].nunique() > 1 else None
        )

        # Split temp into validation and test sets
        relative_test_size = test_size / temp_size
        val_df, test_df = train_test_split(
            temp_df,
            test_size=relative_test_size,
            random_state=random_state,
            stratify=temp_df[label_col] if temp_df[label_col].nunique() > 1 else None
        )

        return train_df.reset_index(drop=True), val_df.reset_index(drop=True), test_df.reset_index(drop=True)
