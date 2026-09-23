export type PreIpoCategory =
  | "AI"
  | "Space"
  | "Fintech"
  | "Defence"
  | "Data"
  | "Gaming"
  | "Software";

export type PreIpoCompany = {
  symbol: string;
  initial: string;
  name: string;
  category: PreIpoCategory;
  lastRound: string; // e.g. "Jun 2026"
  price: number;
  vsLastRoundPct: number | null;
};

export const PREIPO_COMPANIES: PreIpoCompany[] = [
  {
    symbol: "SPCX",
    initial: "S",
    name: "SpaceX",
    category: "Space",
    lastRound: "Jun 2026",
    price: 212.5,
    vsLastRoundPct: -3.1,
  },
  {
    symbol: "OPAI",
    initial: "O",
    name: "OpenAI",
    category: "AI",
    lastRound: "Mar 2026",
    price: 418.0,
    vsLastRoundPct: 6.4,
  },
  {
    symbol: "STRP",
    initial: "S",
    name: "Stripe",
    category: "Fintech",
    lastRound: "Feb 2026",
    price: 96.8,
    vsLastRoundPct: -1.2,
  },
  {
    symbol: "ANDL",
    initial: "A",
    name: "Anduril",
    category: "Defence",
    lastRound: "Aug 2026",
    price: 74.2,
    vsLastRoundPct: 2.8,
  },
  {
    symbol: "DBRX",
    initial: "D",
    name: "Databricks",
    category: "Data",
    lastRound: "Jan 2026",
    price: 131.4,
    vsLastRoundPct: -4.6,
  },
  {
    symbol: "RVLT",
    initial: "R",
    name: "Revolut",
    category: "Fintech",
    lastRound: "Nov 2025",
    price: 58.9,
    vsLastRoundPct: null,
  },
  {
    symbol: "EPIC",
    initial: "E",
    name: "Epic Games",
    category: "Gaming",
    lastRound: "Apr 2026",
    price: 42.1,
    vsLastRoundPct: -7.9,
  },
  {
    symbol: "CNVA",
    initial: "C",
    name: "Canva",
    category: "Software",
    lastRound: "May 2026",
    price: 88.3,
    vsLastRoundPct: 0.9,
  },
];
