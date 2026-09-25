// The AI Analyst's "brain".
//
// There is no AI backend yet, so every line here is worked out from the
// user's REAL data (positions, cash, today's moves, recurring buys) with
// plain rules. Nothing is invented.
//
// When a backend model exists: make `answer()` async, send `question` +
// `AnalystContext` to your endpoint, and return its text. The screen
// already shows typing dots while it waits.

import { money, pct } from "./format";

export type AnalystHolding = {
  symbol: string;
  value: number;
  /** % move today, null if unknown */
  change: number | null;
  preIpo: boolean;
};

export type AnalystContext = {
  firstName: string;
  cash: number;
  holdings: AnalystHolding[];
  recurring: { symbol: string; amount: number; next: Date }[];
  /** asset classes picked in onboarding, e.g. ["US stocks", "Pre-IPOs"] */
  owns: string[];
  /** average move today across each listed collection */
  market: { stocks: number | null; preIpos: number | null };
};

const invested = (c: AnalystContext) =>
  c.holdings.reduce((t, h) => t + h.value, 0);
const total = (c: AnalystContext) => invested(c) + c.cash;
const short = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** value-weighted % move of what you hold today */
export function folioChange(c: AnalystContext): number | null {
  const known = c.holdings.filter((h) => h.change != null && h.value > 0);
  const base = known.reduce((t, h) => t + h.value / (1 + h.change! / 100), 0);
  if (!base) return null;
  const now = known.reduce((t, h) => t + h.value, 0);
  return ((now - base) / base) * 100;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** The three opening messages ("THIS MORNING"). */
export function briefing(c: AnalystContext): string[] {
  const out: string[] = [];
  const t = total(c);
  const move = folioChange(c);
  const hello = `${greeting()}${c.firstName ? `, ${c.firstName}` : ""}.`;

  if (!c.holdings.length) {
    out.push(
      c.cash > 0
        ? `${hello} You hold ${money(c.cash)} in USDC and no positions yet. Nothing needs a decision today.`
        : `${hello} Your Folio is empty for now. Add USDC from the Folio tab and I'll start tracking it.`,
    );
  } else {
    out.push(
      `${hello} Your Folio is worth ${money(t)}.${move != null ? ` Your positions are ${move >= 0 ? "up" : "down"} ${pct(Math.abs(move)).slice(1)} today.` : ""} Nothing in it needs a decision right now.`,
    );
    const big = [...c.holdings].sort((a, b) => b.value - a.value)[0];
    const share = Math.round((big.value / t) * 100);
    out.push(
      `${big.symbol} is your largest position, at ${share}% of your Folio.`,
    );
  }

  const next = [...c.recurring].sort((a, b) => +a.next - +b.next)[0];
  if (next) {
    const short30 = c.recurring.reduce((s, r) => s + r.amount, 0) > c.cash;
    out.push(
      `Your next recurring buy is ${money(next.amount)} of ${next.symbol} on ${short(next.next)}.` +
        (short30
          ? ` Your cash won't cover every recurring buy this month, so a short one would be skipped.`
          : ""),
    );
  } else if (c.holdings.length) {
    out.push(
      `You have no recurring buys. A small monthly one is the easiest way to keep building without timing the market.`,
    );
  }
  return out;
}

export const QUESTIONS = [
  "What moved today?",
  "Am I too concentrated?",
  "How much cash do I have?",
  "What should I buy?",
] as const;
export type Question = (typeof QUESTIONS)[number];

export function answer(q: Question, c: AnalystContext): string {
  const t = total(c);

  if (q === "What moved today?") {
    const movers = c.holdings
      .filter((h) => h.change != null)
      .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!));
    const mk =
      c.market.stocks != null
        ? ` Across the market, US stocks are ${pct(c.market.stocks)} on average today.`
        : "";
    if (!movers.length)
      return `None of your positions have a price move to report yet.${mk}`;
    const m = movers[0];
    const move = folioChange(c);
    return `${m.symbol} moved the most of what you hold: ${pct(m.change!)} today.${
      move != null ? ` Your positions overall are ${pct(move)}.` : ""
    }${mk}`;
  }

  if (q === "Am I too concentrated?") {
    if (!c.holdings.length) return "Not at all. You hold only cash right now.";
    const big = [...c.holdings].sort((a, b) => b.value - a.value)[0];
    const share = (big.value / t) * 100;
    const pre = c.holdings
      .filter((h) => h.preIpo)
      .reduce((s, h) => s + h.value, 0);
    const preNote =
      pre > 0
        ? ` Pre-IPOs are ${Math.round((pre / t) * 100)}% of your Folio, and those can swing further than listed stocks.`
        : "";
    if (share >= 40)
      return `Yes. ${big.symbol} is ${Math.round(share)}% of your Folio, so one company drives most of your result.${preNote}`;
    if (share >= 25)
      return `Mildly. ${big.symbol} is ${Math.round(share)}% of your Folio. Worth watching, not urgent.${preNote}`;
    return `No. Your largest position, ${big.symbol}, is ${Math.round(share)}% of your Folio across ${c.holdings.length} holdings.${preNote}`;
  }

  if (q === "How much cash do I have?") {
    const due = c.recurring.reduce((s, r) => s + r.amount, 0);
    if (c.cash <= 0)
      return "You have no USDC right now. Add some from the + button on the Folio tab.";
    const share = t > 0 ? Math.round((c.cash / t) * 100) : 100;
    return `${money(c.cash)} in USDC, ${share}% of your Folio.${
      due > 0
        ? due > c.cash
          ? ` Your recurring buys need ${money(due)} this month, more than you hold, so add USDC or the short ones get skipped.`
          : ` ${money(due)} of it is set aside for this month's recurring buys.`
        : ""
    }`;
  }

  // "What should I buy?"
  const held = new Set(
    c.holdings.map((h) => (h.preIpo ? "Pre-IPOs" : "US stocks")),
  );
  const missing = c.owns.filter(
    (o) => (o === "US stocks" || o === "Pre-IPOs") && !held.has(o),
  );
  return `I won't pick for you.${
    missing.length
      ? ` What I can say: you told me you want ${missing.join(" and ")}, and you don't hold any yet.`
      : c.holdings.length
        ? " What I can say: your holdings already match what you told me you want to own."
        : " A good first step is one small buy in something you'd happily hold for years."
  }`;
}
