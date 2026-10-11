// Name of the cookie that carries the session id. Nothing else is stored in it.
export const SESSION_COOKIE = 'sid';

// How long a session stays valid after login.
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Login attempts allowed per IP within the window.
export const LOGIN_RATE_LIMIT = { limit: 10, ttl: 60 * 1000 };
