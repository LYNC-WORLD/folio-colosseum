// src/context/OnboardingContext.tsx
//
// The four onboarding questions, answers, and profile — taken word for word
// from the prototype (Folio_Prototype.html, #s-onb1…4 and the PROFILE script).
//
// Backend payload keeps the same shape (see ProfileSummaryScreen):
//   interestedStocks: AssetKey[]   → "stocks" | "preipo" | "commodities" | "treasuries"
//   amountToPutIn:    number       → CAPITAL_DEFS[capital].amount (lower bound of the range)
//   question1:        RiskId       → "buy" | "hold" | "trim" | "out"
//   question2:        HorizonId    → "weeks" | "months" | "years" | "decades"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  amount: string;
}[] = [
  {
    id: "a",
    label: "$10 - $100",
    note: "Testing the water",
    amount: "$10 - $100",
  },
  {
    id: "b",
    label: "$100 - $1,000",
    note: "Building a base",
    amount: "$100 - $1,000",
  },
  {
    id: "c",
    label: "$1,000 - $10,000",
    note: "Serious position",
    amount: "$1,000 - $10,000",
  },
  { id: "d", label: "$10,000+", note: "Allocating", amount: "$10,000+" },
];

// ---------- Question 3 — Your position drops 20% in a week ----------
export type RiskId = "buy" | "hold" | "trim" | "out";

export const RISK_DEFS: { id: RiskId; label: string; summary: string }[] = [
  { id: "buy", label: "I buy more", summary: "Buys more" },
  { id: "hold", label: "I sit on my hands", summary: "Sits on their hands" },
  { id: "trim", label: "I trim some of it", summary: "Trims some" },
  { id: "out", label: "I get out", summary: "Gets out" },
];

// ---------- Question 4 — How long are you holding? ----------
export type HorizonId = "weeks" | "months" | "years" | "decades";

export const HORIZON_DEFS: { id: HorizonId; label: string; note: string }[] = [
  { id: "weeks", label: "Weeks", note: "Trading the move" },
  { id: "months", label: "Months", note: "Riding a thesis" },
  { id: "years", label: "3-5 years", note: "Compounding" },
  { id: "decades", label: "Decades", note: "Never selling" },
];

// ---------- Profile names: horizon × drawdown reaction ----------
const NAMES: Record<HorizonId, Record<RiskId, string>> = {
  weeks: {
    buy: "The Dip Buyer",
    hold: "The Swing Trader",
    trim: "The Tactician",
    out: "The Sprinter",
  },
  months: {
    buy: "The Accumulator",
    hold: "The Thesis Holder",
    trim: "The Rebalancer",
    out: "The Cautious One",
  },
  years: {
    buy: "The Conviction Buyer",
    hold: "The Patient Builder",
    trim: "The Steady Hand",
    out: "The Careful Compounder",
  },
  decades: {
    buy: "The Lifer",
    hold: "The Vault",
    trim: "The Long Trimmer",
    out: "The Reluctant Holder",
  },
};

// Same shape as before (so lib/onboardingProfile and anything reading the saved
// profile keep working) plus the prototype's extra fields.
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
  riskSummary: string;
  horizonLabel: string;
  horizon: HorizonId;
};

type OnboardingValue = {
  picked: Record<AssetKey, boolean>;
  pickedCount: number;
  togglePicked: (key: AssetKey) => void;
  capital: CapitalId;
  setCapital: (v: CapitalId) => void;
  risk: RiskId;
  setRisk: (v: RiskId) => void;
  horizon: HorizonId;
  setHorizon: (v: HorizonId) => void;
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
  const [risk, setRisk] = useState<RiskId>("hold");
  const [horizon, setHorizon] = useState<HorizonId>("years");

  const togglePicked = useCallback((key: AssetKey) => {
    setPicked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const pickedCount = Object.values(picked).filter(Boolean).length;
  const capitalDef =
    CAPITAL_DEFS.find((c) => c.id === capital) ?? CAPITAL_DEFS[1];
  const resolvedAmount = capitalDef.amount;

  const computeProfile = useCallback((): OnboardingProfile => {
    const owns = ASSET_DEFS.filter((a) => picked[a.id]).map((a) => a.label);
    const riskDef = RISK_DEFS.find((r) => r.id === risk) ?? RISK_DEFS[1];
    const horizonDef =
      HORIZON_DEFS.find((h) => h.id === horizon) ?? HORIZON_DEFS[2];

    const description =
      risk === "out"
        ? "You would rather miss a run than sit through a drawdown, and we will keep the loudest things away from your home screen."
        : horizon === "weeks"
          ? "You are here for the move, not the decade. Expect a busier, noisier home screen."
          : "You hold through drawdowns and you are here for the next few years, not the next few days.";

    const lead = joinAnd(owns);
    const intraday =
      horizon === "weeks" ? "shows intraday movement" : "hides intraday noise";
    const whatChanges = `Your home screen leads with ${lead}, ${intraday}, and suggests a monthly recurring buy instead of one-off trades.`;

    return {
      title: NAMES[horizon][risk],
      description,
      tagline: `${horizonDef.label} · ${riskDef.summary}`,
      feedTitle: `Home leads with ${lead}`,
      feedSub: "Everything else stays one tap away",
      amountTitle: `Starts with ${capitalDef.label}`,
      amountSub: capitalDef.note,
      chartTitle:
        horizon === "weeks"
          ? "Shows intraday movement"
          : "Hides intraday noise",
      chartSub: "Suggests a monthly recurring buy",
      whatChanges,
      owns,
      capitalLabel: capitalDef.label,
      riskSummary: riskDef.summary,
      horizonLabel: horizonDef.label,
      horizon,
    };
  }, [picked, risk, horizon, capitalDef]);

  const value = useMemo(
    () => ({
      picked,
      pickedCount,
      togglePicked,
      capital,
      setCapital,
      risk,
      setRisk,
      horizon,
      setHorizon,
      resolvedAmount,
      computeProfile,
    }),
    [
      picked,
      pickedCount,
      togglePicked,
      capital,
      risk,
      horizon,
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
