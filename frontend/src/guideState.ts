// Remembers that this browser has seen the first-visit guide. Storage can be blocked
// (private mode, previews), so these never throw; the guide then just shows again.
const KEY = "llsn.guideSeen";

export function guideSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markGuideSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}
