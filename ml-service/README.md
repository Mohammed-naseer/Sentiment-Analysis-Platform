# Lumina AI - Dedicated Deep Learning & NLP Microservice

A high-performance Python-based Deep Learning and Natural Language Processing service designed to integrate seamlessly with the existing Node.js + TypeScript backend and React frontend.

## Key Features

1. **1D CNN (Convolutional Neural Network)**: Fast local n-gram sentiment and phrase pattern extractor.
2. **LSTM (Long Short-Term Memory)**: Bidirectional sequential dependency classifier.
3. **RoBERTa (Robustly Optimized BERT Pretraining Approach)**: Deep contextual transformer sequence classifier.
4. **NLP Preprocessing Pipeline**: Contraction expansion, Unicode normalization, negation preservation (`not`, `never`, `no`), vocabulary creation, integer sequence padding, and HuggingFace tokenization.
5. **Emotion & Custom Category Classifier**: Multi-class & multi-label detection for customer support and sentiment domains.
6. **Ensemble Decision Layer**: Majority voting and confidence-weighted consensus with diagnostic disagreement breakdown.
7. **Large CSV Batch Ingestion**: Memory-safe chunked processing for 1M+ rows.
8. **FastAPI Microservice**: High-throughput REST API.

---

## Directory Structure

```
ml-service/
├── app.py                     # FastAPI REST microservice
├── requirements.txt           # Python dependencies
├── .env.example               # Environment configuration
├── README.md                  # Documentation and quickstart
├── data/                      # Training & benchmark datasets
│   └── sample_sentiment_benchmark.csv
├── models/                    # Serialized PyTorch models, tokenizers, vocabularies
├── notebooks/                 # Reproducible Jupyter research notebooks
│   ├── 01_dataset_analysis.ipynb
│   ├── 02_nlp_preprocessing.ipynb
│   ├── 03_cnn_training.ipynb
│   ├── 04_lstm_training.ipynb
│   ├── 05_roberta_finetuning.ipynb
│   ├── 06_model_comparison.ipynb
│   └── 07_ensemble_evaluation.ipynb
└── src/
    ├── preprocessing/         # NLP pipeline, tokenizers, splitters
    ├── models/                # PyTorch CNN, LSTM, RoBERTa, Emotion architectures
    ├── training/              # Training loop, early stopping, PyTorch datasets
    ├── inference/             # Large CSV chunking and batch inference
    ├── evaluation/            # Confusion matrix, F1, accuracy, comparison tables
    └── ensemble/              # Confidence-weighted decision layer
```

---

## Quickstart Setup

### 1. Create and Activate a Python Virtual Environment

```bash
cd ml-service
python -m venv venv

# Windows:
.\venv\Scripts\activate

# Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the FastAPI Server

```bash
python app.py
```
Or with Uvicorn reload:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at: `http://localhost:8000` (Interactive Swagger Docs: `http://localhost:8000/docs`).

---

## API Endpoints

- `GET /health` : Service health, GPU/CPU info, loaded models status.
- `GET /models` : Architectural metadata and configured classes.
- `POST /predict` : Single text sentiment prediction across CNN, LSTM, RoBERTa & Ensemble.
- `POST /predict/batch` : Batch sentiment inference.
- `POST /analyze` : Full diagnostic analysis with individual model scores, agreement %, and emotion analysis.
- `POST /process-csv` : Chunked large CSV processing with real-time throughput metrics.
