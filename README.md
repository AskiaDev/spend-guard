# SpendGuard

SpendGuard is a Supabase-backed Next.js MVP for answering one question: “Can I buy this?”

The product uses deterministic finance calculations for affordability. Advisory text is generated from a rule-based fallback, with an optional LiteRT-LM browser adapter that never changes the decision.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS and shadcn-style local UI components
- React Hook Form and Zod
- Supabase Auth/Postgres schema and RLS migrations
- Vitest, Testing Library, and Playwright

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Supabase is required. Without Supabase environment variables, the app shows an auth configuration notice and does not run a local persistence fallback. All app data is loaded from and saved to the authenticated user's Supabase rows.

```bash
cp .env.example .env.local
```

Set these when you have a Supabase project:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is still accepted as a legacy fallback, but new
projects should use the `sb_publishable_...` key from Supabase.

Apply the database schema locally with the Supabase CLI:

```bash
supabase start
supabase db reset
```

The migration enables RLS on all user-owned tables. Server actions derive `user.id` from Supabase Auth and do not accept client-supplied `user_id` values.

### Authentication setup

In Supabase **Authentication > URL Configuration**, set:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/confirm`
- Add the equivalent production `/auth/confirm` URL before deployment.

Keep the Email provider enabled. With email confirmation enabled, signup displays a check-email message; the confirmation link establishes the cookie session and redirects to the dashboard. Login and signup errors are displayed in the form.

## Scripts

```bash
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
npm run e2e
npm audit --audit-level=moderate
```

Install Playwright browsers if needed:

```bash
npx playwright install chromium
```

`npm run e2e` uses real Supabase auth and data. Set these for a disposable confirmed test account before running it:

```bash
E2E_SUPABASE_EMAIL=
E2E_SUPABASE_PASSWORD=
```

## Notes

- Default currency is PHP and can be changed in the profile.
- Voice analysis is blocked until extracted fields are confirmed.
- LiteRT-LM is optional and only used when a compatible browser runtime is present.
- Accounts load and save profiles, expenses, debts, goals, purchase checks, cooldown items, weekly reports, and confirmed voice sessions through authenticated server actions.
