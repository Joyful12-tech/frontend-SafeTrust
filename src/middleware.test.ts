/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { verifyIdToken } from "@/lib/auth/verify-id-token";
import type { SafeTrustClaims } from "@/lib/auth/verify-id-token";

jest.mock("@/lib/auth/verify-id-token", () => ({
  ...jest.requireActual("@/lib/auth/verify-id-token"),
  verifyIdToken: jest.fn(),
}));

const mockVerifyIdToken = verifyIdToken as jest.MockedFunction<
  typeof verifyIdToken
>;

const COOKIE = "firebase-token";

function claimsWithRoles(
  roles: Array<"guest" | "host" | "admin">,
): SafeTrustClaims {
  return {
    sub: "user-1",
    "https://hasura.io/jwt/claims": {
      "x-hasura-allowed-roles": roles,
      "x-hasura-default-role": roles[0],
      "x-hasura-user-id": "user-1",
    },
  };
}

function makeRequest(path: string, token?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `${COOKIE}=${token}` } : {},
  });
}

describe("middleware", () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  it("redirects to /login (with redirect param) when no cookie is present", async () => {
    const res = await middleware(makeRequest("/dashboard/messages?a=1"));

    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe(
      "/dashboard/messages?a=1",
    );
  });

  it("redirects and clears the cookie for a forged/expired token", async () => {
    mockVerifyIdToken.mockResolvedValue(null);

    const res = await middleware(makeRequest("/dashboard", "forged-token"));

    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/dashboard");
    // The stale cookie is dropped so the browser stops replaying it.
    expect(res.cookies.get(COOKIE)?.value).toBe("");
  });

  it("lets a verified guest through on a regular dashboard route", async () => {
    mockVerifyIdToken.mockResolvedValue(claimsWithRoles(["guest"]));

    const res = await middleware(makeRequest("/dashboard", "valid-token"));

    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
  });

  it("rewrites a guest request for host-only areas to /403", async () => {
    mockVerifyIdToken.mockResolvedValue(claimsWithRoles(["guest"]));

    const res = await middleware(
      makeRequest("/dashboard/hotels/new", "valid-token"),
    );

    expect(res.headers.get("x-middleware-rewrite")).toContain("/403");
  });

  it("rewrites a guest request for /dashboard/apartments to /403", async () => {
    mockVerifyIdToken.mockResolvedValue(claimsWithRoles(["guest"]));

    const res = await middleware(
      makeRequest("/dashboard/apartments/1/edit", "valid-token"),
    );

    expect(res.headers.get("x-middleware-rewrite")).toContain("/403");
  });

  it("lets a host through on host-only areas", async () => {
    mockVerifyIdToken.mockResolvedValue(claimsWithRoles(["guest", "host"]));

    const hotels = await middleware(
      makeRequest("/dashboard/hotels", "valid-token"),
    );
    const apartments = await middleware(
      makeRequest("/dashboard/apartments", "valid-token"),
    );

    expect(hotels.headers.get("x-middleware-next")).toBe("1");
    expect(apartments.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets an admin through on host-only areas", async () => {
    mockVerifyIdToken.mockResolvedValue(claimsWithRoles(["admin"]));

    const res = await middleware(
      makeRequest("/dashboard/hotels/2/edit", "valid-token"),
    );

    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not verify tokens for public routes", async () => {
    const res = await middleware(makeRequest("/", "anything"));

    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
