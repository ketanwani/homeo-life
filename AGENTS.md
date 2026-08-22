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

## Gotcha: don't serve runtime-written files from public/ in the standalone build

Discovered 2026-08-22 while building doctor photo upload. Next.js's `output: "standalone"`
production server (`server.js`) builds its static-asset route table once at **process boot** by
scanning `public/`. A file created under `public/` *after* the process has started — e.g. a file a
user uploads at runtime — 404s until the container restarts, even though the file is genuinely on
disk and readable. Confirmed by reproducing it directly: wrote a file into the running container's
mounted volume, curled its URL → 404; restarted the container (no rebuild) → 200. A doctor uploading
a photo for the first time obviously can't restart the container, so this would have silently broken
the feature.

Fix: never rely on the `public/` static passthrough for anything written at runtime. Serve it through
a normal dynamic Route Handler instead (`app/api/doctor-photo/route.ts`, `export const dynamic =
"force-dynamic"`) — those re-read from disk on every request with no boot-time manifest involved.
Storage itself still lives on disk (a Docker volume, same idea as before), just outside `public/` now
(`uploads/` at the repo root, see `lib/doctor-photo.ts`) so it's not accidentally routed through the
static path again by a future edit. Apply the same pattern to any future runtime-uploaded file (blog
images, case-story media, etc.) — do not put runtime uploads under `public/`.

## Gotcha: statically-generated pages prerender against seed data, not the real DB, in Docker

Discovered 2026-08-22 while verifying the booking feature. `docker build` runs `next build` in a
stage with no `DATABASE_URL` (that's only injected via `docker-compose.yml`'s `environment:` at
*container runtime*, never at build time). So any statically-rendered page that reads from `lib/db.ts`
gets prerendered using the in-memory seed fallback, not live Postgres data — `/` briefly shows
`lib/seed.ts`'s fixture availability/services/etc. right after a fresh `docker compose up --build`,
until ISR revalidates it (see `export const revalidate = 300` in `app/page.tsx`) or a mutation calls
`revalidatePath("/")`. This isn't a bug exactly (it self-heals within the revalidate window) but it
will confuse debugging right after a rebuild — if `/` looks like it's showing stale/fixture data
immediately after `docker compose up --build`, this is why; wait ~5min or trigger a mutation that
revalidates that path before concluding something's actually broken.

## Gotcha: don't derive a weekday from `new Date(dateStr + "T00:00:00+08:00").getUTCDay()`

Real bug, caught and fixed 2026-08-22 while building slot generation (`lib/booking.ts`). That instant
is `2026-08-23T16:00:00Z` for the date string `"2026-08-24"` — `.getUTCDay()` reads the *UTC calendar
day* (the 23rd), silently returning the **previous** day's weekday. Every date's computed weekday was
off by one, so Monday's slots were generated from Sunday's (closed) availability, Tuesday's from
Monday's, etc. Caught by writing a standalone reproduction of just the weekday math and comparing
against known dates — the actual homepage output (repeating Tue/Wed/Sat pattern instead of the real
Mon–Fri availability) was the tell. Fix: `getWeekday()` in `lib/booking.ts` formats the weekday
directly from the original `Date` instant via `Intl.DateTimeFormat(..., { timeZone, weekday: "short"
})` — no reparse-through-UTC step to introduce the shift. Any future date arithmetic in this codebase
should do the same: format directly from the instant you have, don't round-trip through a date string
and back.

## Decision: doctor availability (Calendly can't be the write target)

Checked Calendly's API docs directly (developer.calendly.com + their community forum, staff-confirmed)
before building anything: **Calendly's API is read-only for availability.** There is no endpoint —
not in the classic API, not in the newer "Scheduling API" — to create or update a user's working
hours. You can only read whatever a user configured inside Calendly's own UI. So "doctor sets hours
in our app → push to Calendly via API" is not buildable; "doctor sets hours in Calendly → we read it"
is the only Calendly-integrated option that actually works.

Decided 2026-08-22: go **fully native**. Doctor availability lives entirely in our own
`doctor_availability` Postgres table; Calendly is not involved in availability at all. Implemented:
- `db/schema.sql` — `doctor_availability` table, one row per weekday (0=Sunday..6=Saturday, JS
  `Date#getDay()` convention), `is_available` + `start_time`/`end_time`, with a check constraint that
  an available day must have both times set and start < end.
- `lib/db.ts` — `getAvailability()` / `setAvailability()`, same Postgres-or-in-memory-fallback
  pattern as the rest of the file (`lib/seed.ts` now exports a mutable `availability` array for the
  no-DB case).
- `app/doctor/actions.ts` — `saveAvailability` server action (checks `auth()` itself, not just
  relying on middleware, since server actions are independently callable). Validates each open day
  has start < end before writing.
- `app/ui/doctor-dashboard.tsx` — the Calendar tab is now a real form: all 7 days, a checkbox to open
  a day plus start/end `<input type="time">`, wired via `useActionState`. The old "Sync" button is
  gone — there is nothing to sync to anymore.
- Verified end-to-end against the dockerized Postgres: wrote a change directly through the same code
  path `setAvailability()` uses, confirmed it persisted, confirmed the page re-fetched and rendered
  the new checked-state and times correctly, then restored the original defaults.

This still leaves the booking widget (`app/ui/booking-widget.tsx`) showing **hardcoded** date/time
options unrelated to this table — turning `doctor_availability` into actual bookable slots (minus
existing appointments) is the natural next step and is *not done yet*.

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

