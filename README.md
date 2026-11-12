# SISB House Color Leaderboard

A live house-points leaderboard for the five SISB houses — **Red Leopards, Orange Tigers, Yellow Cheetahs, Green Panthers and Blue Lynxes** — built with Vite, React, Tailwind CSS and Supabase, and deployed as a static site on GitHub Pages.

| URL | What it is |
| --- | --- |
| `/` | Public leaderboard: ranked houses, latest points, progression chart, category breakdown, Past Terms drawer, **TV / Projector Mode** (also `/?tv=1`) |
| `/admin/` | Staff login (Teacher / Admin tabs) and the role-based dashboard |

With no Supabase credentials the app runs fully in **offline mode** using `localStorage` (one browser only) — handy for trying it out. A badge in the footer / admin header shows which mode is active.

---

## Features

- **Roles** — Super Admin (`sisbadmin`), General Admin (shared password), Teachers (individual accounts). Every permission is enforced inside PostgreSQL `SECURITY DEFINER` functions, not just in the UI.
- **One-tap presets** — 1st Place (+50 · Sports), 2nd Place (+30), 3rd Place (+20), Academic Excellence (+15 · Academics), Sportsmanship (+10 · Spirit), House Spirit (+5 · Spirit), plus custom points, category and reason.
- **Typo guardrail** — any entry above 999 points needs confirmation.
- **60-second Undo** banner after every award.
- **Mystery / Freeze Mode** — public screens show a frozen snapshot while points keep being counted; switching it off reveals the real standings everywhere, with confetti.
- **TV / Projector Mode** — full-screen, high-contrast assembly view with house-coloured confetti and a 6-second toast for every new award.
- **Archive & Start New Term** — saves the final standings and champion, resets all houses to 0.
- **Teacher management** — single create, bulk CSV paste import, activate/deactivate, password reset, optional teacher self-service password change.
- **Append-only audit log** and **CSV export** (`sisb-house-points-YYYY-MM-DD.csv`).

---

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a **New project** (the free tier is plenty).
2. When it is ready, open **SQL Editor → New query**.
3. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - The script is idempotent: re-running it never resets points or changed passwords.
   - It creates the tables, seeds the 5 houses and default passwords, enables Row Level Security, adds the tables to Realtime, and creates every RPC function.
4. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public** key → `VITE_SUPABASE_ANON_KEY`

> The anon key is meant to be public. It can only read houses, point logs and archives, and call the RPC functions, each of which checks the caller's password with bcrypt. Password hashes, teacher accounts and the audit log cannot be read from the browser.

## 2. Run locally

Requires Node.js 18+ (20 recommended).

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm run dev
```

Open http://localhost:5173/ (leaderboard) and http://localhost:5173/admin/ (staff). Leave `.env` empty to use offline `localStorage` mode instead.

To test the production build:

```bash
npm run build && npm run preview
```

## 3. Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab). [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci`, `npm run build` and deploys `./dist`.
5. The site is published at `https://<your-user>.github.io/<repo>/`, with staff login at `https://<your-user>.github.io/<repo>/admin/`.

All asset paths are relative (`base: './'`), so it works under any repository name. `public/404.html` redirects unknown paths (for example `/admin/settings`) to the right page instead of showing GitHub's 404.

If the secrets are missing the build still succeeds, but the site runs in offline `localStorage` mode, as the footer badge shows.

## 4. Default logins

| Role | How to log in | Default password |
| --- | --- | --- |
| **Super Admin** | Admin Login tab | `sisbadmin` |
| **General Admin** | Admin Login tab | `sisbhousecolor2026` |
| **Teacher** | Teacher Login tab (username + password) | Created by the Super Admin |

**Change the General Admin password** after setup: log in as Super Admin → **Security**.

**Change the Super Admin password.** It isn't changeable from the web UI on purpose. Run this in the Supabase SQL Editor:

```sql
update app_config set super_admin_hash = crypt('your-new-password', gen_salt('bf')) where id = 1;
```

In offline mode, clear the site's localStorage to reset everything to the defaults.

---

## What each role can do

| | Teacher | General Admin | Super Admin |
| --- | :---: | :---: | :---: |
| Award positive points (name recorded) | ✅ | ✅ | ✅ |
| Deduct points | — | ✅ | ✅ |
| Undo own award within 60 s | ✅ | ✅ | ✅ |
| Delete any log entry | — | ✅ | ✅ |
| Mystery / Freeze Mode | — | ✅ | ✅ |
| Export CSV | — | ✅ | ✅ |
| Create / import / manage teachers | — | — | ✅ |
| Change General Admin password, toggle teacher self-service | — | — | ✅ |
| Archive & start new term | — | — | ✅ |
| View audit log | — | — | ✅ |
| Change own password | if enabled | — | — |

## Bulk teacher import format

Paste one teacher per line: `Full Name, username, password`. Names that contain commas go in quotes. A header line is optional.

```
Mr. Tonkla, tonkla, Sunny2026!
Ms. Ploy, ploy, Blue#Lynx9
"Smith, John", jsmith, Tiger-Roar7
```

Usernames are 3–40 characters (letters, numbers, `.`, `-`, `_`) and are stored in lowercase. Passwords need at least 6 characters. After the import, a summary shows each line's result, and only the failed lines stay in the box so you can fix and resubmit them.

## Security notes

- Logins stay in `sessionStorage` for the open tab (password included), so each RPC call can re-verify the caller on the server. Closing the tab or clicking **Log Out** clears it. Use **Log Out** on shared computers.
- Changing the General Admin password, deactivating a teacher, or resetting a teacher's password signs that person out on their next action.
- `audit_logs` is append-only: database triggers block `UPDATE`, `DELETE` and `TRUNCATE`.
- Mystery Mode hides scores on the public screens. The raw `houses` table is still publicly readable through the API, so treat it as a showmanship feature, not a secret.

## Project structure

```
index.html               Public page entry
admin/index.html         Admin page entry
public/404.html          GitHub Pages redirect for unknown paths
src/lib/houses.js        House metadata + inline SVG big-cat emblems
src/lib/storage.js       Unified data layer (Supabase RPC/Realtime or localStorage mirror)
src/public/              Leaderboard, TV mode, chart, breakdown, archives
src/admin/               Login + role-based dashboard panels
supabase/schema.sql      Tables, RLS, Realtime, RPC functions
.github/workflows/       GitHub Pages deployment
```
