# Miss Nova — Build Progress
> Living document. Update after every session.
> Format: check off ✅ what's done, add notes under each item.

---

## Project Overview
**Name:** Miss Nova — AI Learning Companion  
**Repo:** `codewithleo1/3D-AI-Tutor`  
**Stack:** React + Vite + Tailwind (frontend) · FastAPI + uv (backend) · Groq LLaMA 3.3-70B · Neon PostgreSQL  
**Goal:** A 3D AI tutor that generates personalized learning roadmaps and teaches each topic with a chat-style teaching flow + quiz system

---


## Deployment (Live)
- Frontend: https://3-d-ai-tutor.vercel.app
- Backend: https://miss-nova-backend.onrender.com
- Keep-alive: cron-job.org pings /health every 10 min
- DB: Neon PostgreSQL (production branch)

---

## Current Status

Last worked on: August 12, 2026
Next session goal: Phase B voice loop — auto-listen after Nova speaks (silence detection + echo suppression)

---

## Tech Stack Decisions (Locked)

| Layer | Tool | Decision |
|---|---|---|
| Frontend | React + Vite + Tailwind | ✅ Done |
| LLM | Groq LLaMA 3.3-70b | ✅ Done |
| TTS | Web Speech API | ✅ Decided |
| Voice Input | Groq Whisper | 🔒 Phase 4 |
| 3D Avatar | Ready Player Me + Three.js | 🔒 Phase 3 |
| Database | Neon PostgreSQL (free, unlimited projects) | ✅ Done |
| Session Memory | localStorage (no Redis needed) | ✅ Done |
| Hosting FE | Vercel | 🔒 Phase 4 |
| Hosting BE | Render | 🔒 Phase 4 |
| Code Editor | Monaco Editor | ✅ Installed |
| LLM | Groq openai/gpt-oss-120b | Migrated from llama-3.3-70b-versatile (deprecated Aug 16 2026) |

---

## Brand System (Locked)

| Token | Value |
|---|---|
| Primary | `#7C3AED` (purple) |
| Success | `#10B981` (green) |
| Background | `#FFFFFF` (white) |
| Text primary | `#111827` |
| Text muted | `#6B7280` |
| Card bg | `#F9FAFB` |
| Card border | `#E5E7EB` |
| Gradient | `135deg, #7C3AED → #10B981` |

CSS classes defined: `section-card`, `btn-primary`, `btn-success`, `option-btn`, `topic-row`, `gradient-text`

---

## Phase 0 — Foundation ✅ COMPLETE

- [x] GitHub repo created: `codewithleo1/3D-AI-Tutor`
- [x] Vite + React frontend scaffold
- [x] FastAPI backend scaffold with `uv`
- [x] Tailwind CSS v4 configured via `@tailwindcss/vite`
- [x] Google Fonts loaded: Plus Jakarta Sans, Inter, JetBrains Mono
- [x] Brand CSS system in `index.css`
- [x] CORS configured: `http://localhost:5173` allowed
- [x] `.gitignore` — excludes `.env`, `node_modules`, `__pycache__`, `.venv`
- [x] Neon PostgreSQL project created (`miss-nova`, ap-southeast-1)
- [x] `.env` configured with `DATABASE_URL` + `GROQ_API_KEY`
- [x] DB connection verified via `/health` endpoint

---

## Phase 1 — Roadmap Builder ✅ COMPLETE

### Backend
- [x] `POST /api/roadmap` — Groq LLaMA generates structured JSON curriculum
- [x] `GET /health` — returns `{ status, agent, db }`
- [x] `backend/agents/roadmap_agent.py` — personalized roadmap from 4 inputs
- [x] Few-shot example in roadmap prompt for consistent JSON output
- [x] JSON parse safety — strips markdown fences, handles control characters
- [x] `backend/db/neon.py` — Neon connection with `RealDictCursor`
- [x] `backend/routes/chat.py` — roadmap route
- [x] Pydantic models for request validation

