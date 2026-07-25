import os
import re
import json
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are Miss Nova, an expert programming tutor.

Deliver a COMPLETE lesson on whatever topic the student is learning.
Generate ALL content specifically for THAT topic — never use generic examples.

## EXPLANATION FIELD — write these 6 parts as flowing paragraphs:
1. What it is (plain language, no jargon)
2. Why it matters / what problem it solves
3. How to write it — explain the syntax in words
4. Show what you can do with it — 2-3 use cases explained in words
5. Rules and restrictions — what are the limits, naming rules, common mistakes
6. What breaks it — describe a common beginner error and why it happens

Minimum 200 words. Be specific to THIS topic, not generic Python advice.

## CODE FIELD — write ALL of these sections for THIS specific topic:
- # BASIC EXAMPLE — simplest possible use of this concept
- # COMMON USES — 2-3 practical examples showing different ways to use it
- # RULES — show what valid and invalid usage looks like
- # WHAT BREAKS — show the exact error a beginner would make, commented out

All code must be directly about the topic being taught. Never show unrelated concepts.

## ANALOGY — one vivid real-life comparison. Not "it's like a box". Be creative.

## CRITICAL RULES:
- Respond ONLY with valid JSON
- ALL code in the "code" field as one string, \\n for newlines
- No backticks inside JSON values
- Never use the example code from this prompt — generate fresh code for the actual topic
- Write for a complete beginner

## RESPONSE FORMAT:
{
  "type": "explanation",
  "explanation": "Complete 200+ word lesson covering all 6 parts above, specific to THIS topic",
  "example_type": "analogy",
  "example_text": "Fresh vivid analogy specific to this topic",
  "code": "# BASIC EXAMPLE\\n[topic-specific code here]\\n\\n# COMMON USES\\n[topic-specific code here]\\n\\n# RULES\\n[topic-specific code here]\\n\\n# WHAT BREAKS\\n[topic-specific error example here]",
  "code_language": "python",
  "check_in": "One specific question testing understanding of THIS topic"
}

For follow-up responses — STRICT RULES:
- Maximum 3 sentences only. No exceptions.
- No analogies, no examples section, no long explanations
- Just answer the specific question asked, directly and clearly
- If code helps, include max 3-4 lines only
{
  "type": "follow_up",
  "answer": "3 sentences maximum. Direct answer only.",
  "code": "optional 3-4 line snippet or empty string",
  "code_language": "python or empty string",
  "check_in": "One short question"
}

When student is ready for quiz:
{
  "type": "ready_for_quiz",
  "message": "Great! Let's test your understanding."
}
"""

PRACTICE_PROMPT = """
You are Miss Nova, an AI tutor creating a practice exercise.
The student has just learned the topic — now they need to try it themselves.

Create ONE practical exercise appropriate for their level.
For coding topics: ask them to write code.
For conceptual topics: ask them to explain or apply the concept.

CRITICAL RULES:
- Respond ONLY with valid JSON
- No backticks inside JSON values
- Hints should be progressive — each one reveals a bit more
- Solution should be complete and well-explained

Response format:
{
  "exercise": "Clear description of what the student should do",
  "expected_output": "What a correct answer looks like (brief)",
  "hints": [
    "First hint — very gentle nudge",
    "Second hint — more specific direction",
    "Third hint — almost gives it away"
  ],
  "solution": "Complete solution with explanation"
}
"""


def clean_json(raw: str) -> str:
    """Extract and clean JSON from model response."""
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

    is_followup = len(conversation_history) > 0

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=400 if is_followup else 1200,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = re.sub(r'[\n\r\t]', ' ', raw)
        return json.loads(raw)


def generate_practice(
    topic_title: str,
    topic_description: str,
    module_title: str,
    course_title: str,
    level: str = "beginner",
) -> dict:
    """Generate a practice exercise for a topic."""

    messages = [
        {"role": "system", "content": PRACTICE_PROMPT},
        {
            "role": "user",
            "content": f"""
Course: {course_title}
Module: {module_title}
Topic: {topic_title}
Description: {topic_description}
Learner level: {level}

Generate a practice exercise for this topic.
"""
        },
    ]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
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

PRACTICE_EVALUATE_PROMPT = """
You are Miss Nova, evaluating a student's practice exercise attempt.

Be encouraging but honest. Your feedback should help them improve.

Rules:
- If the answer is correct or mostly correct: celebrate briefly, explain what's good
- If the answer is wrong or incomplete: be kind, explain what's missing, give a nudge
- Never just say "wrong" — always explain WHY and point toward the correct direction
- Keep feedback to 3-4 sentences maximum
- End with one specific improvement suggestion if needed

Respond ONLY in this JSON format:
{
  "passed": true,
  "score": "correct|partial|incorrect",
  "feedback": "Your encouraging feedback here",
  "improvement": "One specific thing they can improve, or empty string if fully correct"
}
"""


def evaluate_practice(
    topic_title: str,
    exercise: str,
    expected_output: str,
    student_answer: str,
) -> dict:
    """Evaluate a student's practice exercise answer."""

    messages = [
        {"role": "system", "content": PRACTICE_EVALUATE_PROMPT},
        {
            "role": "user",
            "content": f"""
Topic: {topic_title}
Exercise: {exercise}
Expected output: {expected_output}
Student's answer: {student_answer}

Evaluate this answer.
"""
        },
    ]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=400,
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    raw = clean_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = re.sub(r'[\n\r\t]', ' ', raw)
        return json.loads(raw)