import os
import json
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are Miss Nova, an expert learning coach and curriculum designer.
Your job is to generate a structured, practical learning roadmap based on the user's goal.

Rules:
- Always respond ONLY with valid JSON. No preamble, no markdown fences, no explanation.
- Generate 3-5 modules. Each module has 2-5 topics.
- Topics must be concrete and teachable in one sitting (20-30 min each).
- Order modules from foundational to advanced.
- Personalize based on the user's level, weekly time, and goal.
- If the subject is coding, make topics hands-on with code examples.

Output format:
{
  "title": "Learning [Subject]",
  "estimated_hours": 12,
  "modules": [
    {
      "id": 1,
      "title": "Module title",
      "description": "One sentence on what this module covers.",
      "estimated_hours": 3,
      "topics": [
        {
          "id": 1,
          "title": "Topic title",
          "description": "One sentence on what will be taught.",
          "estimated_minutes": 25
        }
      ]
    }
  ]
}
"""

FEW_SHOT_EXAMPLE = """
Example input:
{
  "goal": "Learn Python",
  "level": "complete beginner",
  "hours_per_week": 5,
  "objective": "get a job"
}

Example output:
{
  "title": "Learning Python",
  "estimated_hours": 20,
  "modules": [
    {
      "id": 1,
      "title": "Python Fundamentals",
      "description": "Core building blocks every Python developer must know.",
      "estimated_hours": 4,
      "topics": [
        {
          "id": 1,
          "title": "Variables and Data Types",
          "description": "Learn how Python stores and handles different kinds of data.",
          "estimated_minutes": 25
        },
        {
          "id": 2,
          "title": "Control Flow: if, else, loops",
          "description": "Make decisions and repeat actions in your code.",
          "estimated_minutes": 30
        }
      ]
    }
  ]
}
"""


def generate_roadmap(goal: str, level: str, hours_per_week: int, objective: str) -> dict:
    """Call Groq LLaMA to generate a personalized learning roadmap."""

    user_message = f"""
{FEW_SHOT_EXAMPLE}

Now generate a roadmap for:
{{
  "goal": "{goal}",
  "level": "{level}",
  "hours_per_week": {hours_per_week},
  "objective": "{objective}"
}}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=1200,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model adds them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)