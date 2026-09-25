// Number formatting shared by every screen.

/** $1,234.56 */
export const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** $1,235 */
export const money0 = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/** +2.1% / −1.4% (true minus sign, like the prototype) */
export const pct = (n: number, digits = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}%`;

/** % move since market open, or null when the API didn't send an open price */
export function dayChange(price: string | number, open?: string | null): number | null {
  const p = Number(price);
  const o = Number(open);
  if (!open || !Number.isFinite(o) || o <= 0 || !Number.isFinite(p)) return null;
  return ((p - o) / o) * 100;
}

/** "SpaceX" → "SPA", "T-BILL 3M" → "TBI" */
export const assetCode = (sym: string) =>
  sym.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
