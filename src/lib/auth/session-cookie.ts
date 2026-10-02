import Cookies from "js-cookie";

/** Cookie that carries the Firebase ID token verified by the middleware. */
export const SESSION_COOKIE = "firebase-token";

const SESSION_COOKIE_OPTIONS = {
  expires: 7,
  secure: true,
  sameSite: "strict" as const,
};

/** Stores the (freshly issued) ID token so Edge middleware can verify it. */
export function setSessionCookie(token: string): void {
  Cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
}

/** Removes the session cookie (logout, or a token middleware rejected). */
export function clearSessionCookie(): void {
  Cookies.remove(SESSION_COOKIE);
}
