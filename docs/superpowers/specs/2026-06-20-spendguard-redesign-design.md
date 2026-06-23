# SpendGuard Responsive Product Redesign

Date: 2026-06-20
Status: Approved for implementation

## Objective

Redesign SpendGuard as a calm, professional personal-finance coach that answers
“Can I buy this right now?” with clear reasoning and a useful next action. The
change replaces the current tabbed presentation layer with eight responsive,
URL-addressable experiences while preserving the existing local-first storage,
purchase-decision calculations, validation, and user actions.

## Product principles

- Explain risk without blame or alarmist language.
- Keep total savings visually distinct from safe-to-spend money.
- Pair every caution or risk state with a plain-language reason and next action.
- Use color, iconography, and labels together so status never depends on color.
- Keep primary actions obvious and limit red controls to destructive or stop actions.
- Preserve useful functionality even when optional illustration assets fail to load.

## Visual direction

The supplied desktop/mobile reference images are the visual source of truth.
The implementation uses a quiet premium-neutral SaaS aesthetic with:

- `#F6F8FB` app background and white surfaces.
- `#155EEF` primary blue, green safety states, amber caution states, red risk
  states, and soft blue education/advisor states.
- Geist Sans with a rational hierarchy and compact but readable financial data.
- White cards with 1px slate borders, 16–20px radii, restrained shadows, and
  16–24px spacing.
- A 240px desktop sidebar, 1180px content region, and 32px desktop padding.
- A 390px mobile target with 16px gutters, stacked content, and fixed bottom
  navigation.
- Subtle entrance and pressed-state motion implemented with CSS; no new motion
  dependency is required.

The references intentionally override the frontend-design skill’s preference for
unusual typography and layouts: matching SpendGuard’s approved Geist-based,
high-trust design is more important than introducing a new art direction.

## Illustration system

Use one recolored unDraw family for large scenes. unDraw permits commercial and
personal use, modification, and use without attribution. Candidate scenes are:

- Personal Finance for onboarding and advisor education.
- Enter Payment Info for purchase-payment guidance.
- Progress Overview or Financial Data for weekly reporting.
- Setup for onboarding.

Small contextual visuals such as the umbrella/savings motif, shield, wallet,
calendar, microphone, and product thumbnails will use original flat SVG
compositions built from the same blue/green/amber palette. Product thumbnails
are decorative and must have empty alternative text; explanatory illustrations
receive concise alternative text when they add meaning.

## Information architecture

### Routes

| Route | Experience |
| --- | --- |
| `/` | Dashboard |
| `/checker` | Purchase checker four-step flow |
| `/checker/result` | Purchase decision result |
| `/voice` | Voice purchase checker |
| `/goals` | Savings and debt goals |
| `/cooldown` | Cooldown and wishlist |
| `/reports` | Weekly advisor report |
| `/onboarding` | Six-step financial setup |

Login and signup routes remain outside the redesigned application shell.

### Shared shell

The route group layout owns the desktop sidebar, mobile top header, mobile bottom
navigation, page width, and responsive content frame. Navigation uses Next.js
`Link` and pathname-aware active states. The shell remains mostly presentational;
only pathname detection and mobile interactions require a client boundary.

### Financial-state boundary

The current `useFinancialState` behavior moves behind a client context provider
mounted by the application route-group layout. Feature pages consume the same
snapshot, checks, cooldown items, reports, and mutation functions without
duplicating storage access. Existing IndexedDB data remains compatible.

No Supabase schema, migration, RLS policy, authentication flow, or purchase
calculation rule changes are included.

## Component architecture

### Shared product components

- `AppShell`: desktop/mobile navigation and content frame.
- `SpendGuardLogo`: reusable shield/leaf brand mark rendered as SVG.
- `PageHeader`: title, supporting text, actions, alerts, and avatar controls.
- `StatusBadge`: safe, caution, wait, and not-recommended variants with icons.
- `MetricCard`: label, amount, helper, icon, and optional score visualization.
- `ProgressRing` and `ScoreGauge`: lightweight SVG visualizations with text
  equivalents; Recharts remains available for more complex charts.
- `AdvisorCard`: illustration, supportive explanation, and one next action.
- `StepProgress`: responsive numbered/completed stepper.
- `EmptyState`, `ErrorState`, and `SkeletonCard`: shared feedback patterns.
- Existing button, card, form, badge, and progress primitives are restyled rather
  than introducing another component library.

### Feature boundaries

- Dashboard owns KPI composition, active-goal summary, recent checks, and advisor
  insight.
- Purchase checker owns wizard state, validation, payment conditional fields,
  analysis submission, result rendering, and result actions.
- Voice checker owns ready/listening/transcript/review states and maps a confirmed
  transcript draft into the existing purchase input contract.
- Goals owns summary calculations and goal-card rendering.
- Cooldown owns tabs, sorting, product cards, recheck/goal actions, and empty state.
- Reports owns the weekly summary and report generation/download presentation.
- Onboarding owns six-step form state and submits one normalized payload through
  the existing setup mutation.

Page and component files remain focused; repeated content data is centralized in
feature-local fixtures/view-model helpers rather than duplicated across markup.

## Page behavior

### Dashboard

Desktop uses a three-column KPI grid followed by two balanced content panels and
a full-width advisor card. Mobile uses a two-column KPI grid where content fits,
then full-width goals, one recent check, and the advisor insight. Live snapshot
values feed savings, emergency progress, expenses, debt, goals, and calculated
health/safe-to-spend metrics.