### Frontend
- [x] 4-question onboarding wizard (single page, progressive unlock)
  - [x] Section 1: Goal input with Enter key support
  - [x] Section 2: Level selector (4 options with descriptions)
  - [x] Section 3: Hours/week range slider with live number display
  - [x] Section 4: Objective selector (4 options with emoji)
  - [x] Completed sections show summary + Edit badge — click to reopen
  - [x] Lock logic: sections unlock in order
- [x] Roadmap display
  - [x] Module cards with gradient badge
  - [x] Topic rows with time estimate
  - [x] Remove module button
  - [x] Remove topic button (✕)
  - [x] Edit hint banner
- [x] Finalize Roadmap button → triggers prerequisites screen
- [x] Start over button

---

## Phase 2 — LMS Core 🔄 IN PROGRESS

### Backend ✅ COMPLETE
- [x] `backend/agents/teaching_agent.py` — Miss Nova explains topics
  - [x] Structured JSON output: explanation, example_text, code, code_language, check_in
  - [x] Follow-up question handling with conversation history
  - [x] Ready-for-quiz detection
  - [x] Robust JSON parsing (handles code blocks with newlines)
- [x] `backend/agents/quiz_agent.py` — generates and evaluates quizzes
  - [x] 3 question types: multiple choice, fill-in-the-blank, open-ended
  - [x] Evaluation: generous marking, per-question feedback
  - [x] `ready_to_advance` flag (pass = 2/3 correct)
  - [x] `summary` and `score` in response
- [x] `backend/agents/prerequisites_agent.py` — setup guide per subject
  - [x] Tool detection: knows VS Code for Python/JS, DB Browser for SQL, etc.
  - [x] Zero-install option always included (Colab, sqliteonline.com, browser DevTools)
  - [x] Verify commands (e.g. `python --version`)
  - [x] Prior knowledge checklist
  - [x] `estimated_setup_minutes`
- [x] `backend/routes/teaching.py` — 4 endpoints:
  - [x] `POST /api/teach`
  - [x] `POST /api/quiz/generate`
  - [x] `POST /api/quiz/evaluate`
  - [x] `POST /api/prerequisites`

### Frontend ✅ COMPLETE (Core Loop)
- [x] `App.jsx` — 3-view state machine
  - [x] View 1: Onboarding wizard + roadmap builder
  - [x] View 2: Prerequisites screen
  - [x] View 3: Teaching mode (sidebar + TopicView)
  - [x] Progress bar (topics completed / total)
  - [x] Topic X of Y counter in nav
  - [x] Back to roadmap button
  - [x] Course completion alert
- [x] `src/hooks/useCourseProgress.js` — localStorage progress hook
  - [x] `initProgress(roadmap)` — create fresh progress
  - [x] `markTopicComplete(mi, ti, roadmap)` — save completion + advance location
  - [x] `jumpToTopic(mi, ti)` — navigate without resetting completion
  - [x] `getTopicState(mi, ti)` → `"locked" | "unlocked" | "current" | "completed"`
  - [x] `clearProgress()` — wipe on start over
  - [x] Restore from localStorage on app load — survives page refresh ✅
- [x] `src/components/Sidebar.jsx`
  - [x] All modules collapsed/expanded with toggle
  - [x] Auto-expands current module
  - [x] Topic lock states: ✅ completed / ▶ current / ○ unlocked / 🔒 locked
  - [x] Active topic: purple left border + highlighted background
  - [x] Click completed/unlocked topic → jump to it (free navigation) ✅
  - [x] Click locked topic → not clickable (opacity 0.4, cursor blocked)
  - [x] Mini stats at bottom: `X of Y done · %`
  - [x] Sticky below nav, scrollable
- [x] `src/components/Prerequisites.jsx`
  - [x] Calls `POST /api/prerequisites` with goal + level
  - [x] Tool cards: name, purpose, download link, install steps, verify command
  - [x] "Mark as installed" checkbox per tool
  - [x] Zero-install option card (toggleable)
  - [x] "Good to know before starting" section
  - [x] First step instruction from Miss Nova
  - [x] "I'm all set — Start learning →" (disabled until tools checked or zero-install selected)
  - [x] "Skip setup" button always available
  - [x] `~X minutes` setup time badge
