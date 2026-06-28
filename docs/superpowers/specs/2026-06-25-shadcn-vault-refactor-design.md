# SpendGuard - shadcn + Vault Design-System Refactor

**Date:** 2026-06-25
**Status:** Draft - awaiting user review
**Owner:** AskiaDev

## 1. Goal

Refactor the whole app onto **real shadcn/ui components** driven by **one design system** (single source of truth for tokens + fonts), styled in the **dark "vault" aesthetic** already used in onboarding, so the product reads as one premium fintech surface. No inline styles except genuinely dynamic computed values.

## 2. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Theme direction | **Full dark "vault" everywhere** (navy gradient, glass cards, lime accent) |
| 2 | Scope / sequencing | **Foundation + main app first**, onboarding folded in last |
| 3 | Component source | **Real shadcn** via `npx shadcn@latest add <component>` (Radix-backed) |
| 4 | Fonts | **Schibsted Grotesk** (display) + **Hanken Grotesk** (body), global - replace Geist |
| 5 | Accessibility | **WCAG 2.2 AA** - contrast is the headline risk on dark |
| 6 | Toasts | **goey-toast** (Sonner-based), dark + lime themed - not raw Sonner |
| 7 | PWA | Keep PWA-compatible for the future; do not block manifest/service-worker path |
| 8 | Checker | **Merge voice + manual into one `/checker`** - segmented **Type \| Speak** (M1, §6) |
| 9 | Styling | Tailwind only; inline `style` allowed solely for computed values (progress width, gauge stroke) |

## 3. Single source of truth - design system

### 3.1 Tokens (`src/app/globals.css`)

Today there are **two** systems: `globals.css` (light) and `features/onboarding/vault/vault.css` (dark). We collapse to **one** token layer using **shadcn's standard variable names** so every installed component themes automatically. The app is dark by default, so vault values live directly under `:root` (no `.dark` toggle needed now; a `.light` block can be added later if dual-mode is ever wanted). Tailwind v4 `@theme inline` maps `--color-*` to these vars.

| shadcn token | Vault value | Notes |
|---|---|---|
| `--background` | radial `#17244e → #0a0e17` | page gradient (set on body) |
| `--foreground` | `#eaf0f7` | body text |
| `--card` | `rgba(255,255,255,0.05)` | glass surface |
| `--card-foreground` | `#eaf0f7` | |
| `--popover` / `--popover-foreground` | `#141d33` solid / `#eaf0f7` | menus/dialogs need opaque bg for contrast |
| `--primary` | `#c6f24e` (lime) | |
| `--primary-foreground` | `#0a0e17` (ink) | dark text on lime - high contrast |
| `--secondary` / `--secondary-foreground` | `rgba(255,255,255,0.08)` / `#eaf0f7` | |
| `--muted` / `--muted-foreground` | `rgba(255,255,255,0.06)` / `#8a94a6` | muted-fg retuned to pass AA on glass |
| `--accent` / `--accent-foreground` | `#7fd93f` / `#0a0e17` | secondary lime-green |
| `--destructive` | `#ff8585` | |
| `--border` | `rgba(255,255,255,0.1)` | hairline |
| `--input` | `rgba(255,255,255,0.12)` | |
| `--ring` | `#c6f24e` | lime focus ring |
| `--safe` / `--caution` / `--risk` (+ `-foreground`) | retuned brighter for dark | finance verdict semantics, kept |
| `--chart-1..5` | lime / green / sky / amber / coral | recharts on dark |
| `--radius` | `0.75rem` control, card `1.375rem` | |
| shadows / glow | layered shadow + soft lime glow on primary | depth utilities |

`vault.css` is **deleted** in Phase 3 once onboarding consumes these tokens.

### 3.2 Fonts

Move `Schibsted_Grotesk` + `Hanken_Grotesk` (`next/font/google`) into the **root** `src/app/layout.tsx`; expose `--font-schibsted` / `--font-hanken`; map `--font-sans` → Hanken, headings → Schibsted. Remove Geist. Onboarding layout stops importing its own fonts (inherits root).

### 3.3 Visual hierarchy / depth ("not plain")

