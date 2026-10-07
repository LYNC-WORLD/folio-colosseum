// src/context/OnboardingContext.tsx
//
// Onboarding is now two questions: what to own, and starting size.
// The drawdown and holding-period questions were removed.
//
// Backend payload keeps the same keys (see ProfileSummaryScreen):
//   interestedStocks: AssetKey[]   → "stocks" | "preipo" | "commodities" | "treasuries"
//   amountToPutIn:    number       → CAPITAL_DEFS[capital].amount (lower bound of the range)
//   question1:        NOT_SENT     → "data not sent" (question removed)
//   question2:        NOT_SENT     → "data not sent" (question removed)

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Sent in place of answers to questions that are no longer asked. */
export const NOT_SENT = "data not sent";

// ---------- Question 1 — What do you want to own? (multi-select) ----------
export type AssetKey = "stocks" | "preipo" | "commodities" | "treasuries";

export const ASSET_DEFS: { id: AssetKey; label: string; note: string }[] = [
  {
    id: "stocks",
    label: "US stocks",
    note: "NVIDIA, Apple, Tesla and 400 more",
  },
  { id: "preipo", label: "Pre-IPOs", note: "SpaceX, OpenAI, Stripe, Anduril" },
  { id: "commodities", label: "Commodities", note: "Gold, silver, oil" },
  {
    id: "treasuries",
    label: "Treasuries",
    note: "Short-dated US government debt",
  },
];

// ---------- Question 2 — What are you starting with? ----------
export type CapitalId = "a" | "b" | "c" | "d";

export const CAPITAL_DEFS: {
  id: CapitalId;
  label: string;
  note: string;
  /** lower bound of the range, sent to the backend as amountToPutIn */
  amount: number;
}[] = [
  { id: "a", label: "$10 - $100", note: "Testing the water", amount: 10 },
  { id: "b", label: "$100 - $1,000", note: "Building a base", amount: 100 },
  {
    id: "c",
    label: "$1,000 - $10,000",
    note: "Serious position",
    amount: 1000,
  },
  { id: "d", label: "$10,000+", note: "Allocating", amount: 10000 },
];

// Kept only so the saved profile keeps its old shape. No longer asked.
export type HorizonId = "weeks" | "months" | "years" | "decades";

/** What the old flow defaulted to; used wherever saved-profile readers expect a horizon. */
const DEFAULT_HORIZON: HorizonId = "years";

// ---------- Profile names: now keyed on starting size ----------
const NAMES: Record<CapitalId, string> = {
  a: "The Explorer",
  b: "The Builder",
  c: "The Committed",
  d: "The Allocator",
};

// Same shape as before, so lib/onboardingProfile and anything reading the
// saved profile keep compiling. Fields that came from the removed questions
// are filled with neutral values (see computeProfile).
export type OnboardingProfile = {
  title: string;
  description: string;
  tagline: string;
  feedTitle: string;
  feedSub: string;
  amountTitle: string;
  amountSub: string;
  chartTitle: string;
  chartSub: string;
  /** prototype "WHAT CHANGES" sentence */
  whatChanges: string;
  /** answer labels, for the result cards and the Account / Folio screens */
  owns: string[];
  capitalLabel: string;
  /** empty — the drawdown question is no longer asked */
  riskSummary: string;
  /** empty — the holding-period question is no longer asked */
  horizonLabel: string;
  /** always DEFAULT_HORIZON — the holding-period question is no longer asked */
  horizon: HorizonId;
};

type OnboardingValue = {
  picked: Record<AssetKey, boolean>;
  pickedCount: number;
  togglePicked: (key: AssetKey) => void;
  capital: CapitalId;
  setCapital: (v: CapitalId) => void;
  /** number sent to the backend as amountToPutIn */
  resolvedAmount: number;
  computeProfile: () => OnboardingProfile;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

/** "A", "A and B", "A, B and C" */
function joinAnd(list: string[]) {
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // prototype defaults
  const [picked, setPicked] = useState<Record<AssetKey, boolean>>({
    stocks: true,
    preipo: true,
    commodities: false,
    treasuries: false,
  });
  const [capital, setCapital] = useState<CapitalId>("b");

  const togglePicked = useCallback((key: AssetKey) => {
    setPicked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const pickedCount = Object.values(picked).filter(Boolean).length;
  const capitalDef =
    CAPITAL_DEFS.find((c) => c.id === capital) ?? CAPITAL_DEFS[1];
  const resolvedAmount = capitalDef.amount;

  const computeProfile = useCallback((): OnboardingProfile => {
    const owns = ASSET_DEFS.filter((a) => picked[a.id]).map((a) => a.label);
    const lead = joinAnd(owns);

    return {
      title: NAMES[capitalDef.id],
      description: `You are starting with ${capitalDef.label} in ${lead}. You can change either answer later.`,
      tagline: capitalDef.note,
      feedTitle: `Home leads with ${lead}`,
      feedSub: "Everything else stays one tap away",
      amountTitle: `Starts with ${capitalDef.label}`,
      amountSub: capitalDef.note,
      chartTitle: "Hides intraday noise",
      chartSub: "Suggests a monthly recurring buy",
      whatChanges: `Your home screen leads with ${lead}, hides intraday noise, and suggests a monthly recurring buy instead of one-off trades.`,
      owns,
      capitalLabel: capitalDef.label,
      riskSummary: "",
      horizonLabel: "",
      horizon: DEFAULT_HORIZON,
    };
  }, [picked, capitalDef]);

  const value = useMemo(
    () => ({
      picked,
      pickedCount,
      togglePicked,
      capital,
      setCapital,
      resolvedAmount,
      computeProfile,
    }),
    [
      picked,
      pickedCount,
      togglePicked,
      capital,
      resolvedAmount,
      computeProfile,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  return ctx;
}
