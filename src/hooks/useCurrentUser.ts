"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type Role = "guest" | "host" | "admin";

export type CurrentUser = {
  uid: string;
  email: string | null;
  roles: Role[];
  activeRole: Role;
} | null;

type HasuraRoleClaims = {
  "x-hasura-allowed-roles"?: Role[];
  "x-hasura-default-role"?: Role;
};

/**
 * Single source of truth for the signed-in identity on the client.
 *
 * Identity and roles are read from the verified ID-token claims issued by the
 * backend (BE-02) — never from localStorage — so editing stored strings cannot
 * change who the UI thinks you are or which role it renders.
 */
export function useCurrentUser(): { user: CurrentUser; loading: boolean } {
  const [user, setUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onIdTokenChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const { claims } = await firebaseUser.getIdTokenResult();
          const hasura = claims["https://hasura.io/jwt/claims"] as
            | HasuraRoleClaims
            | undefined;
          const allowed = hasura?.["x-hasura-allowed-roles"];
          const roles: Role[] =
            Array.isArray(allowed) && allowed.length > 0 ? allowed : ["guest"];
          const activeRole: Role =
            hasura?.["x-hasura-default-role"] ?? roles[0];

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            roles,
            activeRole,
          });
        } catch {
          // Token refresh failed — treat as signed out until the next change.
          setUser(null);
        } finally {
          setLoading(false);
        }
      }),
    [],
  );

  return { user, loading };
}
