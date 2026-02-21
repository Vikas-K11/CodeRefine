import os
import json
import httpx
import re
from typing import Optional

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Primary model chain — tried in order, first success wins
PRIMARY_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "stepfun/step-3.5-flash:free",
]

# Fallback model chain — used if ALL primary models fail
FALLBACK_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "stepfun/step-3.5-flash:free",
]


def _build_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://coderefine.app",
        "X-Title": "CodeRefine - AI Code Review"
    }


def _build_payload(model: str, prompt: str) -> dict:
    # Note: response_format is intentionally omitted —
    # most free-tier models do not support json_object mode
    # and will return a 400 error if it is included.
    return {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert code reviewer. "
                    "Always respond with valid JSON only. "
                    "Do not include any markdown, code fences, or explanation outside the JSON."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }


async def _try_models(prompt: str, models: list, api_key: str, label: str) -> Optional[str]:
    headers = _build_headers(api_key)

    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in models:
            try:
                payload = _build_payload(model, prompt)
                response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    print(f"[OpenRouter:{label}] SUCCESS with model: {model}")
                    return content

                print(f"[OpenRouter:{label}] FAIL {model} -> HTTP {response.status_code}: {response.text[:200]}")

            except httpx.TimeoutException:
                print(f"[OpenRouter:{label}] TIMEOUT {model}")
            except Exception as e:
                print(f"[OpenRouter:{label}] ERROR {model} -> {e}")

    return None


async def call_openrouter_primary(prompt: str, preferred_model: Optional[str] = None) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set in environment variables")

    models = ([preferred_model] + PRIMARY_MODELS) if preferred_model else PRIMARY_MODELS
    seen = set()
    models = [m for m in models if not (m in seen or seen.add(m))]

    result = await _try_models(prompt, models, api_key, "primary")
    if result is not None:
        return result

    raise RuntimeError(f"All primary OpenRouter models failed: {models}")


async def call_openrouter_fallback(prompt: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set in environment variables")

    print("[OpenRouter:fallback] Primary chain exhausted - trying fallback models...")
    result = await _try_models(prompt, FALLBACK_MODELS, api_key, "fallback")
    if result is not None:
        return result

    raise RuntimeError(f"All fallback OpenRouter models failed: {FALLBACK_MODELS}")


def parse_json_response(content: str) -> dict:
    content = content.strip()

    if content.startswith("```"):
        lines = content.splitlines()
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        content = "\n".join(inner).strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        raise ValueError(
            f"Failed to parse JSON response: {e}\n"
            f"Raw content (first 500 chars): {content[:500]}"
        )


async def get_ai_response(prompt: str, preferred_model: Optional[str] = None) -> dict:
    primary_error_msg = None

    try:
        content = await call_openrouter_primary(prompt, preferred_model)
        return parse_json_response(content)
    except Exception as e:
        primary_error_msg = str(e)
        print(f"[AI] Primary chain failed: {primary_error_msg}")

    try:
        content = await call_openrouter_fallback(prompt)
        return parse_json_response(content)
    except Exception as fallback_error:
        raise RuntimeError(
            f"All OpenRouter models failed.\n"
            f"  Primary error : {primary_error_msg}\n"
            f"  Fallback error: {fallback_error}"
        )