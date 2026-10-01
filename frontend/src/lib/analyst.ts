// Folio AI's "brain".
//
// There is no AI backend yet, so every answer here is worked out from the
// user's REAL data (positions, cash, today's moves, recurring buys, the asset
// list) with plain rules. Nothing is invented — including news. When asked
// "why" something moved, Folio AI says it can't read news yet and compares the
// move with the market instead.
//
// Free text in, { text, actions, next } out:
//   text     the reply, streamed into the bubble word by word
//   actions  mint outline chips under the reply (open an asset or a tab)
//   next     the suggestion chips shown above the composer afterwards
//
// When a backend model exists: make `answer()` async, send `question` +
// `AnalystContext` to your endpoint and return the same shape. The screen
// already shows the thinking mascot while it waits.

import { money, pct } from "./format";

// ---------- types ----------

export type AnalystAsset = {
  symbol: string;
  name: string;
  tokenAddress: string;
  price: number;
  /** % move today, null if unknown */
  change: number | null;
  preIpo: boolean;
};

export type AnalystHolding = {
  symbol: string;
  name: string;
  tokenAddress: string;
  value: number;
  /** % move today, null if unknown */
  change: number | null;
  preIpo: boolean;
};

export type AnalystContext = {
  firstName: string;
  cash: number;
  holdings: AnalystHolding[];
  /** every listed asset (US stocks + pre-IPOs), used to answer about prices */
  assets: AnalystAsset[];
  recurring: { symbol: string; amount: number; next: Date }[];
  /** asset classes picked in onboarding, e.g. ["US stocks", "Pre-IPOs"] */
  owns: string[];
  /** average move today across each listed collection */
  market: { stocks: number | null; preIpos: number | null };
  /** US regular session open right now; null if unknown */
  marketOpen: boolean | null;
};

/** tab route names from navigation/TabBar.tsx */
export type AnalystTab = "Home" | "Trade" | "Portfolio" | "Leaders";

export type AnalystAction =
  | { label: string; tab: AnalystTab }
  | { label: string; asset: string /* tokenAddress */ };

export type AnalystReply = {
  text: string;
  actions?: AnalystAction[];
  next: string[];
};

// ---------- helpers ----------

const invested = (c: AnalystContext) =>
  c.holdings.reduce((t, h) => t + h.value, 0);
const total = (c: AnalystContext) => invested(c) + c.cash;
const unsigned = (v: number) => pct(Math.abs(v)).slice(1);
const shortDate = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
const largest = (c: AnalystContext) =>
  [...c.holdings].sort((a, b) => b.value - a.value)[0];

/** xStocks-style symbols ("NVDAx") → "NVDA" */
export const baseSym = (sym: string) =>
  /[A-Z]x$/.test(sym) ? sym.slice(0, -1) : sym;

/** "NVIDIA xStock" → "NVIDIA" */
export const cleanName = (name: string | undefined, sym: string) =>
  (name ?? "").replace(/\s*xstock$/i, "").trim() || baseSym(sym);

const findBySym = (c: AnalystContext, syms: string[]) =>
  c.assets.find((a) => syms.includes(baseSym(a.symbol).toUpperCase()));

const indexFund = (c: AnalystContext) =>
  findBySym(c, ["SPY", "VOO", "IVV", "SP500"]);

/** value-weighted % move of what you hold today */
export function folioChange(c: AnalystContext): number | null {
  const known = c.holdings.filter((h) => h.change != null && h.value > 0);
  const base = known.reduce((t, h) => t + h.value / (1 + h.change! / 100), 0);
  if (!base) return null;
  const now = known.reduce((t, h) => t + h.value, 0);
  return ((now - base) / base) * 100;
}

function topMover(list: AnalystAsset[]) {
  return list
    .filter((a) => a.change != null)
    .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!))[0];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

// ---------- asset mentions ----------

const ALIASES: Record<string, string[]> = {
  nvidia: ["NVDA"],
  tesla: ["TSLA"],
  apple: ["AAPL"],
  microsoft: ["MSFT"],
  amazon: ["AMZN"],
  google: ["GOOGL", "GOOG"],
  alphabet: ["GOOGL", "GOOG"],
  facebook: ["META"],
  netflix: ["NFLX"],
  broadcom: ["AVGO"],
  costco: ["COST"],
  berkshire: ["BRK.B", "BRKB"],
  "s&p": ["SPY", "VOO", "IVV", "SP500"],
  sp500: ["SPY", "VOO", "IVV", "SP500"],
  nasdaq: ["QQQ", "NDX100"],
  gold: ["GLD", "XAUT"],
  spacex: ["SPACEX"],
};

