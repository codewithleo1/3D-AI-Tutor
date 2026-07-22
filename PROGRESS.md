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

## Current Status

**Phase:** 2 — LMS Core Build  
**Last worked on:** July 22, 2026  
**Next session goal:** Practice step in TopicView + Quiz repair logic

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

### Known Issues (fix next session)
- [ ] Duplicate `TopicView.jsx` at `frontend/src/TopicView.jsx` — delete it
  - Fix: `git rm frontend/src/TopicView.jsx` then commit

### Next to Build — Active Learning (Highest Impact)
- [ ] Practice step in `TopicView.jsx` — learner writes answer before quiz
  - [ ] `POST /api/teach { subtopic_type: "practice" }` 
  - [ ] Exercise prompt + text area
  - [ ] "Show hint" button (reveals hints one by one)
  - [ ] "See solution" button
- [ ] Quiz repair logic
  - [ ] On fail: extract `failed_concepts` from quiz evaluation response
  - [ ] `POST /api/teach { subtopic_type: "repair", failed_concepts: [...] }`
  - [ ] Re-explain only failed concepts, then mini retry quiz
- [ ] "Explain differently" button in teaching phase
  - [ ] Sends new history turn requesting a different angle/analogy
- [ ] `subtopic_type` field in `TeachRequest` (backend)
  - [ ] Update `teaching_agent.py` prompts per type

---

## Phase 3 — 3D Avatar 🔒 NOT STARTED

- [ ] `Avatar.jsx` — Ready Player Me + Three.js
- [ ] Mood states: `idle | explaining | thinking | coding | quiz | happy | concerned | encouraging`
- [ ] Avatar mood mapped to teaching phases
- [ ] Lip sync with Web Speech API

---

## Phase 4 — Voice + Polish + Deploy 🔒 NOT STARTED

- [ ] Groq Whisper voice input
- [ ] Spaced repetition reminders (7-day review badge in sidebar)
- [ ] Export progress as PDF
- [ ] Mobile sidebar — hamburger menu, slide-in drawer
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Render
- [ ] README with demo GIF

---

## Actual Folder Structure (as of July 22, 2026)

```
3D-AI-Tutor/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                        ✅ 3-view router + teaching mode
│       ├── index.css                      ✅ brand system
│       ├── main.jsx                       ✅ React root
│       ├── components/
│       │   ├── Prerequisites.jsx          ✅ setup guide screen
│       │   ├── Sidebar.jsx                ✅ module/topic nav
│       │   └── TopicView.jsx              ✅ teach + quiz UI
│       └── hooks/
│           └── useCourseProgress.js       ✅ localStorage progress
│
├── backend/
│   ├── main.py                            ✅ FastAPI app + CORS
│   ├── pyproject.toml
│   ├── agents/
│   │   ├── roadmap_agent.py               ✅ curriculum generation
│   │   ├── teaching_agent.py              ✅ topic explanation + follow-up
│   │   ├── quiz_agent.py                  ✅ generate + evaluate quiz
│   │   └── prerequisites_agent.py         ✅ tool setup guide
│   ├── db/
│   │   └── neon.py                        ✅ PostgreSQL connection
│   └── routes/
│       ├── chat.py                        ✅ POST /api/roadmap
│       └── teaching.py                    ✅ POST /api/teach + quiz + prereqs
│
└── PROGRESS.md
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