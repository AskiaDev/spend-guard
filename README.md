# SpendGuard

SpendGuard is a local-first Next.js MVP for answering one question: “Can I buy this?”

The product uses deterministic finance calculations for affordability. Advisory text is generated from a rule-based fallback, with an optional LiteRT-LM browser adapter that never changes the decision.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS and shadcn-style local UI components
- React Hook Form and Zod
- Dexie for local browser persistence
- Supabase Auth/Postgres schema and RLS migrations
- Vitest, Testing Library, and Playwright

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Supabase is optional for local MVP usage. Without Supabase env vars, the app runs in local mode with Dexie persistence.

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

## Notes

- Default currency is PHP and can be changed in the profile.
- Voice analysis is blocked until extracted fields are confirmed.
- LiteRT-LM is optional and only used when a compatible browser runtime is present.
- Remote Supabase persistence is available through server actions; the MVP UI currently remains local-first unless those actions are wired into the screens.