### Purchase checker

The checker is a four-step wizard. Each Continue action validates only the active
step. Step 3 submits through the current `runPurchaseCheck` mutation, stores the
result, and navigates to `/checker/result`. The result page uses the latest stored
check when present and a clearly labelled example result only when no result has
yet been created. Add-to-goal and add-to-cooldown retain existing mutations.

### Voice checker

The ready, listening, transcript, and review states use one explicit state model.
Unsupported speech recognition presents a non-blaming fallback and keeps the
transcript textarea available. Extracted amounts remain editable and require
confirmation before analysis.

### Goals, cooldown, reports

These pages render persisted user data first. Reference products and report
details may be used as empty/demo content only when no stored records exist, and
the UI labels that state as an example. Destructive goal/cooldown actions remain
explicitly labelled and keyboard accessible.

### Onboarding

The six-step form keeps entered values while moving between steps and submits
only on “Finish Setup.” Back never discards data. Validation errors attach to
their labels and focus the first invalid control. Existing users can open this
route to update their setup without resetting stored history.

## Responsive behavior

- Desktop shell appears at `lg`; mobile header and bottom navigation appear below
  `lg`.
- Content is capped at 1180px and centered within the shell.
- Dashboard metrics use one column at narrow widths, two columns on common phones,
  and three columns on desktop.
- Dense desktop groups become stacked lists on mobile; no horizontal financial
  tables are introduced.
- Sticky bars account for safe-area insets and never cover the final focusable
  control.
- Tap targets are at least 44px and icon-only controls include accessible names.

## Loading, empty, error, and success states

- Hydration shows dimensionally stable skeletons rather than a single text block.
- Empty states include one illustration, a plain-language explanation, and one
  primary action.
- Analysis errors use: “We couldn’t analyze this yet. Please check the price and
  payment terms.” Technical details are not shown to users.
- Successful mutations show short green confirmations and the next relevant
  action. Success messages use `aria-live="polite"`.
- Buttons expose disabled and loading states without changing their width.

## Accessibility

- Semantic headings follow page hierarchy.
- Navigation exposes current-page state.
- Inputs have visible labels, helper/error associations, and blue focus rings.
- Status badges always include an icon and text label.
- Progress rings include accessible names and visible numeric values.
- Motion respects `prefers-reduced-motion`.
- Keyboard order follows the visual order on desktop and mobile.
- Contrast targets WCAG AA for body text and controls.

## Testing strategy

TDD will be applied to behavior before production changes:

1. Shell/navigation tests for route labels, active state, and mobile navigation.
2. Purchase wizard tests for step validation, conditional payment fields,
   analysis submission, result rendering, and mutations.
3. Voice tests for unsupported capture, transcript extraction, explicit review,
   editing, and analysis handoff.
4. Onboarding tests for step persistence, validation, back navigation, and final
   normalized payload.
5. Page rendering tests for meaningful empty/demo states and accessible status
   labels.
6. Playwright desktop and 390px mobile flows covering every route and the core
   purchase-check-to-goal/cooldown journey.

Final verification runs focused tests during development, then the full unit
suite with 80% thresholds, ESLint, TypeScript, production build, Playwright, and
manual screenshot inspection at 1440px and 390px.

## Orthogonality and reversibility

### Change

Replace the current tabbed SpendGuard presentation with responsive route-based
pages so users receive a clearer, calmer, and directly navigable experience.

### Design decision

- Layer: presentation/UI plus a thin shared client-state boundary.
- Pattern: App Router route group with a shared layout and feature-local page
  components, extending the repository’s existing feature organization.
- Alternative rejected: retaining one stateful tab panel is smaller but prevents
  direct navigation and produces an oversized client component.
- Alternative rejected: expanding the financial domain/schema would enable more
  persisted reference fields but creates unnecessary migration and behavioral risk
  for a redesign.
- Design reversibility: the route group and shared product components are
  self-contained; reverting them restores the existing shell without changing
  stored data or calculations.

### Touch points

- `src/app`: route group, route pages, root metadata/styles, and replacement of
  the current tab-switching entry point.
- `src/components`: shared shell, navigation, feedback, status, chart, and
  illustration components plus restyled UI primitives.
- `src/features/*/components`: responsive page compositions and feature behavior.
- `src/hooks`: context boundary around existing financial state.
- `public/illustrations`: licensed/local SVG assets and source/license note.
- `src/**/*.test.tsx` and `e2e`: behavior, routing, responsive, and accessibility
  coverage.

### Reversibility plan

- Commit shape if later requested: shared foundation, feature pages, then E2E and
  visual refinement as independently revertible commits.
- Destructive operations: none.
- Schema changes: none.
- Feature flag: none; this is an isolated branch/worktree and no deployment is
  part of the task.
- External side effects: illustration downloads only; no posting, pushing, or
  third-party resource mutation.
- Rollback procedure: remove the route group and new shared components, then
  restore `src/app/page.tsx`, `src/app/spendguard-client.tsx`, and the prior UI
  primitive styles.

## Out of scope

- Changing affordability formulas or financial advice rules.
- Adding bank integrations, new databases, analytics, or network APIs.
- Redesigning login/signup beyond preventing regressions.
- Persisting wishlist tab taxonomy or new report fields in Supabase.
- Sending notifications, generating real downloadable PDFs, or deploying.
- Creating commits, pushing a branch, or opening a pull request without explicit
  user instruction.