// short tickers that are also everyday words
const STOP = new Set(
  "a i am an as at be by do go if in is it me my no of on or so to up us we all and any are big can for has how new now one see the was who why you low buy".split(
    " ",
  ),
);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mention(q: string, c: AnalystContext): AnalystAsset | null {
  const t = ` ${q.toLowerCase()} `;
  for (const [k, syms] of Object.entries(ALIASES))
    if (t.includes(k)) {
      const a = findBySym(c, syms);
      if (a) return a;
    }
  for (const a of c.assets) {
    for (const s of new Set(
      [a.symbol, baseSym(a.symbol)].map((x) => x.toLowerCase()),
    )) {
      if (s.length < 2 || STOP.has(s)) continue;
      if (new RegExp(`[^a-z0-9]${esc(s)}[^a-z0-9]`).test(t)) return a;
    }
    const n = a.name.toLowerCase();
    if (n.length > 3 && t.includes(n)) return a;
  }
  return null;
}

// ---------- opening + pulse copy ----------

/** The opening messages under "TODAY". */
export function briefing(c: AnalystContext): string[] {
  const name = c.firstName ? `, ${c.firstName}` : "";
  if (!c.holdings.length)
    return [
      `Hi${name}, I'm Folio AI. Ask me about a price, your Folio, or how something works.`,
      c.cash > 0
        ? `You have ${money(c.cash)} ready to invest.`
        : `Add funds from your Folio tab and I'll start tracking everything you buy.`,
    ];

  const out = [
    `${greeting()}${name}. It's Folio AI. Ask me anything about your money, a price, or how something works.`,
  ];
  const big = largest(c);
  out.push(
    `${big.name} is your largest position, at ${Math.round((big.value / Math.max(1, invested(c))) * 100)}% of what you have invested.`,
  );
  const due = c.recurring.reduce((s, r) => s + r.amount, 0);
  if (due > c.cash)
    out.push(
      `Heads up: your recurring buys need ${money(due)} this month and you hold ${money(c.cash)} in USDC, so a short one would be skipped.`,
    );
  return out;
}

/** One line under the pulse tiles. */
export function pulseNote(c: AnalystContext): string | null {
  const { stocks, preIpos } = c.market;
  const top = topMover(c.assets);
  if (stocks == null && !top) return null;
  const parts: string[] = [];
  if (stocks != null)
    parts.push(
      `US stocks are ${stocks >= 0 ? "up" : "down"} ${unsigned(stocks)} on average today` +
        (preIpos != null ? `, pre-IPOs ${pct(preIpos)}.` : "."),
    );
  if (top)
    parts.push(`${top.name} is the move to watch at ${pct(top.change!)}.`);
  return parts.join(" ");
}

/** Suggestion chips for a fresh chat. */
export function starters(c: AnalystContext): string[] {
  const top = topMover(c.assets);
  return [
    "How is my Folio doing?",
    top ? `How is ${top.name} doing?` : "What moved today?",
    "Am I too concentrated?",
    "What is a pre-IPO?",
  ];
}

// ---------- glossary ----------

const GLOSSARY: [RegExp, string, AnalystAction[]?][] = [
  [
    /pre-?ipo/,
    "A pre-IPO is a share in a private company, priced off its last funding round. It stays locked until the company lists or is acquired, so you can't sell on demand.",
  ],
  [
    /index fund|etf/,
    "An index fund holds many companies in one token. An S&P 500 fund holds the 500 largest US companies and rebalances for you, so one bad company barely moves it.",
  ],
  [
    /recurring|dca|dollar.?cost/,
    "A recurring buy invests a fixed amount on a schedule, say $50 every month. You buy more when prices are low and less when they're high, and you never have to pick a moment.",
    [{ label: "Open Folio", tab: "Portfolio" }],
  ],
  [
    /usdc|stablecoin/,
    "USDC is a digital dollar. One USDC is meant to be worth one US dollar, and it's what your cash in Folio is held as.",
  ],
  [
    /non-?custodial|custod/,
    "Non-custodial means your assets sit in a wallet that only you control. Folio can't move them without you approving it.",
  ],
  [
    /perp/,
    "A perp is a contract on a price. You go long if you think it rises, short if you think it falls, and leverage multiplies the result both ways. You never own the asset, and there's a small funding payment every hour while it's open.",
    [{ label: "Open Trade", tab: "Trade" }],
  ],
  [
    /funding/,
    "Funding is a small payment between longs and shorts every hour. When more people are long, longs pay shorts, which pulls the perp price back toward the real price.",
  ],
  [
    /leverage/,
    "Leverage lets $100 trade like $1,000 at 10x. A 1% move becomes 10% on your money. At 10x, a 10% move against you closes the position and your margin is gone.",
  ],
  [
    /liquidat/,
    "Liquidation is when a perp position closes automatically because losses have eaten almost all of its margin. Your ticket always shows the price where that happens.",
  ],
  [
    /margin/,
    "Margin is the money you put into a perp position. It's the most you can lose on that position.",
  ],
];

