# Dynamic QR Routing Manager

A mobile-first dashboard for 20 fixed QR cards (`001`–`020`). Each card has a shop name, a destination review URL, an active/inactive status, and scan analytics. Scanning `/q/001` redirects to that card's destination and logs the scan.

## Before I can build the data layer

This project runs on TanStack Start (React 19 + Vite), not Next.js — the framework here is fixed. Every feature in your spec maps over directly: the `/q/[id]` route handler becomes a TanStack server route, server actions become server functions, and middleware/session auth becomes an encrypted-cookie session plus a route guard. Tailwind, shadcn/ui and Lucide are already the stack.

You chose your own Supabase project (`pzlzpobetksnoogahksr`). I can't link it from chat — connect it yourself in **Project Settings → Connectors → Supabase** (browser sign-in). Don't paste the database password or any secret key in chat; the connector handles credentials. Once connected I run the migration and build against it.

## What gets built

### 1. Public redirect endpoint — `/q/:id`
- Validates the ID is `001`–`020`; anything else renders a styled 404.
- Active card with a destination: logs a scan row (timestamp, device type from user-agent), increments the card's scan counter, returns a 302 to the destination.
- Inactive or unassigned: redirects to a branded `/unassigned` page.
- Runs server-side with no auth, so scanning is instant for anyone.

### 2. Auth
- Real accounts via email/password sign-in at `/auth`.
- Admin area lives under the protected route subtree; unauthenticated visitors are redirected to sign-in.
- Admin rights come from a separate roles table checked server-side (not from the browser), so only granted accounts can edit cards. First account can be granted admin by me after you sign up.

### 3. Admin dashboard — `/admin`
- Analytics header: Total Cards (20), Active Cards, Total Scans, Top Performing Card.
- Mobile-first list that becomes a grid on larger screens. Each card shows: `Card #001`, shop name, destination URL with an external preview link, green/red status badge, scan-count badge.
- Per-card actions: Edit, quick Active/Inactive toggle, Reset Stats (with confirm).
- Search + filter by ID, shop name, or status.
- Edit dialog: shop name, destination URL with URL validation, status toggle.
- All mutations are optimistic with rollback on failure and toast feedback.
- "Seed 20 Cards" button appears only when the table is empty (rows are also seeded by the migration).

### 4. Design
- Dark/light mode with a theme toggle, semantic design tokens only, thumb-reachable controls and sticky action bar on mobile.
- Distinctive palette and type pairing chosen for a utility dashboard — not the default indigo-on-white look.

## Technical notes

- `qr_cards`: `id` text PK (`001`–`020`), `shop_name`, `destination_url`, `status`, `scan_count`, timestamps. Seeded with all 20 rows in the migration.
- `qr_scans`: `id`, `card_id` FK, `scanned_at`, `device_type`, `user_agent`.
- `user_roles` + `has_role()` security-definer function for admin checks.
- RLS: `anon` gets no direct access; the redirect endpoint writes scans through a server-side privileged path; card reads/writes for admins go through authenticated server functions that verify the role.
- Routes: `src/routes/api/public/q.$id.ts` (redirect), `src/routes/unassigned.tsx`, `src/routes/auth.tsx`, `src/routes/_authenticated/admin.tsx`, and a public landing at `/` explaining the system with a sign-in CTA.
- Server functions in `src/lib/cards.functions.ts`: list, update, toggle, resetStats, seed — each role-checked.
- Per-route head metadata; `/q/:id` and `/unassigned` are noindex.

## Setup you'll do
1. Connect Supabase in Project Settings → Connectors.
2. Sign up at `/auth` once so I can grant your account admin.
3. Point your printed QR codes at `https://<your-domain>/q/001` … `/q/020`.
