# STW Calendar

The Sac Tech Week 2026 calendar app. Public event calendar with a Luma
handoff, email capture, and an organizer console. No attendee accounts.

## Setup

1. Create a Supabase project. In the SQL editor, paste and run
   `supabase/schema.sql` (schema, row-level security, and seed data in one).
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon
   key from Supabase → Settings → API.
3. `npm install && npm run dev`

The home page shows a wiring check: it reports how many events it can read.
23 means the seed and RLS are both working (drafts are hidden from the
public, published rows are visible).

## Deploy

Push to GitHub, import in Vercel, set the two env vars in Vercel →
Settings → Environment Variables. Test on the vercel.app URL; point
`app.sactechweek.org` at it when DNS access is sorted.

## Admins

Adding an organizer = adding a row to the `admins` table with their email.
They sign in by magic link. There are no roles.
