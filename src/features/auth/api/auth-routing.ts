const PUBLIC_PATHS = new Set(["/login", "/signup", "/offline"]);
const ONBOARDING_PATH = "/onboarding";
const EXPLORE_PATH = "/explore";
const ONBOARDING_ALLOWED_PATHS = new Set([ONBOARDING_PATH, EXPLORE_PATH, "/offline"]);
const AWAY_FROM_WHEN_ONBOARDED = new Set(["/login", "/signup", ONBOARDING_PATH]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

export function getAuthRedirect(
  pathname: string,
  isAuthenticated: boolean,
  onboardingCompleted = false
): string | null {
  if (!isAuthenticated) {
    return isPublicPath(pathname) ? null : "/login";
  }

  if (!onboardingCompleted) {
    // Authenticated but setup incomplete: funnel everything to onboarding,
    // except allowed onboarding paths and auth callbacks (avoid loops).
    if (ONBOARDING_ALLOWED_PATHS.has(pathname) || pathname.startsWith("/auth/")) {
      return null;
    }

    return ONBOARDING_PATH;
  }

  // Authenticated and onboarded: keep them out of the setup/auth entry pages.
  if (AWAY_FROM_WHEN_ONBOARDED.has(pathname)) {
    return "/";
  }

  return null;
}
