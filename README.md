# NLP Chatbot (Built From Scratch)

A general-purpose conversational chatbot with a fully from-scratch NLP pipeline implemented in pure Node.js. No external NLP/ML libraries are used.

## Architecture
```
┌────────────┐   HTTP/JSON   ┌──────────────────────────────┐        ┌──────────┐
│ React UI   │ ────────────► │ Express API (port 5000)      │ ─────► │PostgreSQL│
│ (Vite)     │ ◄──────────── │  └─ src/nlp/  (our NLP engine)│        └──────────┘
└────────────┘               └──────────────────────────────┘
```

## Requirements
Run everything inside **WSL / Linux** (not Windows PowerShell over a `\\wsl.localhost\` path).
- Node.js 18+ and npm
- PostgreSQL 14+ (or Docker)

## Quick Start

### Option A: one command
```bash
# Make sure Postgres is running first (if not using Docker):
sudo service postgresql start

./start.sh
```
`start.sh` creates the DB if needed, runs the migration, and starts the backend (5000) and frontend (5173).

### Option B: step by step
```bash
# 1. Database (pick one)
docker compose up -d
#   OR a local Postgres:
sudo service postgresql start
psql -U postgres -h localhost -c "CREATE DATABASE chatbot;"

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run train
npm run evaluate
npm run dev            # http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Important: ports
The backend reads `PORT` from `backend/.env` (default **5000**). The frontend reads
`VITE_API_URL` from `frontend/.env` (default `http://localhost:5000`). Keep them in sync.

If your shell has a global `PORT` variable (e.g. `PORT=3001` from some tooling), the
backend uses `.env` with `override: true`, so `.env` wins — no extra steps needed.

## Features
- Custom tokenizer, Porter stemmer, Damerau-Levenshtein edit distance, spelling correction
- TF-IDF vectorization with unigrams/bigrams/char-grams
- Three classifiers: Naive Bayes, Softmax Regression, kNN
- NER, sentiment analysis, safe math evaluation
- Context-aware dialogue, retrieval QA, follow-up handling
- NLP debug panel and Model Insights page

## Testing
```bash
cd backend && npm test
```

## Troubleshooting
- **"cannot GET /"** on port 5000: that's expected — the backend only serves `/api/*`.
  Open the **frontend** at http://localhost:5173 for the UI.
- **"vite is not recognized"**: you're in Windows PowerShell on a UNC path. Open the
  Ubuntu/WSL terminal and run from `/home/...` instead.
- **Frontend can't reach backend**: confirm the backend is on 5000 and `frontend/.env`
  has `VITE_API_URL=http://localhost:5000`.
