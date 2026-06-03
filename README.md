# ResumeAI Pro v2 🚀

AI-powered resume builder using **100% FREE AI APIs** — no credit card needed.

| Provider     | Free Tier                  | Get Key |
|--------------|----------------------------|---------|
| **Groq**     | 14,400 req/day (very fast) | https://console.groq.com |
| **Gemini**   | 1,500 req/day              | https://aistudio.google.com/apikey |

---

## Quick Start (3 steps)

### Step 1 — Get your free API keys

**Groq** (recommended — fastest):
1. Go to https://console.groq.com
2. Sign up free → **API Keys → Create API Key**
3. Copy the key (starts with `gsk_`)

**Gemini** (optional — used as fallback):
1. Go to https://aistudio.google.com/apikey
2. Sign in with Google → **Create API key**
3. Copy the key (starts with `AIza`)

---

### Step 2 — Add your keys

```bash
cd resumeai-pro/backend
cp .env.example .env
```

Open `backend/.env`:

```
# ★ Paste your keys here ★

GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

PREFERRED_PROVIDER=auto
PORT=8000
```

---

### Step 3 — Run the app

**Terminal 1 — Python backend:**
```bash
cd resumeai-pro/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd resumeai-pro
npm install
node server.js
```

Open **http://localhost:3000** ✅

---

## Where are the API keys?

```
resumeai-pro/
└── backend/
    └── .env              ← ★ YOUR KEYS GO HERE (create from .env.example)
        ├── GROQ_API_KEY=gsk_...      ← Line 7
        └── GEMINI_API_KEY=AIza...    ← Line 11
```

---

## How the free providers work

```
Your browser → Python backend (port 8000) → Groq (primary)
                                           ↘ Gemini (auto-fallback if Groq fails)
```

- **Groq** is used by default — it's the fastest free option
- **Gemini** kicks in automatically if Groq hits a rate limit or error
- You only need ONE key to run the app

---

## Verify backend is running

Open http://localhost:8000/health — you should see:

```json
{
  "status": "ok",
  "free_providers": { "groq": true, "gemini": true }
}
```

---

## Project Structure

```
resumeai-pro/
├── backend/
│   ├── main.py           ← FastAPI routes
│   ├── agents.py         ← AI engine (Groq + Gemini)
│   ├── requirements.txt
│   └── .env.example      ← ★ copy to .env and add keys
├── frontend/
│   ├── index.html        ← Login page
│   ├── dashboard.html    ← Main app
│   ├── ai-engine.js      ← AI calls (points to Python backend)
│   └── ...
├── server.js             ← Serves frontend on port 3000
└── package.json
```
