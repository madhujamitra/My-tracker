# my-task

Personal **task & habit workspace** built with Vite, React, and Tailwind. Track daily habits, rolling to-dos, timers, and focus sessions. Auth is powered by **Supabase** (email + password).

## Features

| Area | Behavior |
|------|----------|
| **Tasks** | User to-dos that stay open until done. If missed, they show the next day as missed. |
| **Habits** | Everyday check-ins that reset each morning (no miss-carry). Live in the habit matrix. |
| **To-Do queue** | Today’s list with priority filters, type filter (Both / Tasks / Habits), and start/stop timers. |
| **Habit matrix** | Month grid of habit check-ins. |
| **Timer** | Shared start/stop timer store; only one timer runs at a time. |
| **Focus mode** | Opens when you start a timer (optional). Shows time worked + until-break countdown. |
| **Analytics** | Habit consistency and daily volume. |
| **Modules** | Optional features. Enable **Applications** to track job apps, interviews, and contacts. |
| **Applications** | (optional) Board + upcoming interviews; stale apps auto-move to Not selected. Optional **Gmail sync** (propose → confirm). |
| **Auth** | Signup, login, logout via Supabase Auth. Dashboard is gated until you’re signed in. |

## Stack

- React 19 + Vite 6
- Tailwind CSS 4
- Lucide icons
- Supabase Auth (`@supabase/supabase-js`)

## Quick start

```bash
cd my-task
cp .env.example .env
# Edit .env with your Supabase URL + anon key
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

Create a `.env` file (never commit it):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

Notes:

- Use the **project URL** only — do **not** append `/rest/v1/`.
- Use the **anon / public** key only — never put the `service_role` key in the frontend.
- See [`.env.example`](.env.example).

## Supabase setup (click-by-click)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API** — copy Project URL and `anon` key into `.env`.
3. **Authentication → Providers → Email**
   - Enable Email.
   - For auto-login after signup: turn **Confirm email OFF**.
4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173` (add your Vercel URL later).

### Email templates (optional)

On **new Free-tier** projects, the default Supabase mailer **locks** template Source editing. To customize confirm/reset emails you need **Custom SMTP** or a **Pro** plan. Until then, keep Confirm email off or use the default email.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Unit tests (classify, date/timer helpers, focus countdown) |
| `npm run lint` | Oxlint |

## Project layout

```
src/
  auth/           # AuthProvider, AuthGate, Login, Signup
  features/       # Timer, Focus Mode, TimeControl, prefs
  lib/            # Supabase client
  App.jsx         # Dashboard UI
  main.jsx        # Data host + auth gate
  itemClassify.js # Habit vs task rules
  seedData.js     # Demo seed rows
```

## Auth flow

1. Unauthenticated users see **Sign up** / **Log in**.
2. Successful signup (with Confirm email off) creates a session and opens the dashboard.
3. Session persists across refresh.
4. **Log out** in the header clears the session.

If signup shows “check your inbox” and does not enter the app, Confirm email is still enabled in Supabase.

## Data persistence

Per-user workspace is stored in Supabase table `public.app_state`:

| Column | Contents |
|--------|----------|
| `user_id` | `auth.users.id` (primary key) |
| `sheet_data` | Habit/task grid rows (JSON) |
| `meta` | Item type / priority / createdDay |
| `timers` | Timer hours by date |

### One-time: create the table

1. Open Supabase → **SQL Editor** → New query.
2. Paste everything from [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**.
4. Refresh the app (or click Retry if you see a load error).

New accounts start with an **empty** workspace (no demo tasks). Add tasks/habits from the UI; they save automatically.

### Applications tables (optional module)

The same [`supabase/schema.sql`](supabase/schema.sql) also creates `applications` and `interview_events` (with RLS). Re-run the full script if you already created `app_state` earlier — policies use `drop … if exists` / `create table if not exists`.

Then: **Modules** → enable **Applications** → use the Applications tab.

Product notes: [`docs/domains/applications/product.md`](docs/domains/applications/product.md).

### Gmail sync (optional)

See [`docs/domains/applications/gmail-setup.md`](docs/domains/applications/gmail-setup.md): Google Cloud OAuth client, Edge Function secrets, and `supabase functions deploy …`.

## Deploy on Vercel

1. Import the `my-task` repo.
2. Framework: Vite (or Other).
3. Build: `npm run build` · Output: `dist`.
4. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. In Supabase Auth URL config, add your production URL as Site URL / redirect.

## License

Private / personal use unless you add a license.
