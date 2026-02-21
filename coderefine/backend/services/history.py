from typing import List, Dict, Optional
from datetime import datetime
import uuid

# In-memory session store (replace with Redis/DB for production)
_sessions: Dict[str, List[dict]] = {}

MAX_HISTORY = 20


def get_session_history(session_id: str) -> List[dict]:
    return _sessions.get(session_id, [])


def add_to_history(session_id: str, entry: dict) -> None:
    if session_id not in _sessions:
        _sessions[session_id] = []
    
    entry["id"] = str(uuid.uuid4())
    entry["timestamp"] = datetime.utcnow().isoformat()
    
    _sessions[session_id].insert(0, entry)
    
    # Keep only last MAX_HISTORY entries
    if len(_sessions[session_id]) > MAX_HISTORY:
        _sessions[session_id] = _sessions[session_id][:MAX_HISTORY]


def clear_history(session_id: str) -> None:
    if session_id in _sessions:
        del _sessions[session_id]


def get_all_sessions() -> Dict[str, int]:
    return {sid: len(entries) for sid, entries in _sessions.items()}