- **Page**: radial navy gradient background (token-driven), optional faint grid/noise overlay utility.
- **Glass card**: translucent `--card` + hairline top highlight + layered shadow; an elevated variant for primary panels.
- **Accent glow**: soft lime glow utility for primary CTAs / focused KPI.
- Encoded as `@theme` tokens + 2-3 Tailwind utility classes (`.glass`, `.glass-elevated`, `.accent-glow`) in `globals.css` - **never inline**.

### 3.4 Accessibility (WCAG 2.2 AA)

- Every text/background pair targets **≥ 4.5:1** (≥ 3:1 large text / UI). `muted-foreground`, verdict colors, and lime-on-navy verified with a contrast check during Phase 0.
- Lime focus ring (`--ring`) visible on all interactive elements; never remove focus outline.
- Keep existing semantic markup (fieldset/legend, aria-describedby, role=alert, aria-live) when swapping primitives.
- Radix shadcn components bring focus-trap, ESC, roving tabindex for free (dialog, dropdown, tabs, select).
- Honor `prefers-reduced-motion` (already in globals + goey-toast respects it).
- Toasts announce via Sonner's `aria-live` region (verify polite/assertive mapping).

## 4. Component layer (shadcn)

### 4.1 Install set (Phase 1)

```bash
npx shadcn@latest add button card badge progress input textarea label \
  select dropdown-menu dialog alert-dialog tabs separator skeleton \
  tooltip form radio-group switch
```
Add more later as needed (e.g. `table`, `scroll-area`, `empty`). goey-toast installed separately (§4.4). Each generated file is then themed to vault (glass card, lime ring, verdict badge variants).

### 4.2 Replace hand-rolled primitives

| Current (hand-rolled) | Action |
|---|---|
| `components/ui/card.tsx` | replace with shadcn Card (glass variant); keep `CardTitle` as a real heading for a11y |
| `components/ui/button.tsx` | replace with shadcn Button; map existing variants (`secondary`, `accent`, `ghost`, `danger`→`destructive`) + `isLoading`/`loadingText` |
| `components/ui/badge.tsx` | replace with shadcn Badge + `safe`/`caution`/`risk` variants |
| `components/ui/progress.tsx` | replace with shadcn Progress (keep computed width) |
| `components/ui/form-fields.tsx` | split into shadcn Input / Textarea / Label; **native `<select>` → shadcn Select** (Radix) via RHF `Controller` |

### 4.3 Native controls → shadcn (per call site)

- `<select>` → shadcn **Select** (Radix): `purchase-checker-wizard`, `voice-purchase-checker`, `cooldown-panel`.
- custom tabs (cooldown-panel) → shadcn **Tabs**.
- destructive confirmations (delete debt/goal/expense, sign-out) → **AlertDialog**.
- user/account menu in header → **DropdownMenu**.
- save/delete feedback → **goey-toast** (replaces inline notices where a transient message fits).
- `RadioCard` pattern (wizard) → shadcn **RadioGroup** styled as cards.

### 4.4 goey-toast integration

- Install: `npm i goey-toast framer-motion` (or its shadcn registry entry → wrapper at `components/ui/goey-toaster.tsx`). `framer-motion` added explicitly (lib imports it; coexists with existing `motion`).
- Mount once: client `<GooeyToaster theme="dark" position="bottom-right" />` in a new `src/providers/toast-provider.tsx`, rendered in root layout; import `goey-toast/styles.css` there.
- Theme: dark + per-type fill/border to lime (`success`), coral (`error`), amber (`warning`); `classNames` overrides if needed to match radii/fonts.
- Usage: `gooeyToast.success/error/promise` in client actions (form saves, deletes).

## 5. Surfaces to refactor (Phase 2)

| Area | Files | Key changes |
|---|---|---|
| Chrome | `layout/app-shell`, `app-header`, `app-navigation`, `workspace-error-banner`; `brand/*` | dark glass sidebar + header; DropdownMenu account menu; lime active-nav state |
| Dashboard | `features/dashboard/components/dashboard-overview` | glass KPI cards, depth, **recharts dark theme** (chart tokens), verdict colors retuned |
| Panels | `debts`, `expenses`, `goals`, `settings`, `cooldown`, `reports` panels | shadcn Card/Input/Select/Button/Switch; AlertDialog deletes; goey-toast feedback; cooldown custom tabs → Tabs |
| Checker | `purchase-checker/*`, `voice/*`, `app/(app)/checker`, `app/(app)/voice` | **merge** (see §6); shadcn Select/RadioGroup/Tabs |
| Auth | `features/auth/components/*`, `app/login`, `app/signup` | shadcn Form/Input/Button on vault bg |
| Feedback/finance | `feedback/*`, `finance/*` | reuse tokens; strip inline styles except computed (progress %, gauge stroke - keep, commented) |

