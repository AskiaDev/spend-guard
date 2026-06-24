import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    // Generous: the app loads its financial workspace from the REMOTE Supabase on first paint,
    // which is slow on a cold dev server. Tight timeouts cause false negatives.
    timeout: 20_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    // Run Next directly, NOT `npm run dev` (which wraps the app in `portless` and registers
    // spendguard.localhost). Going through portless collides with the developer's own dev server
    // and leaves the wrapper alive on teardown (hung runs). A direct `next dev` on :3100 is
    // isolated, loads .env itself, and shuts down cleanly.
    command: "npx next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    // Reuse a manually-started dev server locally, but always start a clean one in CI so a stale
    // process on :3100 can't make results non-deterministic.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
