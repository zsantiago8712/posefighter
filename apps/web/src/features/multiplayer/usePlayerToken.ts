import { useEffect, useState } from "react";

const KEY = "posefight.playerToken";

/** Stable anonymous identity per browser. Client-only; returns null during SSR / first paint. */
export function usePlayerToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(getOrCreatePlayerToken());
  }, []);
  return token;
}

export function getOrCreatePlayerToken(): string {
  let t = window.localStorage.getItem(KEY);
  if (!t) {
    t = crypto.randomUUID();
    window.localStorage.setItem(KEY, t);
  }
  return t;
}

const NICK_KEY = "posefight.nickname";
export function getSavedNickname(): string {
  return window.localStorage.getItem(NICK_KEY) ?? "";
}
export function saveNickname(n: string) {
  window.localStorage.setItem(NICK_KEY, n);
}
