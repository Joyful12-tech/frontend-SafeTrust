/**
 * @jest-environment node
 */
import { generateKeyPairSync } from "node:crypto";
import {
  createLocalJWKSet,
  importJWK,
  SignJWT,
  type JWK,
  type JWTPayload,
} from "jose";
import { getRolesFromClaims, verifyIdToken } from "./verify-id-token";

const PROJECT_ID = "safetrust-test-project";
const ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;

const HASURA_CLAIMS = {
  "x-hasura-default-role": "guest",
  "x-hasura-allowed-roles": ["guest", "host"],
  "x-hasura-user-id": "user-1",
} as const;

type SignOptions = {
  issuer?: string;
  audience?: string;
  expiresAt?: number;
  kid?: string;
  /** Sign with a key that is NOT in the mocked JWKS (forged token). */
  signWithForgedKey?: boolean;
};

describe("verifyIdToken", () => {
  let signingKey: CryptoKey;
  let otherSigningKey: CryptoKey;
  let publicJwk: JWK;
  let localJwks: ReturnType<typeof createLocalJWKSet>;

  const signToken = async (
    payload: JWTPayload,
    options: SignOptions = {},
  ): Promise<string> =>
    new SignJWT(payload)
      .setProtectedHeader({
        alg: "RS256",
        kid: options.kid ?? "test-key",
      })
      .setIssuer(options.issuer ?? ISSUER)
      .setAudience(options.audience ?? PROJECT_ID)
      .setIssuedAt()
      .setExpirationTime(
        options.expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
      )
      .sign(
        (options.signWithForgedKey
          ? otherSigningKey
          : signingKey) as Parameters<SignJWT["sign"]>[0],
      );

  beforeAll(async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });

    publicJwk = {
      ...(publicKey.export({ format: "jwk" }) as JWK),
      alg: "RS256",
      use: "sig",
      kid: "test-key",
    };
    signingKey = (await importJWK(
      privateKey.export({ format: "jwk" }) as JWK,
      "RS256",
    )) as CryptoKey;
    otherSigningKey = (await importJWK(
      other.privateKey.export({ format: "jwk" }) as JWK,
      "RS256",
    )) as CryptoKey;

    // Mocked JWKS: the remote Google JWKS is replaced by this local key set.
    localJwks = createLocalJWKSet({ keys: [publicJwk] });

    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = PROJECT_ID;
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  });

  it("returns the verified claims for a valid token", async () => {
    const token = await signToken({
      sub: "user-1",
      "https://hasura.io/jwt/claims": HASURA_CLAIMS,
    });

    const claims = await verifyIdToken(token, localJwks);

    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("user-1");
    expect(claims?.["https://hasura.io/jwt/claims"]).toEqual(HASURA_CLAIMS);
  });

  it("rejects an expired token", async () => {
    const token = await signToken(
      { sub: "user-1" },
      { expiresAt: Math.floor(Date.now() / 1000) - 60 },
    );

    expect(await verifyIdToken(token, localJwks)).toBeNull();
  });

  it("rejects a token minted for another project (wrong audience)", async () => {
    const token = await signToken(
      { sub: "user-1" },
      { audience: "other-project" },
    );

    expect(await verifyIdToken(token, localJwks)).toBeNull();
  });

  it("rejects a token from another issuer", async () => {
    const token = await signToken(
      { sub: "user-1" },
      { issuer: "https://securetoken.google.com/other-project" },
    );

    expect(await verifyIdToken(token, localJwks)).toBeNull();
  });

  it("rejects a forged token signed with a different key", async () => {
    // Header claims the trusted kid, but the signature uses another key pair.
    const token = await signToken(
      { sub: "user-1" },
      { signWithForgedKey: true },
    );

    expect(await verifyIdToken(token, localJwks)).toBeNull();
  });

  it("rejects a token whose kid is not in the JWKS", async () => {
    const token = await signToken({ sub: "user-1" }, { kid: "unknown-kid" });

    expect(await verifyIdToken(token, localJwks)).toBeNull();
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const header = Buffer.from(
      JSON.stringify({ alg: "none", kid: "test-key" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-1", iss: ISSUER, aud: PROJECT_ID }),
    ).toString("base64url");
    const unsigned = `${header}.${payload}.`;

    expect(await verifyIdToken(unsigned, localJwks)).toBeNull();
  });

  it("rejects garbage and empty tokens", async () => {
    expect(await verifyIdToken("x", localJwks)).toBeNull();
    expect(await verifyIdToken("", localJwks)).toBeNull();
  });

  it("rejects everything when the Firebase project id is not configured", async () => {
    const token = await signToken({ sub: "user-1" });
    const previous = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    expect(await verifyIdToken(token, localJwks)).toBeNull();

    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = previous;
  });
});

describe("getRolesFromClaims", () => {
  it("defaults to guest when claims are missing", () => {
    expect(getRolesFromClaims(null)).toEqual(["guest"]);
    expect(getRolesFromClaims({ sub: "user-1" })).toEqual(["guest"]);
    expect(getRolesFromClaims({ "https://hasura.io/jwt/claims": {} })).toEqual([
      "guest",
    ]);
  });

  it("reads the verified allowed roles", () => {
    expect(
      getRolesFromClaims({
        "https://hasura.io/jwt/claims": {
          "x-hasura-allowed-roles": ["guest", "host"],
          "x-hasura-default-role": "guest",
        },
      }),
    ).toEqual(["guest", "host"]);
  });
});
