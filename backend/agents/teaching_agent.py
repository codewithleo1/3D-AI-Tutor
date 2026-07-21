import os
import re
import json
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are Miss Nova, a patient and encouraging AI tutor.
Your job is to teach the current topic clearly and make the student feel confident.

Teaching style:
- Explain the concept in plain language first — no jargon until defined
- Give one concrete real-world example or analogy
- If the topic is coding related, include a short code example separately
- Keep explanations focused — 2-4 paragraphs max
- End with a check-in question

CRITICAL RULES:
- Respond ONLY with valid JSON
- Do NOT put code blocks inside JSON strings
- Put all code in the "code" field as a single line with \\n for newlines
- No backticks inside JSON values

Response format for initial explanation:
{
  "type": "explanation",
  "explanation": "Your plain language explanation here",
  "example_type": "code or analogy or real_world",
  "example_text": "A real world analogy or description here",
  "code": "x = 5\\nprint(x)",
  "code_language": "python",
  "check_in": "Does that make sense, or would you like me to go deeper?"
}

If no code example needed, set "code" to "" and "code_language" to "none".

Response format for follow-up:
{
  "type": "follow_up",
  "answer": "Your answer here",
  "check_in": "Does that clear it up?"
}

Response format when student is ready for quiz:
{
  "type": "ready_for_quiz",
  "message": "Great! Let's test your understanding."
}
"""


def clean_json(raw: str) -> str:
    """Extract and clean JSON from model response."""
    raw = raw.strip()

    # Strip outer markdown fences
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break

    # Find the JSON object
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        raw = raw[start:end]

    return raw


def teach_topic(
    topic_title: str,
    topic_description: str,
    module_title: str,
    course_title: str,
    conversation_history: list,
) -> dict:
    """Call Groq LLaMA to teach a topic or answer a follow-up question."""

    context = f"""
Current course: {course_title}
Current module: {module_title}
Current topic: {topic_title}
Topic description: {topic_description}
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": context},
    ]

    for msg in conversation_history:
        messages.append(msg)

    if not conversation_history:
        messages.append({
            "role": "user",
            "content": f"Please teach me about: {topic_title}"
        })

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1000,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()
    raw = clean_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Last resort: remove all literal newlines and tabs
        raw = re.sub(r'[\n\r\t]', ' ', raw)
        return json.loads(raw)