
import os, json, httpx
from typing import Optional

# ── Provider URLs ─────────────────────────────────────────────
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# ── Free models ───────────────────────────────────────────────
FREE_MODELS = {
    "groq":   "llama-3.3-70b-versatile",   
    "gemini": "gemini-2.0-flash",          
}

class AIProvider:
    """Calls Groq or Gemini and normalises both to Anthropic response format."""

    # ── Groq ─────────────────────────────────────────────────
    @staticmethod
    async def call_groq(system: str, messages: list, max_tokens: int) -> dict:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in backend/.env")

        payload = {
            "model":      FREE_MODELS["groq"],
            "max_tokens": max_tokens,
            "messages":   [{"role": "system", "content": system}] + messages,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                GROQ_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type":  "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        text = data["choices"][0]["message"]["content"]
        return {"content": [{"type": "text", "text": text}]}

    # ── Gemini ────────────────────────────────────────────────
    @staticmethod
    async def call_gemini(system: str, messages: list, max_tokens: int) -> dict:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in backend/.env")

        # Gemini needs system prompt injected as a turn
        contents = []
        if system:
            contents.append({"role": "user",  "parts": [{"text": f"[SYSTEM]: {system}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood."}]})
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        payload = {
            "contents":         contents,
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        model = FREE_MODELS["gemini"]
        url   = GEMINI_URL.format(model=model) + f"?key={api_key}"

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload,
                                     headers={"Content-Type": "application/json"})
            resp.raise_for_status()
            data = resp.json()

        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"content": [{"type": "text", "text": text}]}


