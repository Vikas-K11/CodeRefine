from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, validator
from typing import Optional
import uuid

from backend.services.openrouter import get_ai_response
from backend.services.history import add_to_history
from backend.prompts.review_prompt import REVIEW_PROMPT

router = APIRouter()

SUPPORTED_LANGUAGES = [
    "python", "javascript", "typescript", "java", "c", "cpp", "csharp",
    "go", "rust", "php", "ruby", "swift", "kotlin", "sql", "bash", "html", "css"
]


class AnalyzeRequest(BaseModel):
    code: str
    language: str
    model: Optional[str] = None

    @validator("code")
    def code_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Code cannot be empty")
        if len(v) > 50000:
            raise ValueError("Code too large (max 50,000 characters)")
        return v

    @validator("language")
    def language_must_be_supported(cls, v):
        lang = v.lower().strip()
        if lang not in SUPPORTED_LANGUAGES:
            return v  # allow unknown but don't crash
        return lang


@router.post("/analyze")
async def analyze_code(
    request: AnalyzeRequest,
    x_session_id: Optional[str] = Header(None)
):
    """
    Analyze code for bugs, performance issues, security vulnerabilities,
    and best practice violations using OpenRouter AI models.
    """
    session_id = x_session_id or str(uuid.uuid4())

    try:
        prompt = REVIEW_PROMPT.format(
            language=request.language,
            code=request.code
        )

        result = await get_ai_response(prompt, request.model)

        # Ensure required fields exist with defaults
        result.setdefault("overallScore", 0)
        result.setdefault("grade", "N/A")
        result.setdefault("summary", "Analysis complete.")
        result.setdefault("bugs", [])
        result.setdefault("performance", [])
        result.setdefault("security", [])
        result.setdefault("bestPractices", [])
        result.setdefault("metrics", {
            "linesOfCode": len(request.code.splitlines()),
            "complexity": "unknown",
            "maintainability": 0,
            "testability": 0,
            "readability": 0
        })
        result.setdefault("positives", [])

        # Save to session history
        history_entry = {
            "language": request.language,
            "score": result["overallScore"],
            "grade": result["grade"],
            "summary": result["summary"],
            "issueCount": len(result["bugs"]) + len(result["security"]) + len(result["performance"]),
            "codeSnippet": request.code[:200] + ("..." if len(request.code) > 200 else "")
        }
        add_to_history(session_id, history_entry)

        return {
            "success": True,
            "sessionId": session_id,
            "analysis": result
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
