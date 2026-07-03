# RUDRA_SPEC.md — Project RUDRA Phase 1 Specification
# Place this file at E:\HACKATHON\RUDRA\RUDRA_SPEC.md BEFORE starting the Claude Code run.
# The goal prompt instructs Fable 5 to read this file first. This file is the single source of truth.

## Mission

Project RUDRA for Shivanchal Consultants (Bhopal, India) — a "digital twin company" website where every employee is an AI agent, deployed at rudra.shivanchal.in. Two audiences: (1) recruiters/clients who explore it instead of reading a resume, (2) Indian SME prospects who see what an AI-operated company looks like. Deliverable: a working, deployed, demoable Phase 1 — not a prototype or a plan.

## Specification — Phase 1

Monorepo at github.com/Ankit-2910/rudra with two deployables:

### Frontend (Vercel, Next.js 14 + TypeScript + Tailwind)

- A 3D company headquarters built with Three.js r128 from CDN (no THREE.OrbitControls, no CapsuleGeometry — use CylinderGeometry/SphereGeometry/custom geometries). Low-poly stylized aesthetic, dark premium theme matching Bidsight UI quality. Lobby with reception desk, plus four department rooms: CEO Office, Finance, Legal, Tenders.
- Camera-fly navigation: clicking a room or saying its name moves the camera smoothly into that room.
- Voice commands via the browser Web Speech API (SpeechRecognition for input, speechSynthesis for AI speech). Support commands in English and Hindi: "Show Finance", "Reception", "Go back", "Prepare proposal". Graceful degradation with on-screen buttons when the API is unavailable (Firefox/iOS).
- Five AI employees, each with an animated avatar card, a speaking waveform indicator, a chat panel, and a room dashboard:
  1. **RUDRA Reception** — greets visitors, routes them, captures name/company/purpose conversationally.
  2. **CEO AI** — company vision, services, and a guided tour.
  3. **Finance AI** — animated Chart.js dashboard with sample KPIs (revenue trend, project count, client health) that update while it speaks.
  4. **Legal AI** — introduces FinePrint (fine-print-two.vercel.app) as its tool; links out for live contract analysis.
  5. **Tender AI** — introduces BidSight; speaks to government tender intelligence for Indian SMEs.
- Mobile fallback: 2D isometric floor plan with identical room/employee structure. Detect WebGL + viewport and switch automatically.
- All AI conversation flows through `/api/employee` (Vercel serverless route): accepts `{ role, message, history }`, proxies to Gemini with the API key server-side only. Every Gemini call uses `thinkingBudget:0`, a 7-second timeout, `maxOutputTokens:900`, and model fallback gemini-2.5-flash → gemini-1.5-flash → gemini-1.5-pro. On total failure, return a scripted in-character fallback line so the experience never breaks.
- When Reception captures a lead (name + company + intent), POST it to the backend `/leads` endpoint.

### Backend (Render free tier, FastAPI + Supabase PostgreSQL)

- Endpoints:
  - `GET /health` — for UptimeRobot 5-minute keepalive.
  - `POST /leads` — store in Supabase, then fire the Slack webhook with lead details and send a Resend notification to shivanchal.e596@gmail.com.
  - `GET /kpis` — serve dashboard data.
- Supabase tables: `leads`, `conversations`, `kpi_snapshots`. Provide the SQL migration file.
- Environment variables (never hardcode): `DATABASE_URL`, `GEMINI_API_KEY`, `SLACK_WEBHOOK_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. List every required env var for Vercel and Render in the README with setup steps, including the BigRock CNAME record (`rudra` → `cname.vercel-dns.com`).

### Environment constraints

- Windows PowerShell — give PowerShell commands (`Invoke-WebRequest`, not `curl`) anywhere commands appear in docs.
- Local path: `E:\HACKATHON\RUDRA`. GitHub username: `Ankit-2910`.

## Working rules for this run (behavioral contract)

When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue in user-facing messages. If you are weighing a choice, give a recommendation, not an exhaustive survey. This does not apply to thinking blocks.

Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup and a one-shot operation usually doesn't need a helper. Don't design for hypothetical future requirements: do the simplest thing that works well. Avoid premature abstraction and half-finished implementations. Don't add error handling, fallbacks, or validation for scenarios that cannot happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use feature flags or backwards-compatibility shims when you can just change the code.

Before delivering any file, build locally and verify zero errors: run the Next.js production build for the frontend and start the FastAPI app for the backend, and fix anything that fails before proceeding. Always produce complete files, never partial edits or "paste this here" instructions.

Establish a method for checking your own work at an interval of one completed component as you build. Run this after every component, verifying your work with subagents against the specification.

Delegate independent subtasks to subagents and keep working while they run. Intervene if a subagent goes off track or is missing relevant context. The frontend 3D scene, the employee chat system, and the backend API are independent and can be built in parallel.

Before reporting progress, audit each claim against a tool result from this session. Only report work you can point to evidence for; if something is not yet verified, say so explicitly. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.

Pause for the user only when the work genuinely requires them: a destructive or irreversible action, a real scope change, or input that only they can provide (API keys, DNS confirmation, deploy authorization). If you hit one of these, ask and end the turn, rather than ending on a promise.

Store one lesson per file in `docs/lessons/` with a one-line summary at the top. Record corrections and confirmed approaches alike, including why they mattered. Don't save what the repo or chat history already records; update an existing note rather than creating a duplicate; delete notes that turn out to be wrong.

Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find": the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. Being readable and being concise are different things, and readability matters more.

The way to keep output short is to be selective about what you include (drop details that don't change what the reader would do next), not to compress the writing into fragments, abbreviations, arrow chains like A → B → fails, or jargon.

If you've been working for a while without the user watching (overnight, across many tool calls, since they last spoke), your final message is their first look at any of it. Write it as a re-grounding, not a continuation of your working thread: the outcome first, then the one or two things you need from them, each explained as if new. The vocabulary you built up while working is yours, not theirs; leave it behind unless you re-introduce it.

## Definition of done for this run

The repo builds clean, the README covers deployment on Vercel + Render + Supabase + DNS step by step, the five employees respond in character through the Gemini proxy with working fallbacks, voice commands navigate the 3D scene, the mobile fallback renders, and a lead submitted through Reception lands in Supabase and triggers the Slack webhook. Deliver a final summary listing exactly what was verified and exactly what still needs the user's keys or confirmation.