Tests (`*.test.tsx`, ~ all features) kept green; update selectors/queries where markup changes.

## 6. Checker merge - DECIDED: M1 (segmented Type | Speak)

Manual wizard captures a **rich** field set (category, reason, alternative, income signal, financing). Voice captures a **subset** (item, amount, payment, urgency) via Web Speech → regex/model extract → review. Both call `onRunCheck` → `/checker/result`.

Two ways to merge:

- **M1 - Segmented input on one page (recommended for this refactor).** `/checker` shows a segmented control / Tabs: **Type** (manual wizard) | **Speak** (voice capture). Retire `/voice` route + nav entry. *Pro:* smallest, safest, literal "one page." *Con:* voice path still produces a thinner check.
- **M2 - Voice accelerates the manual wizard (best product, more work).** One wizard; a "Speak instead" action on step 1 runs capture → extract → **pre-fills** wizard fields → user completes the rich flow → analyze. *Pro:* one coherent field set + validation, voice as accelerator. *Con:* bigger logic change, alters voice review UX.

**CHOSEN: M1** - ship segmented `Type | Speak` now, schedule M2 (voice pre-fills wizard) as a fast follow.

## 7. Phasing & task breakdown (the implementation plan)

### Phase 0 - Foundation
- [ ] Rewrite `globals.css` token layer (§3.1) in Tailwind v4 syntax; add `.glass`, `.glass-elevated`, `.accent-glow` utilities; gradient on body.
- [ ] Root `layout.tsx`: load Schibsted + Hanken, drop Geist, set theme-color meta to vault navy (PWA-friendly).
- [ ] Contrast audit of all token pairs vs WCAG AA; retune `muted-foreground` / verdicts until pass.
- **Verify:** app boots dark vault + new fonts; no light surfaces; tokens pass AA.

### Phase 1 - Primitives
- [ ] `npx shadcn@latest add ...` (§4.1); theme generated files to vault.
- [ ] Replace 5 hand-rolled primitives (§4.2); update imports app-wide.
- [ ] Install + mount goey-toast (§4.4).
- **Verify:** scratch/storybook route renders glass card, lime button, Select, DropdownMenu, Dialog, themed toast correctly; primitive unit tests green.

### Phase 2 - Main-app surfaces (§5), feature by feature
- [ ] Chrome → [ ] Dashboard (+recharts dark) → [ ] Debts → [ ] Expenses → [ ] Goals → [ ] Settings → [ ] Cooldown → [ ] Reports → [ ] Checker merge (§6) → [ ] Auth → [ ] feedback/finance cleanup.
- **Verify per surface:** Playwright on **isolated `:3100`** (never the user's portless dev server), matches onboarding polish; AA contrast; feature tests green.

### Phase 3 - Fold in onboarding
- [ ] Migrate `conversational/*` + `vault/*` to shared shadcn primitives; convert 35 inline-style files to Tailwind; retire `vault-button/input/select`; **delete `vault.css`** + onboarding font imports.
- **Verify:** onboarding visually unchanged; single token system; zero stray inline styles; onboarding tests green.

## 8. Risks & notes

- **Radix Select migration** is the most invasive native→shadcn swap (controlled value + RHF Controller) - touch wizard/voice/cooldown carefully, keep tests green.
- **Dark readability** for dense data/charts - mitigated by AA audit + chart tokens; verify visually.
- **framer-motion vs motion** - install `framer-motion` for goey-toast; watch for bundle dup with `motion@12` (dedupe if needed).
- **goey-toast `styles.css`** is vendored 3rd-party CSS (acceptable; not our design tokens) - theme via props/classNames.
- **PWA** - keep root layout/manifest path clean; set `theme-color`; no blockers introduced.
- **Big diff control** - feature-by-feature commits in Phase 2; each independently verifiable.

## 9. Resolved

1. Checker merge → **M1** (segmented Type | Speak); M2 deferred. (§6)
2. `framer-motion` dependency for goey-toast → **accepted**.
3. Next step → **writing-plans** produces a finer per-task plan before any code.
