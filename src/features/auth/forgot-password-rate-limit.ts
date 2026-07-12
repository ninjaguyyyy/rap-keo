const FORGOT_PASSWORD_RATE_LIMIT_MAP_KEY =
  "__rap_keo_forgot_password_rate_limit_map__";

type RateLimitStore = Map<string, number>;

function getStore(): RateLimitStore {
  const globalWithStore = globalThis as typeof globalThis & {
    [FORGOT_PASSWORD_RATE_LIMIT_MAP_KEY]?: RateLimitStore;
  };

  if (!globalWithStore[FORGOT_PASSWORD_RATE_LIMIT_MAP_KEY]) {
    globalWithStore[FORGOT_PASSWORD_RATE_LIMIT_MAP_KEY] = new Map();
  }

  return globalWithStore[FORGOT_PASSWORD_RATE_LIMIT_MAP_KEY];
}

export function checkAndMarkForgotPasswordRequest(
  phone: string,
  cooldownMs: number,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const store = getStore();
  const lastRequestedAt = store.get(phone);

  if (lastRequestedAt) {
    const elapsed = now - lastRequestedAt;
    if (elapsed < cooldownMs) {
      return { allowed: false, retryAfterMs: cooldownMs - elapsed };
    }
  }

  store.set(phone, now);
  return { allowed: true };
}