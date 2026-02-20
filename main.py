# -------------------------------
# CodeRefine Backend (FastAPI)
# Gemini + HuggingFace Fallback
# -------------------------------

import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# -------------------------------
# Load API Keys from .env
# -------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HF_API_KEY = os.getenv("HF_API_KEY")

# -------------------------------
# Initialize FastAPI
# -------------------------------
app = FastAPI(
    title="CodeRefine API",
    description="AI Code Review Engine",
    version="1.0"
)

# Enable CORS (for frontend calls)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Request Model
# -------------------------------
class CodeRequest(BaseModel):
    code: str
    language: str = "Python"

# -------------------------------
# Gemini Analysis Function
# -------------------------------
def analyze_with_gemini(code: str, language: str):

    if not GEMINI_API_KEY:
        print("Gemini key missing")
        return None

    url = (
        "https://generativelanguage.googleapis.com/v1/"
        f"models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    )

    prompt = f"""
You are a senior software engineer.

Analyze the following {language} code and provide:

1. Bugs
2. Performance issues
3. Best practice violations
4. Optimized version
5. Explanation

Code:
{code}
"""

    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        response = requests.post(
            url,
            json=body,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

        else:
            print("Gemini Error:", response.text)
            return None

    except Exception as e:
        print("Gemini Exception:", e)
        return None

# -------------------------------
# HuggingFace Fallback Function
# -------------------------------
def analyze_with_huggingface(code: str, language: str):

    if not HF_API_KEY:
        return "HuggingFace API key missing."

    url = "https://api-inference.huggingface.co/models/bigcode/starcoder"

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}"
    }

    prompt = f"""
Review and optimize this {language} code:

{code}
"""

    try:
        response = requests.post(
            url,
            headers=headers,
            json={"inputs": prompt},
            timeout=30
        )

        if response.status_code == 200:
            return response.json()[0]["generated_text"]

        elif response.status_code == 503:
            return "HuggingFace model is loading. Try again shortly."

        else:
            return f"HuggingFace API error: {response.status_code}"

    except Exception as e:
        return f"HuggingFace Exception: {str(e)}"

# -------------------------------
# Health Check Route
# -------------------------------
@app.get("/")
def health():
    return {"status": "CodeRefine backend running"}

# -------------------------------
# Review Endpoint
# -------------------------------
@app.post("/review")
async def review_code(data: CodeRequest):

    if not data.code.strip():
        raise HTTPException(
            status_code=400,
            detail="Code input is empty"
        )

    # Try Gemini first
    result = analyze_with_gemini(
        data.code,
        data.language
    )

    # Fallback → HuggingFace
    if not result:
        result = analyze_with_huggingface(
            data.code,
            data.language
        )

    return {
        "analysis": result
    }

# -------------------------------
# Run Server
# -------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )