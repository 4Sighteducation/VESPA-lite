# VESPA Lite — Status, Architecture, and Next Steps

Last updated: 2026-01-18

This document consolidates what has been built so far in the `VESPA-lite` repo, how the pieces fit together (Supabase + Vercel), how to test, and the recommended next steps.

---

## 1) What VESPA Lite is (current scope)

VESPA Lite is a Supabase-backed app intended to become a paid product (not just a short trial). It is being built as a separate app from the legacy Knack platform, with a migration path in mind.

**In scope (Lite):**
- Student questionnaire (single-cycle workflow initially)
- Coaching report viewing (student + staff)
- Staff/admin portal + onboarding
- Staff comments/notes on reports
- Academic profile displayed at top of the report (high importance)

**Out of scope (for now):**
- Activities platform, resources portal, printing

---

## 2) Repos, deployment, and runtime model

**Frontend + serverless APIs live in this repo:** `VESPA-lite`  
- Deployed on Vercel (e.g. `app.vespa.academy`)
- Frontend is a Vite SPA
- Backend logic is Vercel Serverless Functions under `api/*`

**Supabase is the backend:**
- Auth (staff now; students later)
- Postgres tables for Lite entities (tables prefixed `lite_*`)
- Existing `public` tables are reused where appropriate (notably `public.establishments`)

---

## 3) Current implemented features (high level)

### 3.1 Staff authentication (Supabase Auth)
Implemented in `src/routes/Login.tsx`:
- Email/password login (`signInWithPassword`)
- Google OAuth (`signInWithOAuth('google')`)
- Microsoft OAuth (`signInWithOAuth('azure')`)
- Password reset email (`resetPasswordForEmail`)

### 3.2 Establishment registration + welcome email

Implemented as:
- UI: `src/routes/Home.tsx` (Register a School form)
- API: `api/register-establishment.js`

What it does:
- Inserts a row into `public.establishments` (with `account_type: 'VESPA_LITE'`, `addons: ['lite']`)
- Creates a Supabase Auth user for the primary contact (`supabase.auth.admin.createUser`)
- Inserts:
  - `public.lite_staff_profiles` (links user → establishment)
  - `public.lite_staff_roles` (role = `staff_admin`)
- Sends a SendGrid welcome email using `ORG_WELCOME_TEMPLATE_ID`

### 3.3 Staff admin onboarding wizard (manual / CSV / QR)

Implemented in:
- UI: `src/routes/StaffAdmin.tsx`
- APIs:
  - `api/staff-admin-context.js` (loads `establishmentId`, `staffName`, `isSuperAdmin`)
  - `api/staff-onboard.js` (manual/CSV add staff + welcome emails)
  - `api/create-invites.js` (generates staff + student invite links for a cycle)
  - `api/staff-self-register.js` (staff join via QR/invite token)

Wizard modes:
- **Manual add**: add one staff member at a time
- **CSV upload**: parse CSV client-side, preview/edit rows in-app (including dropdown for `role_type`)
- **QR invite**: generate a school staff invite link (and optionally student invite link) for a named cycle label

Key behaviour:
- For normal staff admins, `establishmentId` is derived server-side (hidden “under the hood”).
- For super admins, an establishment override is supported.
- Welcome emails are sent for manual + CSV + QR onboarding.

### 3.4 Welcome email template (dynamic)

Template source file: `ORG_WELCOME_TEMPLATE_ID.html` (copied into SendGrid as a Dynamic Template).

Key variables used:
- `greetingName` (first name; robust fallback in template)
- `organisationName`
- `loginUrl`, `loginEmail`, `password`
- `isAdmin` (controls conditional paragraph)
- `ssoMessage`

Important note:
- Updating this file does **not** update SendGrid automatically; the HTML must be pasted into SendGrid and the same template ID kept (or Vercel env updated).

### 3.5 Student pages (UI-first, partial backend wiring)

Routes exist (student layout has no sidebar):
- `GET /student/start/:token` → `src/routes/StudentStart.tsx` (launcher)
- `GET /student/questionnaire/:token` → `src/routes/StudentQuestionnaire.tsx` (React port of the questionnaire UI)
- `GET /student/report/:token` → `src/routes/StudentReport.tsx` (report UI + academic profile stub)
- `GET /resume` → `src/routes/Resume.tsx` (placeholder resume-code UX)

Current status:
- Questionnaire calculates VESPA scores client-side (no DB writes yet).
- Report UI is largely in place; academic profile currently uses stub data.

### 3.6 Report coaching content now matches “five-band” logic (via Supabase)

Key point:
- The legacy VESPA report text originally lived in JSON (e.g. `Homepage/reporttext_fiveband.json`), but the live report uses **`public.coaching_content`** in Supabase.

VESPA Lite now pulls coaching content from `public.coaching_content` via:
- API: `api/coaching-content.js`
- UI: `src/routes/StudentReport.tsx`

Selection logic (matches the production report backend):
- `level` (`Level 2` or `Level 3`)
- `category` (`Vision|Effort|Systems|Practice|Attitude`)
- `score_min <= score <= score_max`

Level rule (agreed):
- Year Group < 12 → `Level 2`
- Year Group > 11 → `Level 3`

### 3.7 Desktop-first app shell

App layout:
- Sidebar shell for staff/admin routes (`src/App.tsx`, styles in `src/App.css`)
- Separate student layout without sidebar
- Top-right-equivalent user card in sidebar includes email + logout

### 3.8 Build reliability (Rollup native dependency workaround)

Problem:
- Vercel/Linux builds can fail due to npm optional dependency bugs around Rollup native binaries.

Solution:
- `scripts/ensure-rollup-native.cjs` runs in `prebuild` and installs the correct Rollup native binary for the platform (`win32-x64-msvc` or `linux-x64-gnu`) without saving to package-lock.

This has been validated with successful local builds and Vercel builds after prior failures.

---

## 4) File map (what to look at)

### Frontend routes
- `src/routes/Home.tsx` — establishment registration form
- `src/routes/Login.tsx` — staff login (email/password + Google/Microsoft)
- `src/routes/StaffPortal.tsx` — staff dashboard scaffold (needs data wiring)
- `src/routes/StaffAdmin.tsx` — staff onboarding wizard (manual/CSV/QR)
- `src/routes/StaffJoin.tsx` — staff QR join form
- `src/routes/StudentQuestionnaire.tsx` — student questionnaire UI + score calc
- `src/routes/StudentReport.tsx` — student report UI (partially wired)

### Serverless APIs (Vercel)
- `api/register-establishment.js`
- `api/staff-admin-context.js`
- `api/staff-onboard.js`
- `api/create-invites.js`
- `api/staff-self-register.js`
- `api/coaching-content.js`

---

## 5) Supabase dependencies (tables, policies, and “source of truth”)

### Reused “core” table
- `public.establishments` (used to create Lite establishments)

### Lite tables (created via SQL migrations you ran earlier)
These were created from the Lite schema migration work (in your Supabase project):
- `lite_cycles`
- `lite_school_invites`
- `lite_staff_profiles`
- `lite_staff_roles`
- `lite_students`
- `lite_student_access`
- `lite_student_staff_links`
- `lite_reports`
- `lite_report_comments`

### Lite staff invites (tracking uploads/self-register)
SQL file in this repo:
- `LITE_STAFF_INVITES.sql` → creates `public.lite_staff_invites` + RLS policies.

### Coaching content table (critical for report text)
VESPA Lite expects the same content source used by the main report:
- `public.coaching_content` with fields like:
  - `level`, `category`, `score_min`, `score_max`
  - `statement_text`, `questions`, `coaching_comments`, `suggested_tools`

---

## 6) Environment variables

### Frontend (Vite) — set in `.env.local` and in Vercel
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Serverless APIs (Vercel)
These must be set in Vercel project env vars (Production + Preview as desired):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENDGRID_API_KEY`
- `ORG_WELCOME_TEMPLATE_ID`
- `APP_BASE_URL` (e.g. `https://app.vespa.academy`)

---

## 7) How to test (current)

### Staff onboarding end-to-end
1. Go to `/` and submit “Register a School (Admin)”
2. Confirm:
   - new `public.establishments` row exists
   - new `lite_staff_profiles` + `lite_staff_roles` row exists for the admin user
   - SendGrid welcome email arrives (with temp password)
3. Go to `/login` and sign in (password or SSO)
4. Go to `/staff/admin`
5. Test:
   - Manual add staff (should create user + send welcome email)
   - CSV upload + preview edit + submit (same)
   - Generate QR invites (creates staff/student invite links)
6. Open the staff invite URL `/staff/join/<token>` and self-register

### Student pages (UI + coaching content)
- `/student/questionnaire/demo` (UI and client-side scoring)
- `/student/report/demo`
  - The **coaching content** should now be pulled from `public.coaching_content` via `/api/coaching-content`.

---

## 8) Known gaps / what is still mocked

These are the main reasons the app can feel “done” in UI but not yet “real” end-to-end:

- **Student identity + onboarding is not implemented** (no real student record creation yet)
- Questionnaire does **not** write `question_responses` / `vespa_scores` to Supabase
- Report does **not** yet load real student data (scores, answers, reflections/goals) from Supabase
- Academic profile shown on the report is currently a **stub**
- Staff portal `/staff` is still a scaffold (no real student list/data)

---

## 9) Recommended next steps (clear order)

### Phase A — Stabilise + ship the latest work
- Add this doc to git
- Commit + push the current VESPA Lite changes (so Vercel is always aligned)
- Ensure Vercel env vars include everything required by the APIs (section 6)

### Phase B — Student onboarding + access model (the “3-lane” plan)
Implement a durable student access model that can evolve into the future main app:

1. **Lane 1 (best):** School SSO (Microsoft/Google) for students where available
2. **Lane 2:** Passwordless email (magic link / email OTP) for students
3. **Lane 3 (fallback):** Resume code + DOB (works even without email on device)

Start by implementing Lane 3 first (fastest + always works), but design tables so Lane 2/1 can be added without migration pain.

### Phase C — Wire questionnaire → database
Add APIs to:
- Validate student access token / resume code
- Save question responses (per cycle)
- Compute + persist VESPA scores (per cycle)

### Phase D — Wire report → database
Add APIs to:
- Fetch report data (student info, academic profile, scores, coaching content, reflections/goals)
- Save reflection/goals
- Save staff comments/notes to `lite_report_comments`

### Phase E — Staff portal data
Implement staff view:
- list students linked to staff (many-to-many)
- open report
- add staff notes

---

## 10) Housekeeping notes

- The repo `README.md` is still the default Vite template; it should be replaced with product-specific docs once the student onboarding is implemented.
- Some Windows workspaces can contain a special file named `nul` that breaks broad search tools; prefer targeted searches to avoid IO errors.

---

## 11) Do you want me to commit + push?

If you want, I can:
- add this new `.md` file
- add the related code changes already in your working tree
- commit with a clean message
- push to GitHub so Vercel deploys the exact current state

