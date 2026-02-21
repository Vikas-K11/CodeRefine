from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, validator
from typing import Optional, List
import uuid

from backend.services.openrouter import get_ai_response
from backend.prompts.review_prompt import REWRITE_PROMPT

router = APIRouter()


class Issue(BaseModel):
    title: str
    description: str


class RewriteRequest(BaseModel):
    code: str
    language: str
    issues: Optional[List[Issue]] = []
    model: Optional[str] = None

    @validator("code")
    def code_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Code cannot be empty")
        if len(v) > 50000:
            raise ValueError("Code too large (max 50,000 characters)")
        return v


@router.post("/rewrite")
async def rewrite_code(
    request: RewriteRequest,
    x_session_id: Optional[str] = Header(None)
):
    """
    Rewrite code to be optimized, fixing identified bugs and improving quality.
    """
    try:
        # Build issues summary for context
        if request.issues:
            issues_summary = "\n".join([
                f"- {issue.title}: {issue.description}"
                for issue in request.issues
            ])
        else:
            issues_summary = "- Fix all bugs, security issues, and performance problems found"

        prompt = REWRITE_PROMPT.format(
            language=request.language,
            code=request.code,
            issues_summary=issues_summary
        )

        result = await get_ai_response(prompt, request.model)

        # Ensure required fields
        result.setdefault("optimizedCode", request.code)
        result.setdefault("changes", [])
        result.setdefault("explanation", "Code has been optimized.")

        return {
            "success": True,
            "rewrite": result
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
