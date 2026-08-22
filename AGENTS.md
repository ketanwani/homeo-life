# Homeo Life — Project Context

This file is the shared source of truth for whichever AI coding tool is working on this repo
(Codex CLI reads `AGENTS.md` natively; Claude Code's `CLAUDE.md` imports this file via `@AGENTS.md`).
**Keep this file up to date as you work** — update "Current status" and "Next steps" at the end of
any session so the next tool/session (or the next person) picks up with full context. Git history
(`git log`) is the detailed changelog; this file is the standing summary.

## Original brief

> This is a website: https://www.myhomeolife.com/. I want to modernize this website, create a new
> one which is far better looking, professional and has more features, especially AI related.
>
> **User facing features**
> - Users can explore the website to understand more about the doctor, read other patients'
>   testimonials, reviews, FAQ etc.
> - It should allow users to click to WhatsApp which connects to an AI agent which can answer
>   queries from patients related to their treatment, appointment booking, appointment
>   reschedule etc.
> - Integrate Calendly for managing the appointments
> - Blogs written by doctor to read
> - Link to reels/videos made by the doctor
> - Make it mobile responsive and also better looking on phone and not just on tablet/laptop
> - Read case stories published by the doctor
> - Instagram and TikTok links
>
> **Doctor features (logged in)**
> - Allow doctor to manage their calendar backed by Calendly
> - Write a blog, allow attaching images/videos if needed
> - Manage patient appointments etc.
> - A page to update and publish FAQs
> - Doctor should be able to update their availability, again backed by calendar
> - Doctor should be able to create/update case stories along with photos/videos
>
> For click-to-WhatsApp: can we configure a new WhatsApp account that acts as a frontend AI agent
> responding to user queries, then delegates to the doctor when it can't resolve something — with
> delegation done so the doctor can keep chatting with the patient but from their own, different
> WhatsApp Business account? If not possible, what's the alternative?

## Decision: WhatsApp AI → doctor handoff

Answered but **not yet implemented**. WhatsApp Cloud API ties a conversation thread to one business
phone number — you cannot silently "transfer" a live thread to a second business number and have it
look continuous to the patient. Two real options:

1. **Single number, shared inbox (recommended).** One WhatsApp Business number, connected to our
   backend via the Cloud API. The AI answers first. On escalation, the doctor takes over the *same*
   thread from a web inbox inside the doctor dashboard (an Intercom/Front-style panel: message list,
   reply box, "AI active / human active" toggle per thread) — not from her personal WhatsApp Business
   app. Patient experience stays on one number throughout. This is the standard pattern used by
   WhatsApp CX platforms (Twilio, 360dialog, Freshchat, etc.). Requires building the inbox UI.
2. **Two numbers, manual bridge.** AI runs on one number; on escalation it sends the patient the
   doctor's separate WhatsApp Business number (or the doctor is pinged and calls/messages the patient
   directly). Simpler to build (doctor keeps using her existing WhatsApp Business app, no inbox UI
   needed) but breaks continuity — patient has to switch numbers, thread history doesn't carry over
   automatically (we'd forward a text summary).

Leaning toward **option 1**, with a notification bridge on top: when a thread escalates, ping the
doctor (WhatsApp template message to her personal number, or just surface it in the dashboard with a
badge/sound) so she knows to open the inbox — she isn't required to watch it live all day.
**This still needs user sign-off before building** — it determines a chunk of DB schema and UI.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript, deployed via `output: "standalone"`.
- PostgreSQL via `pg` (`lib/db.ts`). **Falls back to in-memory seed data (`lib/seed.ts`) when
  `DATABASE_URL` is unset** — this is why the site works with zero setup, but also means "it works
  locally" doesn't prove the DB path works. Always test both modes before calling a DB feature done.
- Zod for webhook payload validation.
- lucide-react icons, no UI/component library — hand-rolled CSS in `app/globals.css` (~1200 lines).
- Docker: multi-stage `Dockerfile` + `docker-compose.yml` (app + postgres, schema auto-applied via
  `db/schema.sql` on container init).
- No auth library wired in yet.

## Workflow: Postgres + Docker for everything

Decided 2026-08-22: stop relying on the in-memory seed fallback for real work — always run against
Postgres via `docker compose up --build -d`. The in-memory fallback in `lib/db.ts` still exists and
stays intact (useful if Docker isn't running), but it should not be the thing you're testing against.
`db/seed.sql` (new) loads the same fixture content into real Postgres on first container boot, via
`docker-entrypoint-initdb.d` alongside `db/schema.sql` — so the dockerized DB isn't empty. If you
change the schema, remember `docker-entrypoint-initdb.d` scripts only run once against an empty data
directory: `docker compose down -v` (drops the `postgres-data` volume) before `up --build` again to
re-run them, or write an actual migration instead once this matters in a shared/deployed environment.

## Current status (as of 2026-08-22)

Everything below is a **visual/UI shell with mock or stubbed data** unless noted. `npm run build`
passes cleanly.

**Public site (`app/page.tsx`)** — done as static/marketing UI:
hero, doctor bio, services grid (reads from `getServices()`), AI-WhatsApp promo section (the chat
bubbles shown are hardcoded copy, not a live demo), case stories, testimonials, blog list, FAQ
accordion, video/social links section, footer. Reads content through `lib/db.ts`, which reads real
Postgres rows if `DATABASE_URL` is set, otherwise the seed fixtures.

**Booking widget (`app/ui/booking-widget.tsx`)** — client-side only. Service/date/time selection
works in the UI; date and time-slot options are **hardcoded arrays**, not real Calendly availability.
Submit button just flips local `submitted` state — **no request is sent anywhere, nothing is
persisted, no Calendly event is created.**

**Doctor dashboard (`app/doctor/page.tsx`, `app/ui/doctor-dashboard.tsx`)** — **auth is now real**
(NextAuth v5 / Auth.js, Credentials provider, JWT sessions). `/doctor/**` is protected by
`middleware.ts`; unauthenticated requests redirect to `/login`. Four dashboard tabs (Calendar,
Appointments, Content editor, FAQ editor) still don't save anything — that's next (see "Next steps").

**Auth implementation details, if picking this back up:**
- `auth.config.ts` — Edge-safe shared config (pages, session strategy, `trustHost: true`, the
  `authorized`/`jwt`/`session` callbacks). Deliberately has **no** Node-only imports — both
  `middleware.ts` (Edge runtime) and `auth.ts` (Node runtime) build on it. If you add anything to
  auth config, decide which file it belongs in; putting a Node import in `auth.config.ts` breaks the
  Edge middleware build again (bcrypt/pg-in-Edge was exactly this bug, fixed by the split).
- `auth.ts` — full NextAuth instance: Credentials provider, `authorize()` calls
  `getDoctorByEmail()` (`lib/db.ts`) then `bcrypt.compare`.
- `lib/db.ts` → `getDoctorByEmail()` — Postgres `doctors` table when `DATABASE_URL` is set;
  otherwise falls back to a single account from `DOCTOR_EMAIL`/`DOCTOR_PASSWORD_HASH`/`DOCTOR_NAME`
  env vars (dev-only, no Postgres needed). Same fallback pattern as the rest of `lib/db.ts`.
- **Creating/resetting the doctor account:** `npm run create-doctor -- <email> <password> "Full Name"`
  (upserts into Postgres — needs `DATABASE_URL` set, e.g. via `.env` or inline on the command).
  `npm run hash-password -- <password>` if you need a raw bcrypt hash instead (for the env-var
  fallback path). Neither the schema nor `db/seed.sql` create a doctor row — passwords must be
  hashed at runtime, not baked into a committed SQL file.
- `AUTH_SECRET` is required (NextAuth throws in production without it). `docker-compose.yml` ships a
  local/dev-only default so `docker compose up` works with zero setup — override it for anything
  beyond local dev (`npx auth secret` to generate one).
- Verified end-to-end against the dockerized Postgres: wrong password → `CredentialsSignin` redirect
  to `/login`; correct password → session cookie set → `/doctor` renders with the doctor's name and a
  working sign-out; sign-out clears the session and `/doctor` redirects to `/login` again.

**API routes:**
- `app/api/calendly/webhook/route.ts` — validates payload shape with zod, returns 200. **Does not
  verify the Calendly signature and does not write to Postgres.**
- `app/api/whatsapp/webhook/route.ts` — GET handshake (verify-token check) is real and correct. POST
  just echoes `{ ok: true }` — no message storage, no AI call, no reply sent, no escalation logic.

**Database** — `db/schema.sql` defines `patients`, `services`, `appointments`, `content_posts`,
`testimonials`, `whatsapp_threads`. No migration tool (raw SQL file applied via docker-entrypoint-initdb
on first container boot only — no re-run/versioning story yet). No seed script that loads
`lib/seed.ts` data into real Postgres (so a fresh DB has empty tables until someone inserts rows).

**Not started:**
- Any real Calendly API calls (create/list/reschedule event types, availability) — only the inbound
  webhook receiver stub exists.
- Any real WhatsApp Cloud API calls (sending messages) — `WHATSAPP_ACCESS_TOKEN` /
  `WHATSAPP_PHONE_NUMBER_ID` env vars exist but are unused in code.
- AI integration — `OPENAI_API_KEY` env var exists but is unused in code; no model calls anywhere.
- The AI ↔ doctor WhatsApp handoff (see decision above).
- Media upload/storage for blog/case-story images & videos (file input exists in the dashboard UI,
  nothing behind it — no S3/Cloudinary/Vercel Blob wiring).
- Mobile responsiveness pass — only 2 `@media` breakpoints exist in `globals.css` (~1200 lines); the
  "mobile-first" framing on the roadmap card is aspirational copy, not a verified property yet.
- TikTok link is a `#` placeholder (Instagram link is real).
- Tests (none exist).

## Conventions

- Content types live in `lib/types.ts`; `lib/db.ts` is the only place that talks to Postgres, and
  every function there has an in-memory fallback — keep that symmetry when adding new queries.
- Money is stored/passed as integer cents; format with `formatMoney()` in `lib/site.ts`.
- Env vars are documented in `.env.example` — add new ones there whenever you introduce one, and to
  `docker-compose.yml`'s `app.environment` block too.
- No component/UI library — match the existing hand-written class-name + CSS pattern in
  `app/globals.css` rather than introducing Tailwind/etc. mid-project unless asked.

## Next steps (suggested order — confirm with user before starting a big one)

1. ~~Doctor auth~~ — done 2026-08-22 (NextAuth Credentials, see above).
2. Get user sign-off on the WhatsApp handoff approach above (it shapes schema + a chunk of UI).
3. Wire booking widget → real appointment creation (Postgres insert; Calendly integration or a
   native slot system — need to decide which).
4. Calendly API integration (availability, create/reschedule) — or decide to go fully native instead
   of Calendly, per the booking-widget UI already built.
5. WhatsApp Cloud API send + OpenAI-backed AI responder, with the chosen handoff design.
6. Doctor CMS mutations (blog/case-story/FAQ create-update-publish) + media upload. Now unblocked by
   auth — these routes/actions should require a session (see `middleware.ts` matcher — extend it to
   `/api/doctor/:path*` once doctor-only API routes exist).
7. Mobile responsiveness pass across `globals.css`.
