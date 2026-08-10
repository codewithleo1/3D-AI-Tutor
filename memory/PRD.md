# Miss Nova — AI Learning Companion (PRD / Working Notes)

## Problem statement (verbatim)
"Check this repo - only issue I am facing is that - my avatar model is not visible in frontend.
But I want you to check everything in repo then whole repo and help me with this project."
Follow-up: user switched the model to a Ready Player Me model (`rpm_test.glb`) that has lips/expressions,
and shared latest local files (Avatar.jsx, App.jsx, Sidebar.jsx, main.jsx). Avatar was not visible.

## Architecture
- Frontend: React 19 + Vite 8 + Tailwind v4 (folder `/app/frontend`, dev on port 3000 in this env).
- 3D avatar: three.js + @react-three/fiber + @react-three/drei, model in `/app/frontend/public/rpm_test.glb`.
- Backend: FastAPI + `uv` (folder `/app/backend`, `main:app`), Groq LLaMA 3.3-70B, Neon PostgreSQL. (NOT running in this env — needs GROQ_API_KEY + DATABASE_URL.)
- Live deploys (user's): Frontend Vercel (3-d-ai-tutor.vercel.app), Backend Render.

## Root cause of "avatar not visible"
1. `Avatar.jsx` loaded `useGLTF("/nova.glb")` (old model) while the intended lip-sync model is `rpm_test.glb`.
   If `nova.glb` is absent/stale the avatar panel is empty.
2. No `<Suspense>` boundary around the model — the ~10 MB GLB has no graceful load path.
3. `rpm_test.glb` has ZERO baked animations (only ARKit + viseme morph targets), so the entire
   `MOOD_TO_ANIMATION` system was dead — the avatar would be a frozen statue with no movement.

## What was implemented (2026-06 session / rebuilt on 2026-08 files)
- Synced repo to user's latest files (App.jsx, Sidebar.jsx, main.jsx).
- Rewrote `frontend/src/components/Avatar.jsx`:
  - Loads `/rpm_test.glb` (+ `useGLTF.preload`).
  - Wrapped model in `<Suspense fallback={null}>`; added a "Loading Miss Nova…" layer + second fill light.
  - Morph-driven life (model has no clips): eye-blink scheduler, subtle head/neck idle sway,
    talking mouth via `jawOpen`/`mouthOpen` (+ optional `viseme_*` when `currentViseme` provided),
    smooth mood expressions using real ARKit blendshape names present in this model.
  - Framing kept (scale 1, position [0,-0.9,0], camera z=3 fov 60) — correct for this upright ~1.8u model.
- Added `?debugAvatar` route in `main.jsx` to view the avatar standalone (no backend needed).
- Env wiring for this preview: `frontend/.env` VITE_API_URL, vite.config server host/port/allowedHosts,
  `start` script in package.json.

## Verification status (VERIFIED WORKING in preview)
- Backend live here: GROQ_API_KEY + Neon DATABASE_URL set in `backend/.env`; `backend/server.py` shim exposes `app` for supervisor; deps installed in /root/.venv; Neon schema applied (sessions/courses/progress).
- Curl-verified through public ingress: /health ok, POST /api/roadmap (Groq), /api/progress/save-course (DB), /api/prerequisites, /api/teach — all 200/success.
- Testing agent (real browser w/ WebGL) confirmed: `?debugAvatar` renders the 3D RPM avatar; full onboarding→roadmap→finalize→prerequisites→teaching flow works and the right-hand Nova panel shows the rendered avatar. No console/React errors.
- Cosmetic fix applied: "Loading Miss Nova…" hint now hides after the model loads (was bleeding through the model).

## To ship to user's own repo / deploys
- Copy `frontend/src/components/Avatar.jsx` (the fix) and keep `frontend/public/rpm_test.glb` committed (Vercel).
- On Render backend, set env: DATABASE_URL, GROQ_API_KEY, ALLOWED_ORIGINS (include the Vercel origin).

## Enhancements added (2026-06 session, verified by testing agent iteration_2)
- IDLE BODY MOTION: bundled Ready Player Me idle clip `public/idle_feminine.glb` (Mixamo-compatible rig); Avatar.jsx loads it via a 2nd useGLTF + useAnimations and plays it looped, retargeting onto the RPM avatar by bone name. Result: gentle breathing/gesture motion instead of a static statue.
- REAL LIP SYNC: `useSpeech.js` now returns `currentViseme` and drives approximate visemes from the spoken text (onboundary + char→viseme cursor). Avatar applies `viseme_*` morphs + jaw while speaking.
- VOICE INPUT (Groq Whisper): backend `POST /api/transcribe` (whisper-large-v3-turbo) verified 200. TopicView follow-up row has a mic button (data-testid voice-input-btn) → MediaRecorder → /api/transcribe → auto-asks Miss Nova. Includes graceful errors when mic is blocked/unsupported.
- CAMERA FRAMING: head-and-shoulders bust shot (camera z=1.35 fov 30, model y=-1.55).

## Files changed this session (to copy to user's repo)
- frontend/src/components/Avatar.jsx, frontend/src/hooks/useSpeech.js, frontend/src/components/TopicView.jsx, frontend/src/index.css (pulse keyframe)
- NEW asset: frontend/public/idle_feminine.glb (commit for Vercel)
- backend/routes/teaching.py (+ /api/transcribe)

## Backlog / next
- P1: Run backend here (needs GROQ_API_KEY + Neon DATABASE_URL) to test full onboarding→teaching→avatar flow.
- P1: Add a body idle animation (e.g. Mixamo idle retargeted to the RPM rig) so the avatar isn't static.
- P2: Wire real visemes — `useSpeech.js` returns `isSpeaking` but not `currentViseme`; add phoneme/viseme timing.
- P2: Deploy verification on Vercel with `rpm_test.glb` committed.
