import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const FIREBASE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
);

export type HasuraRole = "guest" | "host" | "admin";

export type HasuraClaims = {
  "x-hasura-default-role"?: HasuraRole;
  "x-hasura-allowed-roles"?: HasuraRole[];
  "x-hasura-user-id"?: string;
};

export type SafeTrustClaims = JWTPayload & {
  "https://hasura.io/jwt/claims"?: HasuraClaims;
};

/** Injectable key set so tests can pass a mocked JWKS (createLocalJWKSet). */
export type JwtKeySet = Parameters<typeof jwtVerify>[1];

let remoteJwks: JwtKeySet | null = null;

/**
 * Lazily create the remote JWKS so the Edge bundle only fetches Google's
 * signing keys once per isolate and caches them for subsequent requests.
 */
function getJwks(): JwtKeySet {
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(FIREBASE_JWKS_URL);
  }
  return remoteJwks;
}

function getProjectId(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
}

/**
 * Verifies a Firebase ID token: signature, issuer, audience and expiry.
 * Returns the verified claims, or null when the token is missing, forged,
 * expired, or issued for another project.
 */
export async function verifyIdToken(
  token: string,
  keySet: JwtKeySet = getJwks(),
): Promise<SafeTrustClaims | null> {
  const projectId = getProjectId();
  if (!token || !projectId) return null;

  try {
    const { payload } = await jwtVerify<SafeTrustClaims>(token, keySet, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

/** Reads the verified Hasura roles from verified claims (defaults to guest). */
export function getRolesFromClaims(
  claims: SafeTrustClaims | null,
): HasuraRole[] {
  const roles =
    claims?.["https://hasura.io/jwt/claims"]?.["x-hasura-allowed-roles"];
  return Array.isArray(roles) && roles.length > 0 ? roles : ["guest"];
}
