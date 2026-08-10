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

## Verification status
- GLB validated (uncompressed, valid, serves 200; full 10.7 MB downloads in ~0.24s via ingress).
- Frontend compiles clean; main onboarding UI renders correctly.
- 3D RENDER NOT visually confirmed in this environment: the headless screenshot tool cannot capture
  the WebGL canvas frame (even an asset-free box won't paint). User must confirm in a real browser via
  `<preview-url>/?debugAvatar`.

## Backlog / next
- P1: Run backend here (needs GROQ_API_KEY + Neon DATABASE_URL) to test full onboarding→teaching→avatar flow.
- P1: Add a body idle animation (e.g. Mixamo idle retargeted to the RPM rig) so the avatar isn't static.
- P2: Wire real visemes — `useSpeech.js` returns `isSpeaking` but not `currentViseme`; add phoneme/viseme timing.
- P2: Deploy verification on Vercel with `rpm_test.glb` committed.
