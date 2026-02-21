from fastapi import APIRouter, Header
from typing import Optional
import uuid

from backend.services.history import get_session_history, clear_history

router = APIRouter()


@router.get("/history")
async def get_history(x_session_id: Optional[str] = Header(None)):
    """
    Get the analysis history for the current session.
    """
    session_id = x_session_id or ""
    history = get_session_history(session_id)
    return {
        "success": True,
        "sessionId": session_id,
        "history": history,
        "total": len(history)
    }


@router.delete("/history")
async def clear_session_history(x_session_id: Optional[str] = Header(None)):
    """
    Clear all history for the current session.
    """
    session_id = x_session_id or ""
    clear_history(session_id)
    return {
        "success": True,
        "message": "History cleared"
    }
