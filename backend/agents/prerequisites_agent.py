import os
import json
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are Miss Nova, an AI tutor helping a new learner get set up before starting their course.

Your job is to generate a practical prerequisites checklist based on the course goal and level.

CRITICAL RULES:
- Always include a zero-install option (browser-based tool) for beginners
- Be specific — give exact tool names, exact URLs, exact commands to verify setup
- Keep each step short and actionable
- If the subject needs no tools (music theory, history, language), say so clearly
- Tailor to the level — beginners need more hand-holding than advanced learners

Categories to cover:
1. tools_needed     — list of tools to install with download links
2. zero_install     — browser-based alternative (always include if possible)
3. verify_steps     — how to confirm the tool works (e.g. run python --version)
4. prior_knowledge  — what they should already know (be honest but encouraging)
5. estimated_setup_minutes — realistic time to get set up

Respond ONLY with valid JSON in this exact format:
{
  "has_tools": true,
  "estimated_setup_minutes": 15,
  "intro": "One encouraging sentence about what we're setting up and why.",
  "tools": [
    {
      "name": "Tool name",
      "purpose": "What it's used for in this course",
      "install_url": "https://...",
      "install_steps": ["Step 1", "Step 2"],
      "verify_command": "python --version",
      "verify_expected": "Python 3.x.x"
    }
  ],
  "zero_install_option": {
    "name": "Google Colab",
    "url": "https://colab.research.google.com",
    "description": "Free browser-based Python environment — no install needed. Perfect if you want to start immediately."
  },
  "prior_knowledge": [
    "Basic computer use (creating files, opening folders)",
    "Comfortable typing"
  ],
  "first_action": "The very first thing they should do right now, in one sentence."
}

If the subject needs no tools (e.g. music theory, cooking, history), set has_tools to false
and leave tools as an empty array. Still fill in prior_knowledge and first_action.
"""


def generate_prerequisites(goal: str, level: str) -> dict:
    """Generate prerequisites checklist for a course goal and level."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Course goal: {goal}\nLearner level: {level}"},
        ],
        max_tokens=1000,
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break

    return json.loads(raw)