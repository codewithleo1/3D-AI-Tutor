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

TOPIC RULES — READ CAREFULLY:
- Each topic must cover EXACTLY ONE concept. Never combine multiple concepts in one topic.
- BAD topic: "Variables, Data Types, and Operators" (3 concepts — too broad)
- GOOD topics: "Variables" / "Data Types" / "Operators" (one concept each)
- BAD topic: "if, else, and loops" (2 concepts)
- GOOD topics: "Conditionals: if and else" / "Loops: for and while" (one each)
- Each topic must be teachable in one focused sitting (20-45 min).
- Topics must build on each other — each one assumes the previous is mastered.
- If a subject area has many sub-concepts, create more topics, not broader ones.

STRUCTURE RULES:
- Generate 3-6 modules. Each module has 3-6 topics.
- Order modules from foundational to advanced.
- Personalize based on the user's level, weekly time, and goal.
- If the subject is coding, make topics hands-on and practical.
- Always respond ONLY with valid JSON. No preamble, no markdown fences.

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
          "title": "Topic title — ONE concept only",
          "description": "One sentence on exactly what will be taught.",
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
  "title": "Learning Python for Career",
  "estimated_hours": 24,
  "modules": [
    {
      "id": 1,
      "title": "Python Basics",
      "description": "The fundamental building blocks of Python programming.",
      "estimated_hours": 4,
      "topics": [
        {
          "id": 1,
          "title": "What is Python and How to Run It",
          "description": "Understand what Python is, install it, and run your first line of code.",
          "estimated_minutes": 20
        },
        {
          "id": 2,
          "title": "Variables",
          "description": "Learn how to store values in named containers and use them in code.",
          "estimated_minutes": 25
        },
        {
          "id": 3,
          "title": "Data Types: Numbers and Strings",
          "description": "Understand integers, floats, and text strings — and how Python treats them differently.",
          "estimated_minutes": 25
        },
        {
          "id": 4,
          "title": "Data Types: Lists and Booleans",
          "description": "Store multiple values in lists and use True/False values in your programs.",
          "estimated_minutes": 25
        },
        {
          "id": 5,
          "title": "Operators: Arithmetic and Comparison",
          "description": "Perform calculations and compare values using Python operators.",
          "estimated_minutes": 25
        }
      ]
    },
    {
      "id": 2,
      "title": "Control Flow",
      "description": "Make your programs smart by controlling what runs and when.",
      "estimated_hours": 3,
      "topics": [
        {
          "id": 1,
          "title": "Conditionals: if and else",
          "description": "Make decisions in your code based on conditions.",
          "estimated_minutes": 30
        },
        {
          "id": 2,
          "title": "Conditionals: elif and Nested if",
          "description": "Handle multiple conditions and decisions inside decisions.",
          "estimated_minutes": 25
        },
        {
          "id": 3,
          "title": "Loops: for",
          "description": "Repeat actions over a sequence of items using for loops.",
          "estimated_minutes": 30
        },
        {
          "id": 4,
          "title": "Loops: while",
          "description": "Repeat actions based on a condition using while loops.",
          "estimated_minutes": 25
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

Remember: Each topic must cover EXACTLY ONE concept. Never combine concepts.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=3000,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model adds them
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break

    # Find JSON boundaries
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        raw = raw[start:end]

    return json.loads(raw)