import { Schibsted_Grotesk, Hanken_Grotesk } from "next/font/google";
import "@/features/onboarding/vault/vault.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Auth + onboarding gating is handled centrally by src/proxy.ts:
// - unauthenticated -> /login
// - authenticated but not onboarded -> kept on /onboarding
// - onboarded -> redirected away to /
// This layout is purely structural: full-screen, no sidebar, scoped vault theme.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`vault ${schibsted.variable} ${hanken.variable}`}>{children}</div>;
}
