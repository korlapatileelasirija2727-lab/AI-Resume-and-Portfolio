# ============================================================
#  ResumeAI Pro — Python FastAPI Backend
#  FREE AI providers: Groq + Google Gemini
#  Run: uvicorn main:app --reload --port 8000
# ============================================================

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from agents import ResumeAgent

load_dotenv()

app = FastAPI(title="ResumeAI Pro API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "free_providers": {
            "groq":   bool(os.getenv("GROQ_API_KEY")),
            "gemini": bool(os.getenv("GEMINI_API_KEY")),
        },
        "note": "Add keys to backend/.env to enable providers"
    }

# ── Drop-in proxy — keeps all existing frontend calls working ─
@app.post("/api/anthropic")
async def ai_proxy(request: Request):
    body = await request.json()
    try:
        agent = ResumeAgent()
        result = await agent.chat(
            messages=body.get("messages", []),
            system=body.get("system", ""),
            max_tokens=body.get("max_tokens", 1000),
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

# ── Agentic endpoints ─────────────────────────────────────────
@app.post("/api/agent/resume")
async def generate_resume(request: Request):
    body = await request.json()
    agent = ResumeAgent()
    return await agent.generate_resume(body)

@app.post("/api/agent/review")
async def review_resume(request: Request):
    body = await request.json()
    agent = ResumeAgent()
    return await agent.review_resume(
        body.get("resume_text", ""), body.get("job_target", ""))

@app.post("/api/agent/skills")
async def suggest_skills(request: Request):
    body = await request.json()
    agent = ResumeAgent()
    return await agent.suggest_skills(
        body.get("role", ""), body.get("current_skills", []))

@app.post("/api/agent/portfolio")
async def generate_portfolio(request: Request):
    body = await request.json()
    agent = ResumeAgent()
    return await agent.generate_portfolio(body)

@app.post("/api/agent/enhance-bullets")
async def enhance_bullets(request: Request):
    body = await request.json()
    agent = ResumeAgent()
    return await agent.enhance_bullets(
        role=body.get("role", ""),
        company=body.get("company", ""),
        description=body.get("description", ""),
    )
