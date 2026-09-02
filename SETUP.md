# SETUP — QR Routing Manager

A TanStack Start (React + Vite + Nitro) app that turns 20 printed QR cards into
dynamically routable links backed by Supabase.

---

## 1. Prerequisites

| Tool               | Min version     |
| ------------------ | --------------- |
| Node.js            | 18              |
| npm                | 9               |
| A Supabase project | free tier works |

---

## 2. Install dependencies

```bash
cd drft-site
npm install
```

---

## 3. Set up Supabase

### 3a. Run the schema

1. Open your Supabase project → **SQL Editor**.
2. Paste the entire contents of `db/schema.sql` and click **Run**.

This creates:

- `public.qr_cards` — the 20 fixed card rows (`001`–`020`), seeded as `inactive`
- `public.qr_scans` — one row per scan
- `public.user_roles` — maps users to `admin` / `user` roles
- `public.resolve_and_log_scan()` — callable by `anon`; resolves a card and logs the scan
- `public.reset_card_stats()` — admin-only, wipes scan history for one card
- `public.has_role()` — used internally by RLS policies
- Row-level security on all tables (anon never touches tables directly)

### 3b. Grant yourself the admin role

After signing up in the app, run this in the SQL Editor (replace the email):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'you@example.com'
on conflict do nothing;
```

---

## 4. Environment variables (optional)

The Supabase URL and anon key are already baked into `src/lib/qr-config.ts`
(they are safe to expose — all data is protected by RLS). If you want to point
the app at a different project, create `.env.local`:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
```

---

## 5. Start the dev server

```bash
npm run dev
```

The app starts at **http://localhost:3000**.

---

## 6. Route map

| URL                 | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `/`                 | Public landing page                             |
| `/auth`             | Admin sign-in / sign-up                         |
| `/admin`            | Admin dashboard (requires sign-in + admin role) |
| `/api/public/q/:id` | QR scan redirect endpoint (server-side 302)     |
| `/unassigned`       | Shown when a card has no active destination     |

---

## 7. The two Google Review QR codes

Cards **001** and **002** are pre-mapped to your two Google Review links:

| Card | Google Review URL                                                                 |
| ---- | --------------------------------------------------------------------------------- |
| 001  | `https://search.google.com/local/writereview?placeid=ChIJK7BfLrErCTkRvBd4rfs6X8g` |
| 002  | `https://search.google.com/local/writereview?placeid=ChIJUStYgL7pDDkRW8zAWxQ3Rhc` |

The QR code images are in `src/assests/20QRs-DRFT/QR1.png` through `QR20.png`.
QR1 encodes `<your-domain>/api/public/q/001`, QR2 encodes `.../002`, etc.

To activate them instantly, sign in as admin and click **Seed cards 001 & 002**
in the dashboard toolbar. This sets the destination URLs and flips both cards to
`active` in one click.

---

## 8. Production build

```bash
npm run build
```

The Nitro server output lands in `.output/`. Deploy to Cloudflare Workers,
Vercel, or any Node host.

---

## 9. Troubleshooting

| Symptom                                        | Fix                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Admin page shows "Failed to load cards"        | Your account doesn't have the `admin` role — run the SQL in step 3b          |
| `/api/public/q/001` redirects to `/unassigned` | Card 001 is still `inactive` or has no URL — click **Seed** in the dashboard |
| Sign-in fails with "Invalid login credentials" | Sign up first, then grant admin role                                         |
