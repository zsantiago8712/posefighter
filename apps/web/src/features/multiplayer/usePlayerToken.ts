import { useEffect, useState } from "react";

const KEY = "posefight.playerToken";

/**
 * Anonymous identity per BROWSER TAB (sessionStorage): survives reloads in the same tab, but every new tab
 * is a new player. That lets one PC play both sides for testing, and a shared /room link opened in a new tab
 * joins as the second fighter instead of hijacking the host's seat.
 */
export function usePlayerToken(fresh = false): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // `fresh`: force a brand-new identity. Needed because Chrome COPIES sessionStorage into tabs opened via
    // window.open, so "open player 2 in a new tab" would otherwise inherit player 1's token.
    setToken(fresh ? resetPlayerToken() : getOrCreatePlayerToken());
  }, [fresh]);
  return token;
}

export function resetPlayerToken(): string {
  const t = crypto.randomUUID();
  window.sessionStorage.setItem(KEY, t);
  return t;
}

export function getOrCreatePlayerToken(): string {
  let t = window.sessionStorage.getItem(KEY);
  if (!t) {
    t = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, t);
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
