export function resolveAuthRedirectOrigin(requestOrigin: string | null): string {
  return process.env.PORTLESS_URL ?? requestOrigin ?? "http://localhost:3000";
}
