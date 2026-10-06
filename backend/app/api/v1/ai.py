import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, CurrentUserContext
from app.core.config import settings
import httpx
from typing import Optional

router = APIRouter(prefix="/ai", tags=["AI Tutor & Insights"])

class PromptRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None

@router.post("/tutor")
async def ai_tutor(
    payload: PromptRequest,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Safety Check: Students cannot query financial ledger or administrative records via AI
    if current_user.role == "student":
        lower_prompt = payload.prompt.lower()
        forbidden_keywords = [
            "fee", "payment", "revenue", "salary", "expense", "profit",
            "payroll", "financial", "ledger", "institute", "admin", "collection", "transaction"
        ]
        if any(w in lower_prompt for w in forbidden_keywords):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Students are restricted to academic tutoring topics only and cannot query institute financial or administrative records."
            )

    groq_key = (settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY") or "").strip()

    if not groq_key:
        return {
            "response": "⚠️ EduPilot Groq AI provider is not configured. Please set `GROQ_API_KEY` in environment settings to enable live AI responses.",
            "mode": "error"
        }

    # Proxy to Groq AI API safely
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "openai/gpt-oss-120b",
                    "messages": [
                        {
                            "role": "system",
                            "content": f"You are EduPilot AI, a helpful, intelligent tutor and assistant for {current_user.role}s in an educational institute."
                        },
                        {"role": "user", "content": payload.prompt}
                    ],
                    "temperature": 0.7
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                reply = data["choices"][0]["message"]["content"]
                return {"response": reply, "mode": "live"}
            else:
                err_text = ""
                try:
                    err_data = resp.json()
                    err_text = err_data.get("error", {}).get("message", "")
                except Exception:
                    err_text = resp.text[:100]
                return {
                    "response": f"⚠️ Groq AI service error (HTTP {resp.status_code}): {err_text or 'Provider returned an error.'}",
                    "mode": "error"
                }
    except Exception as e:
        return {
            "response": "⚠️ EduPilot Groq AI service is currently offline or unreachable.",
            "mode": "error"
        }
