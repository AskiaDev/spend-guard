const PUBLIC_PATHS = new Set(["/login", "/signup"]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

export function getAuthRedirect(pathname: string, isAuthenticated: boolean): string | null {
  if (!isAuthenticated && !isPublicPath(pathname)) {
    return "/login";
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return "/";
  }

  return null;
}
