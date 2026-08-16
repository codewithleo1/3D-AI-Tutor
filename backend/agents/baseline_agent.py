import os
import re
import json
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

client1 = Groq(api_key=os.getenv("GROQ_API_KEY_1"))
client2 = Groq(api_key=os.getenv("GROQ_API_KEY_2"))


def groq_create(**kwargs):
    try:
        return client1.chat.completions.create(**kwargs)
    except Exception as e:
        if "429" in str(e) or "rate_limit" in str(e).lower():
            return client2.chat.completions.create(**kwargs)
        raise


BASELINE_PROMPT = """
You are Miss Nova, an AI tutor conducting a baseline assessment.
Generate exactly 5 multiple choice questions to assess a student's current knowledge.

RULES:
- Questions must be specific to the subject, not generic
- Mix easy, medium, and hard questions
- Each question has exactly 4 options (a, b, c, d)
- Questions should reveal the student's actual level
- For complete beginners, even easy questions should be meaningful
- Never ask trick questions — test real understanding
- Respond ONLY with valid JSON, no markdown fences

Response format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": {
        "a": "Option A",
        "b": "Option B",
        "c": "Option C",
        "d": "Option D"
      },
      "correct": "a",
      "explanation": "Why this answer is correct"
    }
  ]
}
"""


def generate_baseline_questions(goal: str, level: str) -> dict:
    """Generate 5 baseline assessment questions for a given goal."""

    messages = [
        {"role": "system", "content": BASELINE_PROMPT},
        {
            "role": "user",
            "content": f"""
Generate 5 baseline assessment questions for:
Subject: {goal}
Student's self-reported level: {level}

Make questions appropriate for testing whether they actually know what they claim.
If they say beginner, include basic questions they should know.
If intermediate, include questions that test deeper understanding.
"""
        }
    ]

    response = groq_create(
        model="openai/gpt-oss-120b",
        messages=messages,
        max_tokens=1500,
        temperature=0.5,
    )

    raw = response.choices[0].message.content.strip()
    raw = _clean_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = re.sub(r'[\n\r\t]', ' ', raw)
        return json.loads(raw)


def evaluate_baseline(questions: list, answers: dict) -> dict:
    """
    Evaluate baseline answers and return score + recommended level.
    answers = { "1": "a", "2": "c", ... }
    """
    score = 0
    results = []

    for q in questions:
        qid = str(q["id"])
        student_answer = answers.get(qid, "")
        correct = q["correct"]
        passed = student_answer.lower() == correct.lower()
        if passed:
            score += 1
        results.append({
            "question_id": q["id"],
            "question": q["question"],
            "student_answer": student_answer,
            "correct_answer": correct,
            "passed": passed,
            "explanation": q.get("explanation", ""),
        })

    if score <= 1:
        recommended_level = "beginner"
        message = "No worries — Miss Nova will start from the very beginning and build your knowledge step by step."
        skip_modules = 0
    elif score == 2:
        recommended_level = "beginner"
        message = "Good start! You know a little. Miss Nova will fill in the gaps as you go."
        skip_modules = 0
    elif score == 3:
        recommended_level = "intermediate"
        message = "Solid foundation! You know the basics. Miss Nova will skip the intro and get into the interesting parts."
        skip_modules = 1
    elif score == 4:
        recommended_level = "intermediate"
        message = "Impressive! You know quite a bit already. Miss Nova will focus on the advanced topics."
        skip_modules = 1
    else:
        recommended_level = "advanced"
        message = "Excellent! You have strong knowledge already. Miss Nova will jump straight to advanced concepts."
        skip_modules = 2

    return {
        "score": score,
        "total": len(questions),
        "recommended_level": recommended_level,
        "message": message,
        "skip_modules": skip_modules,
        "results": results,
    }


def _clean_json(raw: str) -> str:
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