import os
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")
client = Groq(api_key=os.getenv("GROQ_API_KEY_1"))

response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "system", "content": "Always respond with valid JSON only."},
        {"role": "user", "content": 'Generate a roadmap JSON for learning Python with 1 module and 2 topics.'},
    ],
    max_tokens=800,
    temperature=0.7,
)

raw = response.choices[0].message.content.strip()
print("=== RAW REPR ===")
print(repr(raw[:1000]))
print("\n=== RAW TEXT ===")
print(raw[:1000])