class ResumeAgent:
    """
    Agentic resume assistant.
    Uses only FREE providers: Groq (primary) + Gemini (fallback).
    Automatically retries with the other provider on any failure.
    """

    def __init__(self):
        self.preferred  = os.getenv("PREFERRED_PROVIDER", "auto").lower()
        self._providers = self._build_provider_list()

    def _build_provider_list(self) -> list:
        available = []
        if os.getenv("GROQ_API_KEY"):
            available.append("groq")
        if os.getenv("GEMINI_API_KEY"):
            available.append("gemini")

        if not available:
            raise RuntimeError(
                "No free API key configured.\n"
                "Set GROQ_API_KEY and/or GEMINI_API_KEY in backend/.env\n"
                "  Groq free key  → https://console.groq.com\n"
                "  Gemini free key→ https://aistudio.google.com/apikey"
            )

        # Honour explicit preference
        if self.preferred in available:
            available.remove(self.preferred)
            available.insert(0, self.preferred)

        return available

    async def _call(self, system: str, messages: list, max_tokens: int = 1000) -> dict:
        """Call with automatic fallback between Groq and Gemini."""
        last_error = None
        for provider in self._providers:
            try:
                if provider == "groq":
                    return await AIProvider.call_groq(system, messages, max_tokens)
                elif provider == "gemini":
                    return await AIProvider.call_gemini(system, messages, max_tokens)
            except Exception as e:
                last_error = e
                print(f"[ResumeAgent] {provider} failed: {e} — trying next …")
        raise RuntimeError(f"All free providers failed. Last: {last_error}")

    def _text(self, response: dict) -> str:
        return "".join(
            b.get("text", "") for b in response.get("content", [])
            if b.get("type") == "text"
        ).strip()

    def _json(self, text: str) -> dict:
        clean = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)

    # ── Drop-in proxy (keeps existing frontend calls working) ─
    async def chat(self, messages: list, system: str = "", max_tokens: int = 1000) -> dict:
        return await self._call(system, messages, max_tokens)

    # ── Agentic: Generate Resume (3-step pipeline) ────────────
    async def generate_resume(self, data: dict) -> dict:

        # STEP 1 — Analyse gaps
        enrich_resp = await self._call(
            "You are a resume strategist. Return valid JSON only.",
            [{"role": "user", "content":
              f"Analyse this resume data and identify gaps/weak points.\n"
              f"Return JSON: {{\"gaps\":[],\"suggestions\":[],\"strengthScore\":0-100}}\n"
              f"Data: {json.dumps(data)}"}],
            max_tokens=500,
        )
        try:
            analysis = self._json(self._text(enrich_resp))
        except Exception:
            analysis = {"gaps": [], "suggestions": [], "strengthScore": 60}

        # STEP 2 — Generate full resume JSON
        resume_resp = await self._call(
            """You are an expert resume writer and ATS optimisation specialist.
Return ONLY raw JSON — no markdown fences, no explanation.
Structure:
{
  "summary": "2-3 sentence professional summary",
  "experience": [{"title":"","company":"","startDate":"","endDate":"","location":"","bullets":["action verb + task + result"]}],
  "education": [{"degree":"","institution":"","year":"","gpa":"","details":""}],
  "skills": {"tech":["skill1"],"soft":["skill1"],"languages":[]},
  "projects": [{"name":"","tech":"","bullets":["bullet1"]}],
  "certifications": [],
  "atsKeywords": ["kw1","kw2"]
}
Rules: strong action verbs, quantified achievements, ATS-optimised.""",
            [{"role": "user", "content": self._build_resume_prompt(data, analysis)}],
            max_tokens=2000,
        )
        try:
            resume_data = self._json(self._text(resume_resp))
        except Exception:
            resume_data = self._fallback(data)

        # STEP 3 — Extra ATS keywords
        ats_resp = await self._call(
            "You are an ATS specialist. Return JSON only.",
            [{"role": "user", "content":
              f"Target job: \"{data.get('jobTarget','general')}\"\n"
              f"Existing keywords: {resume_data.get('atsKeywords', [])}\n"
              f"Suggest 5 additional ATS keywords NOT already listed.\n"
              f"Return JSON: {{\"additionalKeywords\":[\"kw1\",\"kw2\",\"kw3\",\"kw4\",\"kw5\"]}}"}],
            max_tokens=300,
        )
        try:
            extra = self._json(self._text(ats_resp))
            resume_data["atsKeywords"] = list(set(
                resume_data.get("atsKeywords", []) + extra.get("additionalKeywords", [])
            ))
        except Exception:
            pass

        return {
            "content":  [{"type": "text", "text": json.dumps(resume_data)}],
            "analysis": analysis,
            "provider": self._providers[0],
        }

    # ── Agentic: Review Resume ────────────────────────────────
    async def review_resume(self, resume_text: str, job_target: str = "") -> dict:
        prompt = f"""Review this resume for: "{job_target or 'general professional'}".
Return JSON only:
{{
  "atsScore": 0-100,
  "overallScore": 0-100,
  "strengths": ["str1","str2"],
  "improvements": ["imp1","imp2"],
  "missingKeywords": ["kw1","kw2"],
  "skillRoadmap": [{{"skill":"","priority":"high|medium|low","resources":["res1"]}}],
  "summaryFeedback": "one paragraph",
  "rewriteSuggestion": "improved 2-line summary"
}}

Resume:
{resume_text}"""
        resp = await self._call(
            "You are a professional resume reviewer. Return JSON only.",
            [{"role": "user", "content": prompt}],
            max_tokens=1500,
        )
        raw = self._text(resp)
        try:
            review = self._json(raw)
        except Exception:
            review = {"atsScore": 70, "overallScore": 70, "strengths": [],
                      "improvements": [], "missingKeywords": [], "skillRoadmap": [],
                      "summaryFeedback": raw, "rewriteSuggestion": ""}
        return {"content": [{"type": "text", "text": json.dumps(review)}]}

    # ── Agentic: Suggest Skills ───────────────────────────────
    async def suggest_skills(self, role: str, current_skills: list) -> dict:
        prompt = (f"Target role: {role}\nCurrent skills: {', '.join(current_skills)}\n"
                  f"Suggest 5 in-demand tech skills and 2 soft skills NOT already listed.\n"
                  f"Return JSON only: {{\"tech\":[\"s1\",\"s2\",\"s3\",\"s4\",\"s5\"],\"soft\":[\"s1\",\"s2\"]}}")
        resp = await self._call(
            "You are a career coach. Return JSON only.",
            [{"role": "user", "content": prompt}], max_tokens=400)
        try:
            skills = self._json(self._text(resp))
        except Exception:
            skills = {"tech": ["Docker", "TypeScript", "AWS", "CI/CD", "REST API"],
                      "soft": ["Leadership", "Communication"]}
        return {"content": [{"type": "text", "text": json.dumps(skills)}]}

    # ── Agentic: Generate Portfolio ───────────────────────────
    async def generate_portfolio(self, data: dict) -> dict:
        prompt = (f"Generate portfolio content for:\n"
                  f"Title: {data.get('title','Portfolio')}\n"
                  f"Tagline: {data.get('tagline','')}\n"
                  f"About: {data.get('about','')}\n"
                  f"Style: {data.get('style','minimal')}\n"
                  f"Instructions: {data.get('instruction','')}\n\n"
                  f"Return JSON only:\n"
                  f"{{\"headline\":\"\",\"subheadline\":\"\",\"about\":\"\",\"ctaText\":\"\","
                  f"\"skillsTitle\":\"My Skills\",\"projectsTitle\":\"Featured Work\","
                  f"\"contactTitle\":\"Get in Touch\"}}")
        resp = await self._call(
            "You are a web developer and copywriter. Return JSON only.",
            [{"role": "user", "content": prompt}], max_tokens=600)
        try:
            portfolio = self._json(self._text(resp))
        except Exception:
            portfolio = {"headline": data.get("title", "Portfolio"),
                         "subheadline": data.get("tagline", ""),
                         "about": data.get("about", ""),
                         "ctaText": "Hire Me",
                         "skillsTitle": "My Skills",
                         "projectsTitle": "Featured Work",
                         "contactTitle": "Get in Touch"}
        return {"content": [{"type": "text", "text": json.dumps(portfolio)}]}

    # ── Agentic: Enhance Bullets ──────────────────────────────
    async def enhance_bullets(self, role: str, company: str, description: str) -> dict:
        prompt = (f"Role: {role} at {company}\nDescription: {description}\n\n"
                  f"Rewrite into 3-4 powerful ATS-optimised bullet points.\n"
                  f"Use strong action verbs. Quantify results.\n"
                  f"Return ONLY the bullets, one per line, each starting with •")
        resp = await self._call(
            "You are a professional resume writer. Return bullet points only.",
            [{"role": "user", "content": prompt}], max_tokens=400)
        return {"content": [{"type": "text", "text": self._text(resp)}]}

    # ── Helpers ───────────────────────────────────────────────
    def _build_resume_prompt(self, data: dict, analysis: dict) -> str:
        p    = data.get("personal", {})
        exp  = [e for e in data.get("experience", []) if e.get("company") or e.get("title")]
        edu  = [e for e in data.get("education",  []) if e.get("institution") or e.get("degree")]
        proj = [p for p in data.get("projects",   []) if p.get("name")]
        nl   = "\n"
        return f"""Create a professional resume for this person.

=== PERSONAL INFO ===
Name: {p.get('name','')}
Target Title: {p.get('title','')}
Target Job: {data.get('jobTarget','General professional')}
Instructions: {data.get('aiInstruction','Standard professional resume')}
Summary: {p.get('summary','Generate one')}

=== WORK EXPERIENCE ===
{nl.join(f"- {e.get('title','')} at {e.get('company','')}: {e.get('description','')}" for e in exp) or "None provided"}

=== EDUCATION ===
{nl.join(f"- {e.get('degree','')} at {e.get('institution','')} ({e.get('year','')})" for e in edu) or "Not provided"}

=== SKILLS ===
Tech: {', '.join(data.get('skills',{}).get('tech',[]))}
Soft: {', '.join(data.get('skills',{}).get('soft',[]))}

=== PROJECTS ===
{nl.join(f"- {p.get('name','')}: {p.get('description','')}" for p in proj) or "None"}

=== AI ANALYSIS ===
Gaps: {', '.join(analysis.get('gaps', []))}
Suggestions: {', '.join(analysis.get('suggestions', []))}
"""

    def _fallback(self, data: dict) -> dict:
        p = data.get("personal", {})
        return {
            "summary": f"Results-driven {p.get('title','professional')} with expertise in key technologies.",
            "experience": data.get("experience", []),
            "education":  data.get("education",  []),
            "skills":     data.get("skills", {"tech":[],"soft":[],"languages":[]}),
            "projects":   data.get("projects",  []),
            "certifications": [],
            "atsKeywords": [],
        }
