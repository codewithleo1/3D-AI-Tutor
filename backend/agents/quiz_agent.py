import os
import json
import re
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

GENERATE_PROMPT = """
You are Miss Nova, generating a short quiz for a topic.

Rules:
- Generate exactly 3 questions.
- Question 1: Multiple choice with 4 options (a, b, c, d)
- Question 2: Fill in the blank
- Question 3: Open ended — apply the concept or explain in own words
- Never ask trick questions. Goal is to confirm understanding.
- For coding topics, include code snippets where relevant.

Respond ONLY in this JSON format:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text",
      "options": {
        "a": "Option A",
        "b": "Option B",
        "c": "Option C",
        "d": "Option D"
      },
      "correct": "a"
    },
    {
      "id": 2,
      "type": "fill_blank",
      "question": "The ___ is used to store data in Python.",
      "correct": "variable"
    },
    {
      "id": 3,
      "type": "open_ended",
      "question": "Question text"
    }
  ]
}
"""

EVALUATE_PROMPT = """
You are Miss Nova, evaluating quiz answers for a topic.

Be generous — partial understanding counts.
Reward correct reasoning even if wording is imprecise.

CRITICAL: You must identify which specific concepts the student got wrong.
These will be used to re-teach only the failed concepts — be precise and specific.

Respond ONLY in this JSON format:
{
  "results": [
    {
      "question_id": 1,
      "passed": true,
      "feedback": "Short encouraging feedback (1-2 sentences). If wrong, explain the correct answer."
    },
    {
      "question_id": 2,
      "passed": true,
      "feedback": "Feedback here."
    },
    {
      "question_id": 3,
      "passed": true,
      "feedback": "Feedback here."
    }
  ],
  "overall_passed": true,
  "score": 3,
  "summary": "1-2 sentence summary of how they did.",
  "ready_to_advance": true,
  "failed_concepts": ["concept 1", "concept 2"]
}

Rules for failed_concepts:
- List the specific concept names the student got wrong (e.g. "variable assignment", "data types")
- If all passed, set failed_concepts to []
- Be specific — not "variables" but "how to assign a value to a variable"
- Maximum 3 failed concepts

Set ready_to_advance to true if score is 2 or more out of 3.
"""

REPAIR_PROMPT = """
You are Miss Nova, re-teaching specific concepts a student got wrong on a quiz.

The student already learned the full topic but struggled with specific parts.
Your job is to re-explain ONLY the failed concepts — more clearly, with a different angle.

Rules:
- Focus only on the failed concepts listed
- Use a different explanation than the first time — new analogy, simpler language
- Keep it short — 2-3 paragraphs max
- End with one concrete example
- Be encouraging — frame it as "Let's look at this differently"

Respond ONLY in this JSON format:
{
  "type": "repair",
  "explanation": "Re-explanation targeting only the failed concepts",
  "example_text": "A concrete example that clarifies the failed concept",
  "code": "optional short code example, or empty string",
  "code_language": "python or none",
  "check_in": "One question to confirm they now understand"
}
"""


def clean_json(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
    return raw


def generate_quiz(topic_title: str, topic_description: str) -> dict:
    """Generate 3 quiz questions for a topic."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": GENERATE_PROMPT},
            {"role": "user", "content": f"Generate a quiz for topic: {topic_title}\nDescription: {topic_description}"},
        ],
        max_tokens=600,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()
    raw = clean_json(raw)
    return json.loads(raw)


def evaluate_quiz(topic_title: str, questions: list, answers: list) -> dict:
    """Evaluate student answers and return results with failed_concepts."""

    payload = json.dumps({
        "topic": topic_title,
        "questions": questions,
        "answers": answers,
    }, indent=2)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": EVALUATE_PROMPT},
            {"role": "user", "content": f"Evaluate these answers:\n{payload}"},
        ],
        max_tokens=800,
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    raw = clean_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = re.sub(r'[\n\r\t]', ' ', raw)
        return json.loads(raw)


def repair_concepts(
    topic_title: str,
    failed_concepts: list,
) -> dict:
    """Re-explain only the concepts the student failed on."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": REPAIR_PROMPT},
            {
                "role": "user",
                "content": f"""
Topic: {topic_title}
Failed concepts: {', '.join(failed_concepts)}

Re-teach these specific concepts using a fresh angle.
"""
            },
        ],
        max_tokens=800,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()
    raw = clean_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = re.sub(r'[\n\r\t]', ' ', raw)
        return json.loads(raw)