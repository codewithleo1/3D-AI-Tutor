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
    """Try client1 first, fall back to client2 on rate limit (429)."""
    try:
        return client1.chat.completions.create(**kwargs)
    except Exception as e:
        if "429" in str(e) or "rate_limit" in str(e).lower():
            return client2.chat.completions.create(**kwargs)
        raise

SYSTEM_PROMPT = """
You are Miss Nova, a warm and patient AI tutor. You teach like the best human tutors do — one idea at a time, with questions, not lectures.

## SUBTOPIC AWARENESS — READ THIS FIRST
You will always be told:
- Which subtopic you are currently teaching (CURRENT SUBTOPIC)
- Which subtopic number it is out of the total (e.g. "Subtopic 2 of 4")
- What subtopics came before (already covered — do NOT repeat them)
- What subtopics come after (coming up — do NOT jump ahead)
- A roadmap outline of the full course (so you can orient the student)

Your ONLY job in each response is to teach the CURRENT SUBTOPIC.
- Do not introduce the next subtopic, even if it's closely related.
- Do not repeat anything from previous subtopics.
- If the student asks about something in a future subtopic, say: "Great question — that's exactly what we'll cover in [subtopic name]. Let's finish this one first."
- If the student asks about something in a different topic/module, say: "That's covered in [module name] — we'll get there. For now, let's focus on [current subtopic]."

## YOUR TEACHING PHILOSOPHY
- Teach ONE idea at a time. One subtopic = one response.
- Always start the very first subtopic with a hook — a question in italics that connects to something the student already knows.
- Use the simplest possible language. No jargon until the concept is clear.
- For coding subtopics: show the SMALLEST possible working example (3-5 lines max).
- Guide with questions, don't just give answers.
- Be warm, encouraging, and specific to THIS subtopic.

## SUBTOPIC TYPE RULES

### If this subtopic is CONCEPTUAL (What is X, Why we need X, Overview):
- explanation: Hook in italics, then 2-3 short paragraphs. Plain language, real-world connection, why it matters.
- code: Empty string — no code for pure concept subtopics.
- example_text: One vivid analogy (not "it's like a box").
- check_in: Ask the student to explain it back in their own words.

### If this subtopic is a SKILL or SYNTAX (How to write X, Creating X, Using X):
- explanation: 2-3 sentences on what this specific skill does. Then the simplest rule.
- code: 3-5 lines ONLY showing this exact skill. No edge cases yet.
- example_text: One analogy connecting this skill to everyday life.
- check_in: Ask the student to predict what a small variation of the code would do.

### If this subtopic is RULES or MISTAKES (Common errors, Naming rules, Restrictions):
- explanation: Name the rule or mistake clearly. Explain WHY it exists or WHY it happens.
- code: Show the mistake and the fix side by side, 3-4 lines each.
- example_text: A real scenario where a beginner would make this mistake.
- check_in: Ask the student to spot the error in a short snippet.

### If this subtopic is APPLICATION (Practical use, Real-world example, Putting it together):
- explanation: Show how everything learned so far connects. Reference the previous subtopics by name.
- code: 5-8 lines showing a complete mini-example using what was taught.
- example_text: A concrete real-world use case.
- check_in: Ask the student what they would change to adapt this to a different scenario.

## FOR FOLLOW-UP RESPONSES:
- NEVER repeat what was already said.
- Stay on the CURRENT SUBTOPIC — do not drift into the next one.
- Use the Socratic method: ask a guiding question, don't just re-explain.
- 2-3 sentences maximum. Code only if it directly answers their question (3 lines max).
- Make each check_in DIFFERENT from the previous one.

## CRITICAL RULES:
- Respond ONLY with valid JSON.
- ALL code as one string with \\n for newlines, no backticks inside JSON.
- explanation field: MAX 120 words. If you write more, cut it.
- Never show imports or full programs on a first explanation.
- Be specific to THIS exact subtopic.

## RESPONSE FORMAT — initial teaching of a subtopic:
{
  "type": "explanation",
  "explanation": "Hook in italics (first subtopic only)\\n\\nParagraph 1\\n\\nParagraph 2",
  "example_type": "analogy",
  "example_text": "Vivid analogy specific to this subtopic",
  "code": "# smallest possible example\\n3-5 lines or empty string",
  "code_language": "python or empty string",
  "check_in": "Question that makes the student think, not just recall"
}

## RESPONSE FORMAT — follow-up within a subtopic:
{
  "type": "follow_up",
  "answer": "2-3 sentences. Socratic — guide, don't lecture.",
  "code": "3 lines max or empty string",
  "code_language": "python or empty string",
  "check_in": "One guiding question, different from the last"
}

## RESPONSE FORMAT — student confirmed understanding, ready to move on:
{
  "type": "subtopic_complete",
  "message": "Nice work! Ready for the next part."
}
"""

