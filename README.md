# Lumina AI - Intelligent Customer Review Analytics Platform

A multi-tiered, enterprise-grade sentiment intelligence and customer voice analytics system. The platform combines parallel LLM consensus (Google Gemini, Groq LLaMA, Hugging Face RoBERTa), custom deep learning neural models (PyTorch 1D-CNN and LSTM), automated tabular dataset profiling, and decision intelligence with an interactive web dashboard.

---

## Architecture Overview

```
Lumina-AI-Platform/
├── Frontend/           # React 19 + TanStack Start (SSR via Nitro & Vite), Tailwind CSS v4, Recharts
├── backend/            # Node.js + Express + TypeScript, MongoDB Atlas / In-Memory DB, Firebase Admin
├── ml-service/         # Python 3.12, FastAPI, PyTorch (CNN, LSTM, RoBERTa, Ensemble Consensus)
└── datasets/           # Benchmark, evaluation, and test datasets
```

### System Components

1. **Frontend (`/Frontend`)**:
   - Built on **React 19** and **TanStack Start** with Vite and Nitro SSR.
   - Interactive features: Real-time Multi-Model Consensus Sandbox, Audio & Voice Emotion Analyzer, Deep Data Profiler with Drag-and-Drop file ingestion, What-If Scenario Simulator, Role-Based Access Control (RBAC) Admin console, and Multi-Format Reports Export (PDF/CSV/Print).
   - Styled with Tailwind CSS v4, Lucide icons, Framer Motion animations, and Recharts.

2. **Backend API (`/backend`)**:
   - Built on **Node.js**, **Express**, and **TypeScript**.
   - Security: Helmet, strict CORS origin filtering, IP rate-limiting, and `express-validator` schema validation.
   - Dual Authentication: Firebase Admin SDK ID token verification with custom HMAC-SHA256 JWT fallback.
   - Parallel Multi-Model Consensus Engine: Queries Google Gemini, Groq, and Hugging Face concurrently, automatically resolving agreements (100%, 66%, 33%) with tie-breakers.
   - Asynchronous Job Processing Pipeline: Handles chunked background processing of bulk datasets (CSV, XLSX, JSON) with real-time status and progress polling.

3. **Machine Learning Microservice (`/ml-service`)**:
   - Built on **Python 3.12**, **FastAPI**, and **PyTorch**.
   - Deep Learning Architectures: 1D-CNN (n-gram feature extraction), Bidirectional LSTM (sequential context), RoBERTa transformer, and a confidence-weighted Ensemble decision layer.
   - **Visual Customer Intelligence Module**: MobileNetV3 transfer learning CNN for product condition & defect classification (`NORMAL`, `PHYSICAL_DAMAGE`, `SCRATCH`, `CRACK`, `BROKEN_COMPONENT`, `PACKAGING_DAMAGE`, `OTHER_ISSUE`, `UNKNOWN`).
   - Image Quality Diagnostics: Evaluates blur (Laplacian variance), contrast, brightness, and resolution constraints.
   - Perceptual & SHA-256 Hashing: Instant duplicate image detection across customer review submissions.
   - Memory-safe chunked batch inference for high-volume tabular datasets.

4. **Database & Persistence**:
   - Primary: **MongoDB Atlas** via Mongoose with connection pooling.
   - Resilience: Automatic development fallback to in-memory MongoDB (`mongodb-memory-server`) if Atlas is unreachable or offline.

---

## Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v22/v24)
- **Python**: 3.10+ (tested on Python 3.12)
- **Git**

---

### 1. Start the Python ML Microservice

```bash
cd ml-service

# Create and activate virtual environment (optional but recommended)
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Start the service
python app.py
```
- The ML Microservice will start at: `http://localhost:8000`
- API documentation (Swagger): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

### 2. Start the Backend API Server

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm run start
# Or for development with hot-reload:
# npm run dev
```
- The Backend server will start at: `http://localhost:5001`
- Health check: `http://localhost:5001/health`

---

### 3. Start the Frontend Application

```bash
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
- The Frontend application will be available at: `http://localhost:8080` (or `http://localhost:5173`)

---

## Default Admin Credentials

When the platform runs with initial seeding or in local fallback mode:

- **Email**: `mohammednaseer22022@gmail.com`
- **Password**: `naseer@7013722022`
- **Role**: `Admin`

---

## Environment Variables Configuration

### Backend (`backend/.env`)
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:8080,http://localhost:5173

# MongoDB Connection
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.qkwtj4r.mongodb.net/sentiment-platform?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Cloud AI Provider Keys
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_API_KEY=your_hf_token

# Python ML Microservice URL
PYTHON_ML_SERVICE_URL=http://localhost:8000
```

### Frontend (`Frontend/.env`)
```env
VITE_API_URL=http://localhost:5001/api
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

---

## Running Automated QA & Tests

The project includes an end-to-end automated test runner covering all 44 critical platform criteria:

```bash
# Run test suite:
node "scratch/qa-test-runner.mjs"
```

### Test Coverage (44/44 Passed - 100%):
- **Environment & Connectivity**: Backend, Python ML service, and Frontend availability checks.
- **Authentication & Security**: Valid logins, rejection of invalid passwords, XSS injection protection in user names, NoSQL injection resistance in auth payloads, and credential privacy verification.
- **Authorization & RBAC**: Unauthenticated endpoint blocking (401), invalid token rejection (401), and Admin role verification.
- **NLP & Sentiment Analysis**: 12 linguistic scenarios (Positive, Negative, Neutral, Mixed, Sarcasm, Spelling errors, Slang, Negation, Edge cases) plus Python DL ensemble predictions.
- **Bulk Data & Mathematical Integrity**: 100-row and 10-row dataset parsing, job status transitions, and mathematical constraint verification ($\text{Pos}\% + \text{Neg}\% + \text{Neu}\% = 100\%$).
- **Dashboard & Analytics**: Aggregation metrics, time series arrays, and background analysis history.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19, TanStack Start, TanStack Router, TanStack Query |
| **Frontend Styling** | Tailwind CSS v4, Framer Motion, Lucide React, Recharts |
| **Backend Runtime** | Node.js, Express, TypeScript |
| **Database** | MongoDB Atlas, Mongoose, mongodb-memory-server (fallback) |
| **Authentication** | Firebase Admin SDK, JWT (HMAC-SHA256) |
| **Cloud AI Models** | Google Gemini (1.5 / 2.0 / Flash), Groq LLaMA-3.3-70b, Hugging Face RoBERTa |
| **Deep Learning ML** | Python 3.12, PyTorch (CNN, LSTM, RoBERTa), FastAPI, Uvicorn |
