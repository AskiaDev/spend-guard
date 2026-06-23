export function getAuthRedirect(pathname: string, isAuthenticated: boolean): string | null {
  if (!isAuthenticated && pathname === "/") {
    return "/login";
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return "/";
  }

  return null;
}
