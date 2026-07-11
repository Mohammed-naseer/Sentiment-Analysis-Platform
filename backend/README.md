# AI Sentiment Analysis Backend v2.0

A production-ready, multi-model sentiment analysis backend using **Node.js**, **Express.js**, **TypeScript**, **MongoDB Atlas**, **Firebase Admin SDK**, and three parallel AI providers: **Google Gemini**, **Groq**, and **Hugging Face**.

---

## Key Features

- 🤖 **Multi-Model AI**: Runs Gemini, Groq, and Hugging Face simultaneously via `Promise.all()`
- 📊 **Smart Comparison**: Majority vote logic with tie-breaking by highest confidence score
- 🗄️ **MongoDB Atlas**: Fully normalized schemas with Mongoose ODM
- 🔐 **Dual Auth**: Firebase ID Token verification + custom JWT fallback
- 🛡️ **Security**: Helmet, CORS, Rate Limiting, Input Validation
- 📈 **Analytics**: Weekly/monthly chart-ready dashboard data
- 🔄 **Developer Mode**: Smart fallback mocks when API keys are missing

---

## Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB Atlas Mongoose connection
│   │   ├── firebase.ts         # Firebase Admin SDK initialization
│   │   ├── gemini.ts           # Google Gemini AI client
│   │   ├── groq.ts             # Groq SDK client
│   │   └── huggingface.ts      # Hugging Face inference configuration
│   ├── controllers/
│   │   ├── authController.ts   # Register, Login, Google Sync, Logout
│   │   ├── sentimentController.ts  # Parallel multi-model analysis
│   │   ├── dashboardController.ts  # Aggregated statistics
│   │   ├── historyController.ts    # Analysis history CRUD
│   │   └── profileController.ts   # User profile management
│   ├── middleware/
│   │   ├── auth.ts             # Token verification + MongoDB sync
│   │   ├── errorHandler.ts     # Global error & 404 handlers
│   │   └── validation.ts       # express-validator rule sets
│   ├── models/
│   │   ├── User.ts             # Mongoose User schema
│   │   └── Analysis.ts         # Mongoose Analysis schema (3-model results)
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── sentimentRoutes.ts
│   │   ├── dashboardRoutes.ts
│   │   ├── historyRoutes.ts
│   │   └── profileRoutes.ts
│   ├── services/
│   │   ├── geminiService.ts    # Gemini sentiment analyzer
│   │   ├── groqService.ts      # Groq sentiment analyzer
│   │   ├── huggingfaceService.ts  # Hugging Face pipeline analyzer
│   │   └── analysisService.ts  # Parallel runner + comparison engine
│   ├── utils/
│   │   ├── response.ts         # Standardized API response helpers
│   │   └── logger.ts           # Timestamped console logger
│   ├── types/
│   │   └── index.d.ts          # Express Request namespace extension
│   ├── app.ts                  # Express setup (CORS, Helmet, Morgan)
│   └── server.ts               # Bootstrap entry (DB → HTTP)
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- Node.js >= 20.x
- MongoDB Atlas account (free tier works)
- Firebase project with Authentication enabled
- Google AI Studio API key (for Gemini)
- Groq API key (free at console.groq.com)
- Hugging Face API key (free at huggingface.co)

---

## Setup & Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy the example file and fill in real values:
```bash
cp .env.example .env
```

Edit `.env`:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

JWT_SECRET=change_this_to_a_random_long_string

# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/ai_sentiment?retryWrites=true&w=majority

# AI Provider Keys
GEMINI_API_KEY=AIzaSy...              # Google AI Studio
GROQ_API_KEY=gsk_...                  # console.groq.com
HUGGINGFACE_API_KEY=hf_...            # huggingface.co/settings/tokens

# Firebase Admin (Project Settings > Service Accounts > Generate new private key)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Run in Development
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Comparison Algorithm

All three models are queried **simultaneously** via `Promise.all()`.

