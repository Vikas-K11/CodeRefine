REVIEW_PROMPT = """You are an expert senior software engineer and code reviewer with 15+ years of experience across multiple languages and paradigms.

Analyze the following {language} code thoroughly and return ONLY a valid JSON response (no markdown, no explanation outside JSON).

Code to analyze:
```{language}
{code}
```

Return this exact JSON structure:
{{
  "overallScore": <integer 0-100>,
  "grade": "<A+|A|B+|B|C+|C|D|F>",
  "summary": "<2-3 sentence executive summary of the code quality>",
  "bugs": [
    {{
      "id": "BUG001",
      "line": <line_number_or_null>,
      "title": "<short title>",
      "description": "<detailed description>",
      "severity": "<critical|high|medium|low>",
      "fix": "<specific fix recommendation>"
    }}
  ],
  "performance": [
    {{
      "id": "PERF001",
      "line": <line_number_or_null>,
      "title": "<short title>",
      "description": "<detailed description>",
      "impact": "<high|medium|low>",
      "suggestion": "<specific optimization suggestion>"
    }}
  ],
  "security": [
    {{
      "id": "SEC001",
      "line": <line_number_or_null>,
      "title": "<short title>",
      "description": "<detailed description>",
      "severity": "<critical|high|medium|low>",
      "cwe": "<CWE-ID or null>",
      "fix": "<specific fix recommendation>"
    }}
  ],
  "bestPractices": [
    {{
      "id": "BP001",
      "line": <line_number_or_null>,
      "title": "<short title>",
      "description": "<detailed description>",
      "category": "<naming|structure|documentation|testing|patterns>",
      "recommendation": "<specific recommendation>"
    }}
  ],
  "metrics": {{
    "linesOfCode": <integer>,
    "complexity": "<low|medium|high|very_high>",
    "maintainability": <integer 0-100>,
    "testability": <integer 0-100>,
    "readability": <integer 0-100>
  }},
  "positives": ["<thing done well>", "<another positive>"]
}}

Rules:
- Be specific and actionable, not generic
- Line numbers must be accurate based on the actual code
- overallScore reflects true code quality (don't inflate)
- If no issues in a category, return empty array []
- Positives should highlight genuinely good practices found
"""

REWRITE_PROMPT = """You are an expert senior software engineer. Rewrite the following {language} code to be production-ready.

Original code:
```{language}
{code}
```

Issues to fix (from analysis):
{issues_summary}

Return ONLY a valid JSON response with this structure:
{{
  "optimizedCode": "<complete rewritten code as a string>",
  "changes": [
    {{
      "type": "<bug_fix|performance|security|style|refactor>",
      "description": "<what was changed and why>"
    }}
  ],
  "explanation": "<2-3 sentence summary of the major improvements made>"
}}

Rules:
- The optimizedCode must be complete and runnable
- Fix ALL identified bugs, security issues, and performance problems
- Follow {language} best practices and idiomatic patterns
- Add appropriate comments for complex logic
- Preserve the original functionality
- Do NOT add markdown code fences inside the JSON string
"""
