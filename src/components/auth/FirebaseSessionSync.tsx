"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";

/**
 * Keeps the `firebase-token` cookie in sync with Firebase Auth while the tab
 * is open. Firebase refreshes ID tokens ~55 minutes before expiry, so active
 * users always present a valid token to the Edge middleware and are never
 * bounced to /login for an expired cookie. Signed-out users get the cookie
 * cleared.
 */
export function FirebaseSessionSync() {
  useEffect(
    () =>
      onIdTokenChanged(auth, (user) => {
        if (user) {
          user
            .getIdToken()
            .then(setSessionCookie)
            .catch(() => {
              // Transient token refresh failure — middleware will re-verify
              // the existing cookie and redirect if it is no longer valid.
            });
        } else {
          clearSessionCookie();
        }
      }),
    [],
  );

  return null;
}
