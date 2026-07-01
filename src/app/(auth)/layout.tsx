import { Anton, Caveat, IBM_Plex_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";

// ponytail: Editorial Ledger fonts duplicated from the marketing layout so the
// auth split-screen shares the brand type without importing that route. Promote
// to a shared fonts module if a third layout needs them.
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: ["400"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        anton.variable,
        inter.variable,
        plex.variable,
        caveat.variable,
        "theme-ledger min-h-dvh",
      )}
    >
      {children}
    </div>
  );
}
