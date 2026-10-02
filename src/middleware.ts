import { NextRequest, NextResponse } from "next/server";
import { getRolesFromClaims, verifyIdToken } from "@/lib/auth/verify-id-token";

const PROTECTED_PREFIXES = ["/dashboard", "/guest", "/bookings"];

const PROTECTED_PATTERNS = [/^\/hotels\/[^/]+\/book(\/.*)?$/];

const HOST_ONLY_PREFIXES = ["/dashboard/hotels", "/dashboard/apartments"];

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/new-password",
  "/reset-password",
  "/verify-email",
  "/rent",
]);

/**
 * Determines whether a request targets an authenticated application route.
 * Public pages and static assets are excluded before protected prefixes are checked.
 */
function isProtected(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return false;

  if (PROTECTED_PATTERNS.some((re) => re.test(pathname))) return true;

  if (/^\/(rent|room|hotels)(\/|$)/.test(pathname)) return false;

  // Protected routes must take precedence over static-file exclusions.
  if (
    PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  // Next.js internals and static assets should pass through untouched.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/img/") ||
    pathname.startsWith("/styles/") ||
    pathname.includes(".")
  ) {
    return false;
  }

  return false;
}

/**
 * Verifies the Firebase ID token in the Edge runtime (jose, no Admin SDK) and
 * derives the request's authorization from the verified claims only.
 *
 * - Missing, forged, expired or wrong-project token → redirect to /login and
 *   clear the stale cookie.
 * - Host-only areas require a `host` or `admin` role in the verified Hasura
 *   claims; everyone else gets the /403 page (via rewrite, so the URL stays).
 */
export async function middleware(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_SKIP_AUTH_MIDDLEWARE === "true") {
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("firebase-token")?.value;
  const claims = token ? await verifyIdToken(token) : null;

  if (!claims) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    const res = NextResponse.redirect(loginUrl);
    // Drop invalid or expired cookies so the browser stops replaying them.
    if (token) res.cookies.delete("firebase-token");
    return res;
  }

  // Host-only areas: role comes from verified claims, never from the client.
  if (isHostOnly(pathname)) {
    const roles = getRolesFromClaims(claims);
    if (!roles.includes("host") && !roles.includes("admin")) {
      return NextResponse.rewrite(new URL("/403", req.url));
    }
  }

  return NextResponse.next();
}

function isHostOnly(pathname: string): boolean {
  return HOST_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