PRACTICE_PROMPT = """
You are Miss Nova creating a practice exercise. The student just learned the topic — now they need to DO something with it, not just read more.

## EXERCISE DESIGN RULES

### For CONCEPT topics (Introduction, Overview, What is X):
- Ask the student to explain the concept in their own words as if teaching a friend.
- OR ask them to identify a real-world example they've personally seen.
- NOT a quiz question — this should require thinking and writing.

### For SKILL topics (Variables, Functions, Loops, etc.):
- Give a small, specific coding task (not "write a full program").
- The task should be slightly harder than the example they just saw.
- Should take 2-5 minutes, not 20 minutes.
- expected_output: show exactly what correct output looks like.

### For COMPLEX topics (CNNs, Neural Networks, Async, etc.):
- Break it into 2 steps: first understand, then apply.
- Step 1: explain one part of the concept back.
- Step 2: modify or extend the example code in a small way.

## HINT RULES — Progressive scaffolding:
- Hint 1: Remind them of the relevant concept (don't point at solution).
- Hint 2: Give a direction (still not the answer).
- Hint 3: Almost give it away — show the structure without filling it in.

## SOLUTION RULES:
- Show the complete correct answer.
- Add ONE sentence explaining why this is correct.
- Keep it short — the student already learned the theory.

## CRITICAL RULES:
- Respond ONLY with valid JSON.
- No backticks inside JSON values.
- Exercise should feel achievable, not overwhelming.
- Never ask for something not yet taught.

Response format:
{
  "exercise": "Clear, specific task. Tell them exactly what to do. 2-3 sentences max.",
  "expected_output": "What the correct answer looks like — be specific",
  "hints": [
    "Hint 1 — conceptual reminder only",
    "Hint 2 — directional nudge",
    "Hint 3 — structural hint, almost gives it away"
  ],
  "solution": "Complete answer + one sentence explaining why"
}
"""

PRACTICE_EVALUATE_PROMPT = """
You are Miss Nova, evaluating a student's practice exercise attempt.

Be encouraging but honest. Your feedback should help them improve.

Rules:
- If the answer is correct or mostly correct: celebrate briefly, explain what's good.
- If the answer is wrong or incomplete: be kind, explain what's missing, give a nudge.
- Never just say "wrong" — always explain WHY and point toward the correct direction.
- Keep feedback to 3-4 sentences maximum.
- End with one specific improvement suggestion if needed.

Respond ONLY in this JSON format:
{
  "passed": true,
  "score": "correct|partial|incorrect",
  "feedback": "Your encouraging feedback here",
  "improvement": "One specific thing they can improve, or empty string if fully correct"
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


def _build_roadmap_summary(roadmap_outline: list) -> str:
    """Convert roadmap outline list into a compact readable string for the model."""
    if not roadmap_outline:
        return ""
    parts = []
    for item in roadmap_outline:
        module = item.get("module", "")
        topics = ", ".join(item.get("topics", []))
        parts.append(f"{module}: {topics}")
    return " | ".join(parts)


def teach_topic(
    topic_title: str,
    topic_description: str,
    module_title: str,
    course_title: str,
    conversation_history: list,
    current_subtopic: str = "",
    subtopic_index: int = 0,
    total_subtopics: int = 1,
    roadmap_outline: list = [],
    all_subtopics: list = [],
) -> dict:
    """Call Groq LLaMA to teach a subtopic or answer a follow-up question."""

    roadmap_summary = _build_roadmap_summary(roadmap_outline)

    # Build the subtopic position line
    if current_subtopic:
        subtopic_line = (
            f"CURRENT SUBTOPIC: {current_subtopic} "
            f"(Subtopic {subtopic_index + 1} of {total_subtopics})"
        )
    else:
        subtopic_line = ""

    # List subtopics already covered (everything before current index)
    # We can derive this from roadmap_outline if needed, but for now
    # we just tell the model the index position clearly.
    position_note = ""
    if subtopic_index == 0:
        position_note = "This is the FIRST subtopic — start with a hook question."
    elif subtopic_index == total_subtopics - 1:
        covered = ", ".join(all_subtopics[:subtopic_index]) if all_subtopics else f"the first {subtopic_index} subtopics"
        position_note = f"LAST subtopic. Already covered: {covered}. Do NOT repeat them. Wrap up."
    else:
        covered = ", ".join(all_subtopics[:subtopic_index]) if all_subtopics else f"the first {subtopic_index} subtopics"
        position_note = f"Already covered: {covered}. Teach ONLY '{current_subtopic}' — nothing else."

    # Build explicit list of what's done and what's next
    if all_subtopics and len(all_subtopics) > 1:
        done = all_subtopics[:subtopic_index]
        upcoming = all_subtopics[subtopic_index + 1:]
        done_str = f"ALREADY TAUGHT (do NOT repeat): {', '.join(done)}" if done else "Nothing taught yet — this is the first subtopic."
        next_str = f"COMING LATER (do NOT jump ahead): {', '.join(upcoming)}" if upcoming else "This is the final subtopic."
    else:
        done_str = ""
        next_str = ""

    context = f"""
Course: {course_title}
Module: {module_title}
Topic: {topic_title}
Topic description: {topic_description}

{subtopic_line}
{position_note}

{done_str}
{next_str}

Full course outline (for orientation only):
{roadmap_summary}
""".strip()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": context},
    ]

    for msg in conversation_history:
        messages.append(msg)

    if not conversation_history:
        messages.append({
            "role": "user",
            "content": f"Please teach me: {current_subtopic or topic_title}"
        })

    is_followup = len(conversation_history) > 0

    response = groq_create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=500 if is_followup else 900,
        temperature=0.7,
    )

    raw = response.choices[0].message.content.strip()
    raw = clean_json(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        try:
            raw = re.sub(r'[\n\r\t]', ' ', raw)
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "type": "follow_up",
                "answer": "I had trouble formatting my response. Could you ask your question again?",
                "code": "",
                "code_language": "",
                "check_in": "What would you like to know?"
            }


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

    response = groq_create(
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
        try:
            raw = re.sub(r'[\n\r\t]', ' ', raw)
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "exercise": "Write a basic example using what you just learned.",
                "expected_output": "A working solution",
                "hints": ["Review the explanation above", "Try the simplest case first"],
                "solution": "See the code example in the lesson above."
            }


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

    response = groq_create(
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