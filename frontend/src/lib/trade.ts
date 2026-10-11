// Helpers for amounts, dates and labels used by the asset page and trade sheets.

/** Prototype cleanAmt: digits + one dot, 2 decimals, no leading zeros, max 8 chars. */
export function cleanAmt(v: string) {
  v = v.replace(",", ".").replace(/[^0-9.]/g, "");
  const i = v.indexOf(".");
  if (i >= 0)
    v =
      v.slice(0, i + 1) +
      v
        .slice(i + 1)
        .replace(/\./g, "")
        .slice(0, 2);
  if (/^0\d/.test(v)) v = v.replace(/^0+/, "");
  return v.slice(0, 8);
}

export const floorTo = (n: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.floor(n * f) / f;
};

/** 100 → "100", 12.5 → "12.50" (what goes back into the field) */
export const fmtIn = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2);

/** token quantities: 0.542912 / 12.4031 */
export const units = (n: number) =>
  n.toLocaleString("en-US", {
    maximumFractionDigits: n !== 0 && Math.abs(n) < 1 ? 6 : 4,
  });

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Next calendar date for a day-of-month (1–30); rolls to next month if it has passed. */
export function nextOccurrence(day: number): Date {
  const now = new Date();
  let d = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
  if (d <= now)
    d = new Date(now.getFullYear(), now.getMonth() + 1, day, 0, 0, 0, 0);
  return d;
}

export const defaultDay = () => Math.min(new Date().getDate() + 1, 30);

export const thenText = (day: number) => `The ${ordinal(day)} of every month`;

/** "25 Sep" */
export const shortDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** "Fri 25 Sep" */
export const dayDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** "did:privy:xxxxxxxxxxxxxxxxxxxxxxxxx" → "cmue…huk8" */
export function maskUserId(id: string) {
  const tail = id.split(":").pop() ?? id;
  return tail.length > 10 ? `${tail.slice(0, 4)}…${tail.slice(-4)}` : tail;
}

/**
 * Pre-IPO selling. The prototype locks pre-IPOs until listing; your backend
 * currently lets them be sold. Flip this to true to show the prototype's
 * "locked until it lists" sheet instead of the sell flow.
 */
export const PRE_IPO_LOCKED = false;
