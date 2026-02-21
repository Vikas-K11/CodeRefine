# ⬡ CodeRefine — AI-Powered Code Review & Optimization Engine

> Paste your code. Get instant AI-powered analysis for bugs, security vulnerabilities, performance issues, and best practices — then generate a fully optimized version in one click.

![Python](https://img.shields.io/badge/Python-3.10+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green) ![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-orange) ![License](https://img.shields.io/badge/License-MIT-purple)

---

## What is CodeRefine?

CodeRefine is a full-stack web application that uses Generative AI to review source code. You paste or type your code into the browser editor, click **Analyze**, and within seconds receive a detailed report covering:

- 🐛 **Bugs** — logic errors, null pointer issues, resource leaks, off-by-one errors
- 🔒 **Security** — SQL injection, XSS, hardcoded secrets, unsafe deserialization, CWE references
- ⚡ **Performance** — O(n²) loops, blocking calls, memory inefficiencies, N+1 queries
- 📐 **Best Practices** — naming conventions, code structure, documentation, design patterns
- ✅ **Positives** — things your code actually does well

After analysis, you can generate a fully **optimized and rewritten version** of your code with all issues fixed.

---

## Features

| Feature | Description |
|---|---|
| 🔍 Auto Language Detection | Automatically detects Python, JavaScript, Java, C++, Go, Rust and 10 more languages as you type |
| 🤖 Multi-Model AI | Uses OpenRouter with automatic model fallback — if one model fails, the next one takes over |
| ✨ Code Rewriter | Generates a complete, production-ready optimized version of your code |
| 🎲 Random Samples | 14 intentionally buggy code samples across 10 languages to explore and learn from |
| 📊 Quality Score | 0–100 score with letter grade and detailed metrics (maintainability, testability, readability) |
| 🎨 Dark Editor | CodeMirror editor with Dracula theme, syntax highlighting, and line numbers |
| 📋 Session History | Keeps track of your last 20 analyses per session |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI (Python) | REST API, request handling, CORS |
| **AI Provider** | OpenRouter | Access to multiple LLMs via single API |
| **AI Models** | Trinity Large, Step 3.5 Flash | Code analysis and rewriting |
| **Frontend** | Vanilla JS + CSS | UI, no framework dependencies |
| **Editor** | CodeMirror 5 | Syntax-highlighted code editor |
| **Server** | Uvicorn (ASGI) | Async HTTP server |
| **Fonts** | JetBrains Mono + Outfit | Terminal aesthetic |

---

## Project Structure

```
coderefine/
│
├── backend/                        # Python FastAPI application
│   ├── main.py                     # App entry point, routes, static file serving
│   ├── routes/
│   │   ├── analyze.py              # POST /api/analyze — runs code review
│   │   ├── rewrite.py              # POST /api/rewrite — generates optimized code
│   │   └── history.py              # GET/DELETE /api/history — session history
│   ├── services/
│   │   ├── openrouter.py           # OpenRouter API calls, model fallback chain
│   │   └── history.py              # In-memory session store
│   └── prompts/
│       └── review_prompt.py        # AI prompt templates for analysis and rewriting
│
├── frontend/                       # Static web UI (no framework)
│   ├── index.html                  # App shell, layout, CodeMirror setup
│   ├── style.css                   # Dark terminal theme, all styling
│   └── app.js                      # All frontend logic, API calls, auto-detection
│
├── .env                            # Your API key (never commit this)
├── .env.example                    # Template for environment variables
├── .gitignore                      # Git ignore rules
├── requirements.txt                # Python dependencies
├── run.py                          # Easy startup script with validation
└── README.md                       # This file
```

---

## Quick Start

### Prerequisites

- Python 3.10 or higher
- An OpenRouter API key (free at [openrouter.ai/keys](https://openrouter.ai/keys))

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/yourname/coderefine.git
cd coderefine
```

---

### Step 2 — Install dependencies

```bash
pip install -r requirements.txt
```

If you have multiple Python versions, use:

```bash
python -m pip install -r requirements.txt
```

---

### Step 3 — Add your API key

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and add your key:

```env
OPENROUTER_API_KEY=your_key_here
```

Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys) — no credit card required, includes free credits.

---

### Step 4 — Start the server

```bash
python run.py
```

You should see:

```
✓ Loaded .env file
✓ API key validated
✓ Starting CodeRefine server...

  🌐 App:       http://localhost:8000
  📖 API Docs:  http://localhost:8000/docs
  🤖 Models:    Trinity Large → Step 3.5 Flash → (fallbacks)
```

---

### Step 5 — Open in browser

Go to **http://localhost:8000**

---

## How to Use

### Analyze your code

1. **Paste your code** into the editor — language is detected automatically
2. Optionally **select a language manually** from the dropdown if auto-detection picks the wrong one
3. **Choose an AI model** from the header (Trinity Large is recommended)
4. Click **▶ Analyze** or press **Ctrl+Enter**
5. View results in the right panel — switch between Bugs, Security, Performance, Best Practices, and Good tabs

### Try a sample

Click **⚄ Random Sample** to load one of 14 intentionally buggy code examples across 10 languages. Each click loads a different sample — great for exploring what CodeRefine can catch.

### Generate optimized code

After analysis, scroll to the bottom of the results and click **✨ Generate Optimized Code**. The rewritten code appears below the editor with a summary of all changes made.

Click **↑ Use as Input** to replace the editor content with the optimized version, or **⎘ Copy** to copy it to clipboard.

---

## AI Models

CodeRefine uses **OpenRouter** as the AI gateway, which means one API key gives access to many models. The app tries models in order and automatically falls back if one fails.

### Primary Models (tried first)

| Model | Strengths |
|---|---|
| `arcee-ai/trinity-large-preview:free` | Strong reasoning, good at code analysis |
| `stepfun/step-3.5-flash:free` | Fast inference, good JSON output |

### Fallback Models (used if primary models fail)

| Model | Notes |
|---|---|
| `anthropic/claude-3-haiku` | Reliable, great code understanding |
| `google/gemma-2-9b-it:free` | Free tier fallback |
| `mistralai/mistral-7b-instruct:free` | Free tier fallback |
| `meta-llama/llama-3.2-3b-instruct:free` | Last resort free fallback |

To change the models, edit `PRIMARY_MODELS` and `FALLBACK_MODELS` in `backend/services/openrouter.py`.

---

## API Reference

The backend exposes a REST API you can call directly or integrate into CI/CD pipelines.

### `POST /api/analyze`

Analyzes code and returns structured findings.

**Request body:**
```json
{
  "code": "def get_user(name):\n    query = f'SELECT * FROM users WHERE name={name}'\n    ...",
  "language": "python",
  "model": "arcee-ai/trinity-large-preview:free"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "analysis": {
    "overallScore": 34,
    "grade": "D",
    "summary": "Critical SQL injection vulnerability found...",
    "bugs": [...],
    "security": [
      {
        "id": "SEC001",
        "line": 2,
        "title": "SQL Injection",
        "description": "User input is directly interpolated into the SQL query.",
        "severity": "critical",
        "cwe": "CWE-89",
        "fix": "Use parameterized queries or an ORM."
      }
    ],
    "performance": [...],
    "bestPractices": [...],
    "metrics": {
      "linesOfCode": 5,
      "maintainability": 40,
      "testability": 30,
      "readability": 55
    },
    "positives": [...]
  }
}
```

---

### `POST /api/rewrite`

Generates an optimized version of the code.

**Request body:**
```json
{
  "code": "your original code",
  "language": "python",
  "issues": [
    { "title": "SQL Injection", "description": "User input not sanitized" }
  ],
  "model": "arcee-ai/trinity-large-preview:free"
}
```

**Response:**
```json
{
  "success": true,
  "rewrite": {
    "optimizedCode": "import sqlite3\n\ndef get_user(name):\n    conn = sqlite3.connect('db.sqlite')\n    cursor = conn.cursor()\n    cursor.execute('SELECT * FROM users WHERE name = ?', (name,))\n    ...",
    "changes": [
      { "type": "security", "description": "Replaced string interpolation with parameterized query" }
    ],
    "explanation": "Fixed critical SQL injection by using parameterized queries."
  }
}
```

---

### `GET /api/history`

Returns the analysis history for the current session.

**Header:** `X-Session-Id: your-uuid`

---

### `DELETE /api/history`

Clears history for the current session.

---

### `GET /api/health`

Returns server status and configured models.

---

## Supported Languages

| Language | Detection | Analysis | Rewrite |
|---|---|---|---|
| Python | ✅ | ✅ | ✅ |
| JavaScript | ✅ | ✅ | ✅ |
| TypeScript | ✅ | ✅ | ✅ |
| Java | ✅ | ✅ | ✅ |
| C++ | ✅ | ✅ | ✅ |
| C | ✅ | ✅ | ✅ |
| C# | ✅ | ✅ | ✅ |
| Go | ✅ | ✅ | ✅ |
| Rust | ✅ | ✅ | ✅ |
| PHP | ✅ | ✅ | ✅ |
| Ruby | ✅ | ✅ | ✅ |
| SQL | ✅ | ✅ | ✅ |
| Bash | ✅ | ✅ | ✅ |
| HTML | ✅ | ✅ | ✅ |
| CSS | ✅ | ✅ | ✅ |

---

## Deployment

### Deploy on Render (recommended, free tier available)

1. Push your project to GitHub
2. Go to [render.com](https://render.com) and create a new **Web Service**
3. Connect your GitHub repository
4. Set the following:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable: `OPENROUTER_API_KEY = your_key_here`
6. Deploy — your app will be live at `https://your-app.onrender.com`

### Deploy on Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway variables set OPENROUTER_API_KEY=your_key_here
```

### Deploy on a VPS (Ubuntu)

```bash
# Install dependencies
pip install -r requirements.txt

# Run with gunicorn for production
pip install gunicorn
gunicorn backend.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `OPENROUTER_API_KEY is not set` | `.env` file missing or not loaded | Make sure `.env` exists in the project root with your key |
| `ModuleNotFoundError: No module named 'httpx'` | Dependencies not installed | Run `python -m pip install -r requirements.txt` |
| `GET /style.css 404` | Running uvicorn from wrong directory | Always run from inside the `coderefine/` folder |
| `All OpenRouter models failed` | Invalid API key or no credits | Check your key at [openrouter.ai/keys](https://openrouter.ai/keys) |
| `Cannot access local variable 'primary_error'` | Old version of openrouter.py | Replace with the latest `openrouter.py` |

---

## License

MIT License — free to use, modify, and distribute for personal and commercial projects.

---

## Acknowledgements

- [OpenRouter](https://openrouter.ai) — unified API for accessing multiple LLMs
- [FastAPI](https://fastapi.tiangolo.com) — modern Python web framework
- [CodeMirror](https://codemirror.net) — browser-based code editor
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — the font that makes terminals beautiful