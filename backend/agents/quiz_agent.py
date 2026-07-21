import os
import json
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
  "ready_to_advance": true
}

Set ready_to_advance to true if score is 2 or more out of 3.
"""


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
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)


def evaluate_quiz(topic_title: str, questions: list, answers: list) -> dict:
    """Evaluate student answers and return results."""

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
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)