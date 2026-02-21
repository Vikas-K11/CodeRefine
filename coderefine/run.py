"""
CodeRefine - Startup Script
Run with: python run.py
"""
import os
import sys
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print("✓ Loaded .env file")
else:
    print("⚠ No .env file found. Copy .env.example to .env and add your API keys.")
    print("  cp .env.example .env")

# Validate required env vars
if not os.getenv("OPENROUTER_API_KEY"):
    print("\n❌ ERROR: OPENROUTER_API_KEY is not set!")
    print("   Get your free key at: https://openrouter.ai/keys")
    print("   Then add it to your .env file")
    sys.exit(1)

print("✓ API key validated")
print("✓ Starting CodeRefine server...")
print("\n  🌐 App:      http://localhost:8000")
print("  📖 API Docs:  http://localhost:8000/docs")
print("  🤖 Models:   DeepSeek Coder → Qwen 2.5 → LLaMA 3.1 → Codestral → (fallbacks)\n")

import uvicorn
uvicorn.run(
    "backend.main:app",
    host="0.0.0.0",
    port=8000,
    reload=True,
    reload_dirs=["backend"]
)