- [x] `src/components/TopicView.jsx` — chat-style teaching UI
  - [x] Teaching phase: explanation + example + code (Monaco) + check-in
  - [x] Monaco Editor for code examples (syntax highlighted, read-only)
  - [x] Follow-up question input (ask Miss Nova anything)
  - [x] "I understand — Take the quiz →" button
  - [x] Quiz phase: MCQ + fill-blank + open-ended all rendered
  - [x] Submit answers → evaluation
  - [x] Results phase: per-question feedback + pass/fail banner
  - [x] Pass → Next topic button
  - [x] Fail → Re-study or Retry quiz buttons
  - [x] Skip topic button

### DB Wiring ✅ COMPLETE
- [x] Neon schema fixed — courses/progress tables recreated with correct columns
- [x] Unique constraint on progress(session_id, course_id)
- [x] POST /api/progress/save-course — creates session + course, returns both IDs
- [x] POST /api/progress/save — upserts progress on topic complete
- [x] POST /api/progress/load — loads latest progress by session_id
- [x] frontend/src/utils/session.js — generates persistent session UUID
- [x] useCourseProgress.js — initProgress calls DB, markTopicComplete syncs to DB
- [x] App.jsx — initProgress is async, passes goal + level


### Next to Build — Active Learning (Highest Impact)
- [x] Practice step in `TopicView.jsx` — learner writes answer before quiz
  - [x] `POST /api/teach { subtopic_type: "practice" }` 
  - [x] Exercise prompt + text area
  - [x] "Show hint" button (reveals hints one by one)
  - [x] "See solution" button
- [x] Quiz repair logic
  - [x] On fail: extract `failed_concepts` from quiz evaluation response
  - [x] `POST /api/teach { subtopic_type: "repair", failed_concepts: [...] }`
  - [x] Re-explain only failed concepts, then mini retry quiz
- [x] "Explain differently" button in teaching phase
  - [x] Sends new history turn requesting a different angle/analogy
- [x] `subtopic_type` field in `TeachRequest` (backend)
  - [x] Update `teaching_agent.py` prompts per type

---

## Phase 3 — 3D Avatar 🔄 IN PROGRESS