```
Input Text
    │
    ├─→ Gemini ──────────────────┐
    ├─→ Groq ─────────────────── ├→ Comparison Engine
    └─→ HuggingFace ─────────────┘
                                  │
                ┌─────────────────▼────────────────────┐
                │  If all 3 agree     → 100% agreement  │
                │  If 2 agree         → 66% agreement   │
                │  If none agree      → 33%, highest    │
                │                        confidence wins│
                └──────────────────────────────────────┘
```

---

## API Reference

### Base URL
```
http://localhost:5000
```

### Health Check
```http
GET /health
```

---

### Authentication  (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/login` | Authenticate and get JWT |
| `POST` | `/api/auth/google` | Verify Firebase Google ID Token |
| `POST` | `/api/auth/logout` | Sign out session |

**Register Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Google Login Body:**
```json
{
  "idToken": "<firebase_id_token_from_client>"
}
```

---

### Sentiment Analysis (`/api/sentiment`) 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sentiment/analyze` | Run multi-model analysis |

**Request Body:**
```json
{
  "text": "I absolutely love this application."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sentiment analysis complete.",
  "data": {
    "id": "...",
    "text": "I absolutely love this application.",
    "models": {
      "gemini": { "sentiment": "Positive", "confidence": 98, "emotion": "Happy", "summary": "..." },
      "groq": { "sentiment": "Positive", "confidence": 96, "emotion": "Excited", "summary": "..." },
      "huggingface": { "sentiment": "Positive", "confidence": 99, "emotion": "Happy", "summary": "..." }
    },
    "finalResult": {
      "sentiment": "Positive",
      "agreementPercentage": 100,
      "mostConfidentModel": "HuggingFace"
    }
  }
}
```

---

### History (`/api/history`) 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/history` | List all past analyses |
| `DELETE` | `/api/history/:id` | Delete a specific analysis record |

---

### Dashboard (`/api/dashboard`) 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Get aggregated stats and chart data |

**Response includes:**
- `summary`: totalAnalyses, positiveCount, negativeCount, neutralCount, averageConfidence, averageAgreement, mostUsedModel
- `weeklyStatistics`: Last 7 days chart data
- `monthlyStatistics`: Last 30 days chart data
- `agreementDistribution`: Count of 100/66/33% agreements
- `providerMetrics`: Average confidence per AI provider

---

### Profile (`/api/profile`) 🔒

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile` | Get user profile |
| `PUT` | `/api/profile` | Update name and/or photo URL |

🔒 = Requires `Authorization: Bearer <token>` header

---

## MongoDB Collections

### `users`
```
{ _id, name, email, firebaseUid, photoURL, createdAt }
```

### `analyses`
```
{
  _id, userId, text,
  gemini: { sentiment, confidence, emotion, summary },
  groq: { sentiment, confidence, emotion, summary },
  huggingface: { sentiment, confidence, emotion, summary },
  finalSentiment, agreementPercentage, mostConfidentModel,
  createdAt
}
```

---

## Deployment on Render

1. **Create a Web Service** on [render.com](https://render.com) and link your Git repository.
2. **Settings:**
   - Environment: `Node`
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
3. **Environment Variables:** Add all keys from `.env.example` directly in the Render dashboard.
4. **MongoDB Atlas:** Whitelist `0.0.0.0/0` in Network Access to allow Render's dynamic IPs.

---

## Connecting to the React Frontend

In your React frontend, set the API base URL:
```typescript
// In your Vite frontend environment file (.env)
VITE_API_URL=http://localhost:5000

// Or for production:
VITE_API_URL=https://your-render-app.onrender.com
```

Every protected API call should pass the Firebase token in the `Authorization` header:
```typescript
const token = await firebase.auth().currentUser?.getIdToken();

const response = await fetch(`${VITE_API_URL}/api/sentiment/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ text: userInput })
});
```
