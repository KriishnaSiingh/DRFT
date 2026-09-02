# QR Link Pro

Act as a Principal Full-Stack Engineer. Build a complete, production-ready, mobile-first dynamic QR routing management web application using Next.js 14+ (App Router), Tailwind CSS, shadcn/ui components, and Lucide React icons. This project must run completely within Vercel's Free Hobby Tier using Vercel KV (@vercel/kv) or a lightweight JSON key-value backend.

### Project Context & Specifications:
- Domain format: https://DRFT.vercel.app/q/[001-020]
- Fixed Card Range: 20 fixed QR cards (ID range: `001` through `020`).
- Target Functionality: Rapid redirection, full administrative CRUD operations, activation/deactivation toggles, and scan analytics.

---

### Core Requirements & File Structure:

1. Dynamic Redirect Route (`app/q/[id]/route.ts`):
   - Listen for HTTP GET requests at `/q/[id]` (e.g., `/q/001`).
   - Validate if the ID matches the valid range (`001` to `020`). If invalid, render a stylized 404 page.
   - Look up the card record in the storage layer.
   - If `status === "active"` and `destination_url` exists:
     * Increment the scan counter for this card ID.
     * Record scan metadata (timestamp, user-agent device type).
     * Issue an immediate HTTP 302 redirect (`NextResponse.redirect(destination_url)`) to the target review page URL.
   - If `status === "inactive"` or no destination URL is assigned:
     * Redirect or rewrite to a friendly, branded "Card Currently Unassigned" landing page (`app/unassigned/page.tsx`).

2. Protected Admin Dashboard (`app/admin/page.tsx`):
   - Fully responsive grid and mobile-first list view of all 20 cards (`001` through `020`).
   - Card Item Details Displayed:
     * Card ID (e.g., `Card #001`)
     * Assigned Business/Shop Name
     * Destination Review URL (with quick external preview link)
     * Status Badge (Active = Green, Inactive = Red)
     * Total Scan Counter badge
     * Action Buttons: "Edit", "Quick Toggle Active/Inactive", "Reset Stats"
   - Quick Filter & Search Bar: Filter cards by ID, Business Name, or Active Status.
   - Edit Modal: Easily change Shop Name, target Review URL (with URL format validation), and Toggle Status.
   - Seed Button / Initializer: A "Seed 20 Cards" trigger if the database is empty on first load.

3. Analytics Summary Header:
   - Metric cards at the top of the admin page displaying:
     * Total Cards (20)
     * Total Active Cards
     * Total Scans across all cards
     * Top Performing Card

4. Security & Authentication:
   - Protect the `/admin` routes using a lightweight admin password check (stored in `ADMIN_PASSWORD` environment variable) stored in secure cookies or Next.js middleware.

5. UI/UX Design System:
   - Modern, clean, professional dark/light mode dashboard optimized for mobile phones (so management can be done directly from a smartphone on-site at a client's shop).
   - Instant optimistic UI updates when editing card details or toggling statuses.

Please generate the complete codebase files with typescript types, Next.js server actions / API handlers, tailwind styling, and step-by-step setup instructions for environment variables. make full in free token limit at once and my supabase db creds are https://pzlzpobetksnoogahksr.supabase.co , sb_publishable_bTgv2XRwcNZUNhlnSopZSg_qiRV0ine , postgresql://postgres:[YOUR-PASSWORD]@db.pzlzpobetksnoogahksr.supabase.co:5432/postgres , supabase login

supabase init

supabase link --project-ref pzlzpobetksnoogahksr

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a445296-bcc9-4f9b-a01a-0b22860ef326).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
