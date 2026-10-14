import { env } from "cloudflare:workers";

type RsvpEnvironment = { HOST_EMAIL?: string; PUBLIC_SITE_ORIGIN?: string };

function runtime() {
  return env as typeof env & RsvpEnvironment;
}

export function expectedRsvpOrigin(request: Request): string {
  return runtime().PUBLIC_SITE_ORIGIN || new URL(request.url).origin;
}

export function hostIsConfigured(): boolean {
  return Boolean(runtime().HOST_EMAIL?.trim());
}

export function isAuthorizedHost(user: { userId: string; email: string } | null): boolean {
  const email = runtime().HOST_EMAIL?.trim().toLowerCase();
  return Boolean(email && user?.userId && user.email.trim().toLowerCase() === email);
}

export function requestHost(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  return userId && email ? { userId, email } : null;
}

export const privateResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