// ---------- the answer ----------

export function answer(question: string, c: AnalystContext): AnalystReply {
  const r = route(question.trim(), c);
  const q = question.trim().toLowerCase();
  // never suggest the question just asked
  r.next = r.next.filter((n) => n.toLowerCase() !== q).slice(0, 4);
  return r;
}

function route(q: string, c: AnalystContext): AnalystReply {
  const t = q.toLowerCase();
  const a = mention(t, c);
  const START = starters(c);

  if (/^(hi|hey|hello|gm|yo|good (morning|afternoon|evening))\b/.test(t))
    return {
      text: `Hi${c.firstName ? ` ${c.firstName}` : ""}. Ask me about a price, your Folio, or anything you're unsure about.`,
      next: START,
    };
  if (/\b(thanks|thank you|ty|cheers)\b/.test(t))
    return {
      text: "Any time.",
      next: ["How is my Folio doing?", "What moved today?"],
    };

  // what is X / explain X
  if (
    /^(what('?s| is| are| does)|explain|define|how does|how do|meaning of)/.test(
      t,
    ) &&
    !a
  )
    for (const [re, text, actions] of GLOSSARY)
      if (re.test(t))
        return {
          text,
          actions,
          next: [
            "What is an index fund?",
            "What is a recurring buy?",
            "How is my Folio doing?",
          ],
        };

  // cash
  if (/\b(cash|usdc|buying power|spare money)\b/.test(t)) {
    const due = c.recurring.reduce((s, r) => s + r.amount, 0);
    const tot = total(c);
    if (c.cash <= 0)
      return {
        text: "You have no USDC right now. Add some from the + button on the Folio tab.",
        actions: [{ label: "Open Folio", tab: "Portfolio" }],
        next: ["How is my Folio doing?", "What is USDC?"],
      };
    return {
      text:
        `${money(c.cash)} in USDC, ${tot > 0 ? Math.round((c.cash / tot) * 100) : 100}% of your Folio.` +
        (due > 0
          ? due > c.cash
            ? ` Your recurring buys need ${money(due)} this month, more than you hold, so add USDC or the short ones get skipped.`
            : ` ${money(due)} of it is set aside for this month's recurring buys.`
          : ""),
      next: ["When is my next recurring buy?", "How is my Folio doing?"],
    };
  }

  // recurring buys
  if (/recurring|auto.?buy|scheduled|next buy/.test(t)) {
    const next = [...c.recurring].sort((x, y) => +x.next - +y.next)[0];
    if (!next)
      return {
        text: "You have no recurring buys. A small monthly one is the easiest way to keep building without timing the market.",
        actions: [{ label: "Open Folio", tab: "Portfolio" }],
        next: ["What is a recurring buy?", "How much cash do I have?"],
      };
    return {
      text: `Your next recurring buy is ${money(next.amount)} of ${baseSym(next.symbol)} on ${shortDate(next.next)}. You have ${c.recurring.length} active in total.`,
      next: ["How much cash do I have?", "How is my Folio doing?"],
    };
  }

  // the whole Folio
  if (
    /(portfolio|folio|balance|net worth|worth|how much (do|have) i|total|how am i doing)/.test(
      t,
    ) &&
    !a
  ) {
    const inv = invested(c);
    const move = folioChange(c);
    return {
      text:
        `Your Folio is worth ${money(total(c))}: ${money(inv)} invested across ${c.holdings.length} ${c.holdings.length === 1 ? "position" : "positions"} and ${money(c.cash)} in USDC.` +
        (move != null
          ? ` Your positions are ${move >= 0 ? "up" : "down"} ${unsigned(move)} today.`
          : ""),
      actions: [{ label: "Open Folio", tab: "Portfolio" }],
      next: [
        "Am I too concentrated?",
        "What moved today?",
        "How much cash do I have?",
      ],
    };
  }

  // concentration
  if (/concentrat|diversif|too much in|spread/.test(t)) {
    if (!c.holdings.length)
      return {
        text: "You don't hold anything yet, so there's nothing to be concentrated in.",
        next: START,
      };
    const inv = Math.max(1, invested(c));
    const big = largest(c);
    const share = (big.value / inv) * 100;
    const pre = c.holdings
      .filter((h) => h.preIpo)
      .reduce((s, h) => s + h.value, 0);
    const idx = indexFund(c);
    const heavy = share > 35;
    return {
      text:
        `${heavy ? "Yes, somewhat." : share >= 25 ? "Mildly." : "Not really."} ${big.name} is ${Math.round(share)}% of what you have invested${big.preIpo ? ", and it's locked until a listing, so you can't trim it" : ""}.` +
        (pre > 0 && !big.preIpo
          ? ` Pre-IPOs are ${Math.round((pre / inv) * 100)}% of your investments, and those can swing further than listed stocks.`
          : "") +
        (heavy
          ? idx
            ? " An index fund would spread new money across hundreds of companies."
            : ""
          : ` Your money is spread across ${c.holdings.length} positions.`),
      actions:
        heavy && idx
          ? [{ label: idx.name, asset: idx.tokenAddress }]
          : undefined,
      next: ["What is an index fund?", "How is my Folio doing?"],
    };
  }

  // "should I buy …"
  if (
    /(should i|what should|what to|recommend|tip|best|worth buying).*(buy|invest|trade|it)|^(what|which).*\bbuy\b|should i (buy|sell)/.test(
      t,
    )
  ) {
    if (a) {
      return {
        text:
          `I won't make that call for you, but here's what matters. ${a.name} is at ${money(a.price)}${a.change != null ? `, ${pct(a.change)} today` : ""}. ` +
          (a.preIpo
            ? "It's a pre-IPO, so your money is locked until it lists."
            : "If you're unsure about timing, a small recurring buy spreads it out."),
        actions: [{ label: `Open ${a.name}`, asset: a.tokenAddress }],
        next: [`How is ${a.name} doing?`, "Am I too concentrated?"],
      };
    }
    const held = new Set(
      c.holdings.map((h) => (h.preIpo ? "Pre-IPOs" : "US stocks")),
    );
    const missing = c.owns.filter(
      (o) => (o === "US stocks" || o === "Pre-IPOs") && !held.has(o),
    );
    const idx = indexFund(c);
    return {
      text:
        "I won't pick for you; that call is yours." +
        (missing.length
          ? ` What I can say: you told me you want ${missing.join(" and ")}, and you don't hold any yet.`
          : c.holdings.length
            ? " What I can say: your holdings already match what you told me you want to own."
            : " A good first step is one small buy in something you'd happily hold for years.") +
        (idx && !c.holdings.some((h) => h.tokenAddress === idx.tokenAddress)
          ? " An index fund is the simplest way to own a slice of everything."
          : ""),
      actions: idx ? [{ label: idx.name, asset: idx.tokenAddress }] : undefined,
      next: ["What is an index fund?", "Am I too concentrated?"],
    };
  }

  // a specific asset
  if (a) {
    const why = /why|move|up|down|happen|news/.test(t);
    const avg = a.preIpo ? c.market.preIpos : c.market.stocks;
    let reason = "";
    if (why) {
      if (a.preIpo)
        reason = " Pre-IPOs reprice on funding rounds, not on daily news.";
      else if (a.change != null && avg != null) {
        const vs =
          Math.abs(a.change - avg) < 0.5
            ? "moving with the market"
            : a.change > avg
              ? "beating the market"
              : "lagging the market";
        reason = ` I can't read the news yet, so I can't tell you why. For context, US stocks are ${pct(avg)} on average today, so ${a.name} is ${vs}.`;
      } else reason = " I can't read the news yet, so I can't tell you why.";
    }
    const pos = c.holdings.find((h) => h.tokenAddress === a.tokenAddress);
    const up = (a.change ?? 0) >= 0;
    return {
      text:
        `${a.name} is at ${money(a.price)}${a.change != null ? `, ${pct(a.change)} today` : ""}.` +
        reason +
        (pos ? ` You hold ${money(pos.value)} of it.` : ""),
      actions: [{ label: `Open ${a.name}`, asset: a.tokenAddress }],
      next: why
        ? [`Should I buy ${a.name}?`, "What moved today?"]
        : [`Why is ${a.name} ${up ? "up" : "down"}?`, "What moved today?"],
    };
  }

  // the market today
  if (/market|today|moved|movers|pulse|news|happening/.test(t)) {
    const note = pulseNote(c);
    const mine = c.holdings
      .filter((h) => h.change != null)
      .sort((x, y) => Math.abs(y.change!) - Math.abs(x.change!))[0];
    const open =
      c.marketOpen == null
        ? ""
        : c.marketOpen
          ? " The US market is open."
          : " The US market is closed right now.";
    return {
      text:
        (note ?? "I don't have today's prices yet.") +
        (mine
          ? ` Of what you hold, ${mine.name} moved the most at ${pct(mine.change!)}.`
          : "") +
        open,
      next: ["How is my Folio doing?", "Am I too concentrated?"],
    };
  }

  const ex = topMover(c.assets);
  return {
    text: `I can help with prices, your Folio, and how things work. Try “${ex ? `How is ${ex.name} doing?` : "What moved today?"}” or “What is a pre-IPO?”`,
    next: START,
  };
}
