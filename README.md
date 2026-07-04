# Project RUDRA — Shivanchal's AI Digital Twin Company

A "digital twin company" website where every employee is an AI agent, live at
**https://rudra.shivanchal.in**. Visitors explore a low-poly 3D headquarters,
talk to five AI employees by text or voice (English + Hindi), and the
receptionist captures leads that land in Supabase and alert Slack + email.

| Employee | Room | What it does |
|---|---|---|
| **RUDRA** — Reception AI | Lobby | Greets, routes, captures name/company/purpose as a lead |
| **Gokarna** — CEO AI | CEO Office | Vision, services, guided tour |
| **Manibhadra** — Finance AI | Finance | Animated Chart.js KPI dashboard that reacts while it speaks |
| **Virabhadra** — Legal AI | Legal | Introduces **FinePrint** ([fine-print-two.vercel.app](https://fine-print-two.vercel.app)) for live contract analysis |
| **Bhairava** — Tender AI | Tenders | **BidSight** — government tender intelligence for Indian SMEs |

## Architecture (₹0/month)

- **Frontend** — Next.js 14 + TypeScript + Tailwind on Vercel. Three.js r128
  (CDN) 3D headquarters with camera-fly navigation; 2D isometric floor plan on
  mobile / no-WebGL browsers. Voice via the browser Web Speech API
  (SpeechRecognition + speechSynthesis) with on-screen buttons as fallback.
- **AI proxy** — `/api/employee` Vercel serverless route. Gemini API key stays
  server-side. Every call: `thinkingBudget: 0` (2.5 models), 7s timeout,
  `maxOutputTokens: 900`, model fallback `gemini-2.5-flash → gemini-1.5-flash →
  gemini-1.5-pro`, and a scripted in-character line if everything fails.
- **Backend** — FastAPI on Render free tier: `GET /health` (UptimeRobot
  keepalive), `POST /leads` (Supabase insert → Slack webhook → Resend email),
  `POST /conversations` (transcript logging), `POST /events/dwell` (dwell-time
  Slack signal), `GET /kpis` (dashboard data with built-in sample fallback).
- **Database** — Supabase PostgreSQL (`leads`, `conversations`,
  `kpi_snapshots`).

### Extra features

- **Guided tour** — "🎬 Take the Tour" flies the camera through Gokarna →
  Manibhadra → Virabhadra → Bhairava, each auto-asking a question and
  advancing once the reply finishes (with a watchdog so a stalled TTS
  callback can never hang the tour).
- **Cross-room memory** — once Reception captures a visitor's name, every
  other employee greets and addresses them by it (threaded through
  `/api/employee`'s system instruction).
- **Dwell-time Slack alerts** — staying in one room past 45s fires a one-time
  "👀 exploring Finance" ping to Slack via `/events/dwell`, once per room per
  visit.
- **Social preview card** — `app/opengraph-image.tsx` generates the
  LinkedIn/WhatsApp share image at request time (Next.js `next/og`), matching
  the live brand palette.

## Repository layout

```
frontend/   Next.js app (Vercel)
backend/    FastAPI app (Render)
supabase/   SQL migrations
docs/       lessons learned during the build
render.yaml Render blueprint for the backend
```

## Local development (Windows PowerShell)

```powershell
# Frontend — http://localhost:3000
cd E:\HACKATHON\RUDRA\frontend
npm install
Copy-Item .env.example .env.local   # then fill in values (optional locally)
npm run dev

# Backend — http://127.0.0.1:8000
cd E:\HACKATHON\RUDRA\backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn main:app
```

Without any env vars the app still works: employees answer with scripted
in-character lines, `/kpis` serves sample data, and `/leads` reports which
steps it skipped. Point the frontend at a local backend by putting
`NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000` in `frontend/.env.local`.

Smoke-test the backend:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health | Select-Object -ExpandProperty Content
Invoke-WebRequest http://127.0.0.1:8000/kpis | Select-Object -ExpandProperty Content
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/leads -ContentType "application/json" -Body '{"name":"Test","company":"Acme","purpose":"demo"}'
```

## Deployment — step by step

### 1. Supabase (database)

1. Create a project (region `ap-south-1` / Mumbai) or reuse an existing one.
2. SQL Editor → paste and run `supabase/migrations/001_init.sql`. This creates
   `leads`, `conversations`, `kpi_snapshots` and seeds one KPI snapshot.
3. Project Settings → Database → copy the **Session Pooler** connection string
   (`aws-1-ap-south-1.pooler.supabase.com`). This is your `DATABASE_URL`.

### 2. Render (backend)

1. Push this repo to GitHub (see step 5) and in the Render dashboard choose
   **New → Web Service**, connect `Ankit-2910/rudra`.
2. Settings: **Root Directory** `backend`, **Build Command**
   `pip install -r requirements.txt`, **Start Command**
   `uvicorn main:app --host 0.0.0.0 --port $PORT`, plan **Free**.
   (Or use **New → Blueprint** and let `render.yaml` configure it.)
3. Environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Supabase Session Pooler string from step 1 |
   | `SLACK_WEBHOOK_URL` | your Slack incoming webhook |
   | `RESEND_API_KEY` | your Resend key |
   | `RESEND_FROM_EMAIL` | `intel@shivanchal.in` (verified domain) |

4. Deploy, then verify:

   ```powershell
   Invoke-WebRequest https://<your-service>.onrender.com/health | Select-Object -ExpandProperty Content
   ```

5. **Keepalive:** the free tier sleeps after 15 idle minutes. In UptimeRobot
   add an HTTP monitor for `https://<your-service>.onrender.com/health` with a
   5-minute interval.

### 3. Vercel (frontend)

1. Vercel → **Add New → Project**, import `Ankit-2910/rudra`.
2. **Root Directory:** `frontend` (framework auto-detects Next.js).
3. Environment variables:

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | Google AI Studio key (server-side only) |
   | `NEXT_PUBLIC_BACKEND_URL` | `https://<your-service>.onrender.com` |

4. Deploy. Verify the proxy:

   ```powershell
   Invoke-RestMethod -Method Post -Uri https://<your-app>.vercel.app/api/employee -ContentType "application/json" -Body '{"role":"ceo","message":"What does Shivanchal do?"}'
   ```

### 4. DNS (BigRock)

1. BigRock DNS management for `shivanchal.in` → add a **CNAME** record:
   host `rudra`, value `cname.vercel-dns.com`, TTL default.
2. Vercel → Project → Settings → Domains → add `rudra.shivanchal.in`.
   Certificate issues automatically once the record propagates (~5 minutes).

### 5. GitHub

```powershell
cd E:\HACKATHON\RUDRA
git init
git add .
git commit -m "RUDRA Phase 1"
git branch -M main
git remote add origin https://github.com/Ankit-2910/rudra.git
git push -u origin main
```

Vercel and Render redeploy automatically on every push to `main`.

## All environment variables at a glance

| Where | Variable | Purpose |
|---|---|---|
| Vercel | `GEMINI_API_KEY` | Gemini proxy (server-side only) |
| Vercel | `NEXT_PUBLIC_BACKEND_URL` | Render backend base URL |
| Render | `DATABASE_URL` | Supabase Session Pooler connection |
| Render | `SLACK_WEBHOOK_URL` | Lead alerts to Slack |
| Render | `RESEND_API_KEY` | Lead notification emails |
| Render | `RESEND_FROM_EMAIL` | Verified sender address |

No secret is ever committed; `.env*` files are gitignored. Copy the
`.env.example` files as a checklist.

## Voice commands

Works in Chrome/Edge (mic button, bottom bar). English and Hindi, for example:
"Show Finance", "Reception", "Go back", "Prepare proposal", "फाइनेंस दिखाओ",
"वापस", "टेंडर". Firefox/iOS get the same navigation through the on-screen
room buttons; AI speech uses speechSynthesis wherever available (toggle 🔊 in
the chat panel).