- [x] Installed three, @react-three/fiber, @react-three/drei
- [x] Downloaded animated female teacher GLB from Sketchfab (nova.glb)
- [x] Built Avatar.jsx — loads GLB, plays animations based on mood prop
- [x] Added right panel (320px) in App.jsx for avatar
- [x] Avatar reacts to phase changes via onMoodChange callback from TopicView
- [x] Mood mapping: teaching→explaining, quiz→quiz, pass→happy, fail→concerned
- [x] Avatar head nod lipsync while isSpeaking (useFrame sine wave on Head_5)
- [x] Body bones locked to rest position (useFrame override)
- [x] Replaced nova.glb with RPM avatar (rpm_test.glb) + 5 separate animation GLBs
- [x] Fixed Intel UHD WebGL context loss — separate GLBs bypass the merged mesh limit
- [x] Morph targets: 63 blend shapes — mood expressions + 15 visemes + eye blink
- [x] Lip sync via viseme cycling on word boundaries (useSpeech onboundary event)
- [x] poseSeed prop varies talking animation per topic
- [x] debugAvatar mode in main.jsx (?debugAvatar URL param for isolated testing)
- [x] Avatar live on Vercel — verified rendering on production
- [x] Avatar background set to white (#FFFFFF) — matches app background
- [ ] Avatar camera fine-tuned to show hands fully

---

## Phase 4 — Voice + Polish + Deploy 🔄 IN PROGRESS

- [x] Groq Whisper voice input — mic toggle, auto-submit after transcription
- [x] Teaching prompt rewritten — chunked Socratic teaching, hook question, topic-type aware
- [x] Practice prompt rewritten — progressive scaffolding
- [x] Roadmap generates subtopics per topic (3-6 items, ordered)
- [ ] Subtopic-aware teaching loop — Nova teaches one subtopic at a time
- [ ] Dual Groq API key fallback
- [ ] "Yes I got it" navigates subtopics, quiz only after all subtopics done
- [ ] Spaced repetition reminders (7-day review badge in sidebar)
- [ ] Export progress as PDF
- [ ] Mobile sidebar — hamburger menu, slide-in drawer
- [x] Deploy frontend to Vercel — https://3-d-ai-tutor.vercel.app
- [x] Deploy backend to Render — https://miss-nova-backend.onrender.com
- [ ] README with demo GIF

---

## Actual Folder Structure (as of July 22, 2026)

```
3D-AI-Tutor/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── .env
│   └── src/
│       ├── App.jsx                        ✅ auth gate + roadmap + teaching + payment + baseline
│       ├── index.css                      ✅ brand system
│       ├── main.jsx                       ✅ React root
│       ├── components/
│       │   ├── Avatar.jsx                 ✅ 3D RPM avatar, mood + lipsync + visemes
│       │   ├── Prerequisites.jsx          ✅ setup guide screen
│       │   ├── Sidebar.jsx                ✅ module/topic nav, lock states
│       │   └── TopicView.jsx              ✅ subtopic teaching + practice + quiz + repair
│       ├── hooks/
│       │   ├── useCourseProgress.js       ✅ localStorage + Neon DB sync
│       │   └── useSpeech.js               ✅ Web Speech API TTS + Whisper mic
│       ├── lib/
│       │   └── supabase.js                ✅ Supabase client
│       ├── pages/
│       │   ├── AuthPage.jsx               ✅ Supabase login/signup
│       │   ├── PaymentGate.jsx            ✅ Razorpay Rs.1 + promo codes
│       │   └── BaselineAssessment.jsx     ✅ 5 MCQ knowledge check + module skip
│       └── utils/
│           └── session.js                 ✅ session UUID generator
│
├── backend/
│   ├── main.py                            ✅ FastAPI app + CORS + all routers
│   ├── pyproject.toml                     ✅ uv dependencies
│   ├── requirements.txt                   ✅ Render deployment dependencies
│   ├── .env                               ✅ API keys
│   ├── agents/
│   │   ├── roadmap_agent.py               ✅ curriculum generation + subtopics
│   │   ├── teaching_agent.py              ✅ subtopic-aware teaching + practice + repair
│   │   ├── quiz_agent.py                  ✅ generate + evaluate + repair quiz
│   │   ├── prerequisites_agent.py         ✅ tool setup guide
│   │   └── baseline_agent.py              ✅ 5 MCQ baseline + score evaluation
│   ├── db/
│   │   ├── neon.py                        ✅ PostgreSQL connection
│   │   └── queries.py                     ✅ DB queries (sessions, courses, progress)
│   └── routes/
│       ├── chat.py                        ✅ POST /api/roadmap
│       ├── teaching.py                    ✅ POST /api/teach + quiz + prereqs + transcribe
│       ├── payments.py                    ✅ POST /api/payments/* + promo codes
│       └── baseline.py                    ✅ POST /api/baseline/generate + evaluate
│
├── PROGRESS.md
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/roadmap` | Generate personalized roadmap |
| POST | `/api/teach` | Subtopic-aware teaching |
| POST | `/api/quiz/generate` | Generate 3 quiz questions |
| POST | `/api/quiz/evaluate` | Evaluate quiz answers |
| POST | `/api/practice` | Generate practice exercise |
| POST | `/api/practice/evaluate` | Evaluate practice answer |
| POST | `/api/repair` | Re-explain failed concepts |
| POST | `/api/prerequisites` | Tool setup guide |
| POST | `/api/transcribe` | Groq Whisper voice input |
| POST | `/api/baseline/generate` | 5 MCQ baseline questions |
| POST | `/api/baseline/evaluate` | Score + recommend level |
| POST | `/api/payments/validate-promo` | Validate promo code |
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment signature |
| POST | `/api/progress/save-course` | Save course to DB |
| POST | `/api/progress/save` | Save progress to DB |
| POST | `/api/progress/load` | Load progress from DB |
| GET | `/health` | Health check |

---

## Neon DB Schema

```sql
-- User sessions
sessions (
    id TEXT PRIMARY KEY,
    goal TEXT,
    level TEXT,
    created_at TIMESTAMP
)

-- Roadmaps per session
courses (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    roadmap JSONB,
    created_at TIMESTAMP
)

-- Topic progress
progress (
    id SERIAL PRIMARY KEY,
    session_id TEXT,
    course_id TEXT,
    completed_topics JSONB,
    current_module INTEGER,
    current_topic INTEGER,
    updated_at TIMESTAMP,
    UNIQUE(session_id, course_id)
)

-- Payments
payments (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE,
    user_email TEXT,
    amount_paise INTEGER,
    promo_code TEXT,
    status TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    paid_at TIMESTAMP,
    created_at TIMESTAMP
)
```

---

## Gotchas (Bugs Fixed — Never Re-introduce)

| # | Bug | Fix |
|---|---|---|
| 1 | `uv init` created nested `.git` inside `backend/` | `Remove-Item -Recurse -Force backend\.git` |
| 2 | `load_dotenv()` not finding `.env` | Use `Path(__file__).parent / ".env"` explicit path |
| 3 | Groq returns code blocks with real newlines inside JSON strings | Custom `clean_json()` parser + fallback regex strip |
| 4 | `quiz_agent.py` had wrong content (circular import) | Rewrote file with correct content |
| 5 | `teaching.py` route file not created | Created manually via PowerShell `New-Item` |
| 6 | GitHub push rejected (remote had README) | `git push --force` |
| 7 | Hook destructuring placed before state declarations in App.jsx | Move all `useState` declarations above hook calls |
| 8 | Extra closing `</div>` in teaching mode JSX | Teaching mode needs exactly 2 closing divs: flex row + min-h-screen |
| 9 | `TopicView.jsx` committed to wrong location (`src/` instead of `src/components/`) | `git rm frontend/src/TopicView.jsx` |
| 10 | create_session called with wrong args (session_id passed as first arg) | DB generates session_id — call create_session(goal, level) only |
| 11 | await in onClick without async keyword | onClick={async () => { await ... }} |
| 12 | Vite serving stale bundle after file edits | Remove-Item -Recurse -Force .vite then Ctrl+Shift+R |
| 13 | phase useState deleted accidentally causing ReferenceError | Always check useState declarations when adding useEffect that references state |
| 14 | Math.PI rotation shows model's back | Use rotation={[0, 0, 0]} for front-facing, small values like 0.1 for slight angle |
| 15 | GLB file in public/ not pushed to git due to size | Add nova.glb explicitly with git add frontend/public/nova.glb |
| 16 | isSpeaking not defined in App.jsx | Move useSpeech() to App.jsx, pass speak/stop/isSpeaking as props to TopicView |
| 17 | Avatar body/legs flying off screen | Lock body bones to rest position every frame in useFrame — don't rely on track muting |
| 18 | LLM returns malformed JSON on follow-ups | Call clean_json() in teach_topic(), not just generate_practice() |
| 19 | Follow-up history sends full JSON blob | Send teaching.explanation || teaching.answer as assistant history content |
| 20 | TTS speaks wrong voice after refactor | Add female-specific voice names to preferred list in useSpeech.js |
| 21 | Avatar.jsx copy-paste from chat left old nova.glb reference | Use Invoke-WebRequest to pull file directly from GitHub — never copy-paste GLB-dependent code |
| 22 | useMemo with clipGltfs.map() as deps array causes constant re-evaluation | Use eslint-disable-next-line comment with empty [] deps array for stable clip list |
| 23 | Prompt rewrite caused 500 errors | Keep same JSON response structure — only change instructions, not field names |
| 24 | TTS speaks underscores literally | Strip underscores before passing text to speak() |
| 25 | git push fails with "Could not resolve host" | Temporary DNS issue — wait 30 seconds and retry |
| 21 | PowerShell Set-Content overwrote TopicView.jsx with Python content | Always specify backend path explicitly; use Invoke-WebRequest to restore from GitHub |
| 22 | GROQ_API_KEY renamed to GROQ_API_KEY_1 — all agents must be updated | Use Select-String across all agent files before restarting |
| 26 | llama-3.3-70b-versatile deprecated Aug 16 2026 | Migrate to openai/gpt-oss-120b — same Groq API key, just model name change |
| 27 | openai/gpt-oss-120b returns markdown asterisks in explanations | Strip ** and * in renderExplanation() and TTS speak() calls |
| 28 | New model returns JSON with syntax errors (missing commas) | Add robust JSON repair in all agent files — strip trailing commas, fix {}{} patterns |
| 29 | razorpay not in requirements.txt — Render deploy fails | Always add new pip packages to both pyproject.toml AND requirements.txt |
| 30 | Avatar looks up too much sometimes | Camera angle issue — fix in future session |
| 31 | Avatar hands cut off at right edge of panel | Increase nova panel width + shift camera right with position [0.15, -0.2, 4.2] |
---

## Coding Rules (Follow Every Session)

1. Explain concept before writing code
2. One file at a time — build and test before next file
3. Never use `&&` in PowerShell — use separate lines
4. Always prefix Python with `uv run`
5. Run `uv run ruff check --fix` before every Python commit
6. Commit working code before extending
7. Update PROGRESS.md after every completed step
8. Add every new bug to Gotchas immediately
9. Never re-introduce a bug from the Gotchas list
10. Free tools only — approved stack above
11. PowerShell curl = `Invoke-WebRequest` — use `/docs` Swagger UI instead for API testing

---

## Session Log

| Date | What was done | Commits |
|------|--------------|---------|
| July 21, 2026 | Phase 0 complete. Backend + frontend scaffold. Neon DB connected. Schema deployed. | — |
| July 21, 2026 | Phase 1 complete. Roadmap agent working. Onboarding UI built. Roadmap display with edit/remove. | — |
| July 22, 2026 | Phase 2 backend complete. Teaching agent + quiz agent + prerequisites agent. Basic TopicView built. Monaco Editor. | eb723cd |
| July 22, 2026 | Phase 2 frontend: localStorage persistence, Sidebar with lock states + jump nav, Prerequisites screen, 3-view routing in App.jsx | 9420f8a |
| July 24, 2026 | Neon DB schema migration, backend route fixes, frontend DB wiring, progress syncs end-to-end | b335840, 7e75bed |
| July 26, 2026 | Neon DB wiring complete, cross-device restore, conversation UI, understanding gate, deployed to Vercel + Render, 3D avatar built with Three.js + React Three Fiber | multiple commits |
| July 29, 2026 | TTS with Web Speech API, lipsync head nod, body bone locking, follow-up fix, teaching_agent clean_json fix | multiple commits |
| Aug 12, 2026 | RPM avatar merged to main — separate GLBs, morph targets, lip sync, mood expressions, poseSeed, debugAvatar mode. Fixed Intel UHD WebGL issue. Verified live on Vercel. | 6e6dbae |
| Aug 12, 2026 | Voice input complete — Groq Whisper /api/transcribe endpoint, mic toggle in TopicView, auto-submit after transcription. Full loop: speak → transcribe → Nova responds + speaks. | ce7cfe0 |
| Aug 13, 2026 | Teaching prompt rewritten (chunked, hook, no code dump). Practice prompt rewritten. Roadmap generates subtopics. Voice auto-submit. Italics fix. Subtopic architecture designed. | 36dce6c |
| Aug 15, 2026 | Subtopic-aware teaching, progress bar, dot indicators, dual Groq key fallback, deployed to Render | ec7d869, 441884b, 9b45443, 26ee3e4, 67bbf63 |
| Aug 16, 2026 | Supabase auth (login/signup), Razorpay Rs.1 payment gate, promo codes (MISSNOVA100/50/LEARNFREE), two-column payment UI, payments saved to Neon DB, real payment tested end-to-end | b532745, 1980b17, 3e9e359 |
| Aug 17, 2026 | Migrated all agents to openai/gpt-oss-120b (llama-3.3-70b-versatile deprecated). Fixed razorpay in requirements.txt for Render. Built baseline assessment (5 MCQ, score-based module skip). Fixed markdown asterisks in TopicView. Robust JSON parser for new model. Render redeployed successfully. | d2fd18e |
| Aug 17, 2026 | Avatar background white, camera adjusted to show hands, panel width 360px. Quiz JSON parser pending. | local only |