**Booking widget (`app/ui/booking-widget.tsx`) — real, done 2026-08-22.** Native (not Calendly-backed,
per the availability decision below). `lib/booking.ts` → `getAvailableSlotsByService()` turns
`doctor_availability` + existing appointments into real bookable slots per service (durations differ,
so the valid slot set genuinely differs per service — computed once in `app/page.tsx`, passed down as
a `Record<serviceId, DaySlots[]>` prop, not fetched client-side). 21-day rolling window, 30min step,
60min minimum lead time, Singapore timezone throughout (fixed +08:00 offset, no DST to worry about).
Submitting calls `requestAppointment` (`app/actions.ts`, public/no-auth) → `createAppointment()`
(`lib/db.ts`) which does a real conflict check (looks up each existing appointment's own duration via
its `service_title`, defaulting 60min if unmatched) inside a transaction before inserting a `patients`
+ `appointments` row. Both `/` and `/doctor` get `revalidatePath`'d on success. Verified end-to-end
against the dockerized Postgres: exact-slot double-booking rejected, overlapping-but-offset booking
rejected, adjacent non-overlapping booking accepted, both landing correctly in the doctor's
Appointments tab. See the two gotchas above (weekday-off-by-one bug found and fixed here; build-time
seed-data prerendering caught mid-verification) if picking this back up.

**Doctor dashboard (`app/doctor/page.tsx`, `app/ui/doctor-dashboard.tsx`)** — **auth is now real**
(NextAuth v5 / Auth.js, Credentials provider, JWT sessions). `/doctor/**` is protected by
`middleware.ts`; unauthenticated requests redirect to `/login`. Five tabs: Calendar (real, see
availability decision below), **Profile photo (real, see below)**, and Appointments/Content
editor/FAQ, which still don't save anything — that's next (see "Next steps").

**Doctor profile photo — done 2026-08-22.** Uploading replaces the homepage "About the doctor" image
(previously a hardcoded Unsplash stock photo, `app/page.tsx`). `app/doctor/actions.ts` →
`uploadDoctorPhoto` (auth-checked, JPEG/PNG/WebP only, 5MB cap, deletes any previous `doctor-photo.*`
before writing the new one). Storage is a plain file in `uploads/` at the repo root (Docker volume
`doctor-uploads`, see docker-compose.yml) — **not** `public/`, and specifically served through
`app/api/doctor-photo/route.ts` rather than Next's static-folder passthrough; see the gotcha above for
why that distinction matters (it's not a style choice, the naive version silently 404s on every
doctor's first upload). `lib/doctor-photo.ts` → `getDoctorPhotoUrl()` returns the Unsplash fallback
URL when nothing's been uploaded yet, else `/api/doctor-photo?v=<mtime>` (cache-busted per upload).
Verified end-to-end against the dockerized container, including reproducing and then re-testing the
exact "brand-new file, zero restarts" scenario the gotcha above describes.

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
- Any real Calendly API calls — moot for availability now (see decision above: Calendly's API can't
  write availability, so we went fully native). Calendly's inbound webhook receiver stub still exists
  and is unrelated to this decision; whether Calendly has any role left in this project (e.g. nothing)
  is an open question.
- Any real WhatsApp Cloud API calls (sending messages) — `WHATSAPP_ACCESS_TOKEN` /
  `WHATSAPP_PHONE_NUMBER_ID` env vars exist but are unused in code.
- AI integration — `OPENAI_API_KEY` env var exists but is unused in code; no model calls anywhere.
- The AI ↔ doctor WhatsApp handoff (see decision above).
- Media upload/storage for blog/case-story images & videos (file input exists in the dashboard UI,
  nothing behind it). The doctor profile photo (done, see above) establishes the pattern to reuse:
  disk storage under `uploads/` + a dynamic route handler to serve it, not `public/` + S3/Cloudinary/
  Vercel Blob aren't needed for this project's scale, just follow the same approach.
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

## Decision: deployment / Wix cutover timing

Decided 2026-08-22: the live site (myhomeolife.com, currently on Wix) stays on Wix for now. Do NOT
suggest or plan a domain cutover until the core gaps below are closed — the site would otherwise
replace Wix's working booking/contact flow with fake ones (booking widget doesn't persist, no real
WhatsApp AI, no Calendly). Revisit deployment once real appointment creation (next item) and ideally
the WhatsApp AI piece are done. When that conversation happens: this project is built for a VPS +
Docker Compose deployment (Caddy/nginx for HTTPS), not serverless — the photo upload feature
specifically depends on persistent local disk (a Docker volume) and would need rework (e.g. S3) on a
platform like Vercel.

## Next steps (suggested order — confirm with user before starting a big one)

1. ~~Doctor auth~~ — done 2026-08-22 (NextAuth Credentials, see above).
2. ~~Doctor availability~~ — done 2026-08-22 (fully native, see decision above).
3. ~~Doctor profile photo~~ — done 2026-08-22 (see above).
4. ~~Real appointment booking~~ — done 2026-08-22 (see above). The Wix-cutover decision above named
   this as one of the gaps blocking a domain switch — worth re-checking that decision now.
5. Get user sign-off on the WhatsApp handoff approach above (it shapes schema + a chunk of UI).
6. WhatsApp Cloud API send + OpenAI-backed AI responder, with the chosen handoff design.
7. Doctor CMS mutations (blog/case-story/FAQ create-update-publish) + media upload — reuse the
   photo-upload pattern (disk + dynamic route, not `public/`). Now unblocked by auth — these
   routes/actions should require a session (see `middleware.ts` matcher — extend it to
   `/api/doctor/:path*` once doctor-only API routes exist).
8. Mobile responsiveness pass across `globals.css`.
