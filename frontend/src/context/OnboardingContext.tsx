import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AssetKey =
  | "stocks"
  | "preipo"
  | "commodities"
  | "crypto"
  | "etf"
  | "rwa";

export const ASSET_DEFS: { id: AssetKey; label: string; note: string }[] = [
  { id: "stocks", label: "US stocks", note: "Apple, Nvidia, Tesla" },
  { id: "preipo", label: "Pre-IPO", note: "SpaceX, Stripe, OpenAI" },
  { id: "commodities", label: "Commodities", note: "Gold, silver, oil" },
  { id: "crypto", label: "Crypto", note: "BTC, ETH and majors" },
  { id: "etf", label: "Index & ETFs", note: "S&P 500, Nasdaq 100" },
  { id: "rwa", label: "Tokenized RWAs", note: "Treasuries, credit" },
];

export type AmountPreset = 50 | 100 | 250 | 500 | 1000 | "custom";

export const AMOUNT_PRESETS: {
  v: AmountPreset;
  label: string;
  note: string;
}[] = [
  { v: 50, label: "$50", note: "a toe in the water" },
  { v: 100, label: "$100", note: "a starter position" },
  { v: 250, label: "$250", note: "enough to feel it" },
  { v: 500, label: "$500", note: "a real position" },
  { v: 1000, label: "$1,000", note: "a conviction position" },
  { v: "custom", label: "Custom", note: "you set it per trade" },
];

export type RiskId = "buy" | "hold" | "sell";

export const RISK_DEFS: {
  id: RiskId;
  label: string;
  note: string;
  tag: string;
  color: string;
  consequence: string;
}[] = [
  {
    id: "buy",
    label: "Buy more of it",
    note: "A drawdown reads as a discount to you.",
    tag: "High",
    color: "#D9954E",
    consequence:
      "We surface dip alerts and higher-volatility names, and we will not nag you during drawdowns.",
  },
  {
    id: "hold",
    label: "Hold and wait it out",
    note: "You sized it right and you are not in a hurry.",
    tag: "Balanced",
    color: "#F5F0E8",
    consequence:
      "Alerts stay weekly. We flag position sizes that drift above 25% of your portfolio.",
  },
  {
    id: "sell",
    label: "Get out and rethink",
    note: "You would rather protect the capital.",
    tag: "Low",
    color: "#7FA8FF",
    consequence:
      "We lead with lower-volatility assets, show a stop-loss prompt on every buy, and cap suggested position size at 10%.",
  },
];

export type HorizonId = "short" | "mid" | "long";

export const HORIZON_DEFS: {
  id: HorizonId;
  label: string;
  note: string;
  w: `${number}%`;
  consequence: string;
  chartLabel: string;
  chartSub: string;
}[] = [
  {
    id: "short",
    label: "Days to weeks",
    note: "You are trading momentum and news.",
    w: "22%",
    consequence:
      "Charts open on 1D. Signals refresh intraday and momentum sits at the top of your feed.",
    chartLabel: "Charts open on 1D",
    chartSub: "Signals refresh intraday, momentum first",
  },
  {
    id: "mid",
    label: "A few months",
    note: "You are riding a thesis, not a tick.",
    w: "55%",
    consequence:
      "Charts open on 3M. Signals refresh daily, weighted toward flow and earnings.",
    chartLabel: "Charts open on 3M",
    chartSub: "Signals refresh daily, weighted toward flow & earnings",
  },
  {
    id: "long",
    label: "Years",
    note: "You buy and mostly leave it alone.",
    w: "100%",
    consequence:
      "Charts open on 1Y and only valuation-grade alerts reach your phone.",
    chartLabel: "Charts open on 1Y, signals weekly",
    chartSub: "Intraday noise stays off your phone",
  },
];

const ARCHETYPES: Record<
  string,
  { title: string; description: string; tagline: string }
> = {
  "buy-short": {
    title: "The Opportunist",
    description:
      "You want to catch the dip and move again before the next one. Speed matters more than a thesis.",
    tagline: "Move first, ask later",
  },
  "buy-mid": {
    title: "The Conviction Buyer",
    description:
      "You size up when others panic and give a trade a real quarter to work before you judge it.",
    tagline: "Size up on weakness",
  },
  "buy-long": {
    title: "The Accumulator",
    description:
      "Drawdowns read as a discount. You keep adding and expect to still be holding this in five years.",
    tagline: "Every dip is a discount",
  },
  "hold-short": {
    title: "The Tactical Trader",
    description:
      "You move fast but you do not panic. A bad week is data, not a verdict.",
    tagline: "Fast hands, steady head",
  },
  "hold-mid": {
    title: "The Steady Hand",
    description:
      "You sized it right the first time and you are not in a hurry to prove anything.",
    tagline: "Sized right, held steady",
  },
  "hold-long": {
    title: "The Patient Builder",
    description:
      "You want equity in things you rate, you can sit through a bad quarter, and you would rather compound than trade.",
    tagline: "Quality you can sit on",
  },
  "sell-short": {
    title: "The Risk Manager",
    description:
      "You would rather take a small loss on purpose than a large one by accident.",
    tagline: "Small losses, on purpose",
  },
  "sell-mid": {
    title: "The Capital Protector",
    description:
      "A thesis is good until the price says otherwise. You protect capital first, upside second.",
    tagline: "Capital first, upside second",
  },
  "sell-long": {
    title: "The Cautious Long-Termer",
    description:
      "You are in this for years, but you sleep better knowing you would get out if it really turned.",
    tagline: "In for years, ready to exit",
  },
};

type OnboardingState = {
  picked: Record<AssetKey, boolean>;
  showEverything: boolean;
  amountPreset: AmountPreset;
  customAmount: string;
  risk: RiskId;
  horizon: HorizonId;
};

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
};

type OnboardingValue = OnboardingState & {
  togglePicked: (key: AssetKey) => void;
  setShowEverything: (v: boolean) => void;
  setAmountPreset: (v: AmountPreset) => void;
  setCustomAmount: (v: string) => void;
  setRisk: (v: RiskId) => void;
  setHorizon: (v: HorizonId) => void;
  resolvedAmount: number;
  computeProfile: () => OnboardingProfile;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<Record<AssetKey, boolean>>({
    stocks: true,
    preipo: true,
    commodities: false,
    crypto: false,
    etf: false,
    rwa: false,
  });
  const [showEverything, setShowEverything] = useState(false);
  const [amountPreset, setAmountPreset] = useState<AmountPreset>(250);
  const [customAmount, setCustomAmount] = useState("");
  const [risk, setRisk] = useState<RiskId>("hold");
  const [horizon, setHorizon] = useState<HorizonId>("long");

  const togglePicked = useCallback((key: AssetKey) => {
    setPicked((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resolvedAmount =
    amountPreset === "custom" ? Number(customAmount) || 0 : amountPreset;

  const computeProfile = useCallback(() => {
    const archetype =
      ARCHETYPES[`${risk}-${horizon}`] ?? ARCHETYPES["hold-long"];
    const horizonDef =
      HORIZON_DEFS.find((h) => h.id === horizon) ?? HORIZON_DEFS[2];

    const pickedLabels = ASSET_DEFS.filter((a) => picked[a.id]).map(
      (a) => a.label,
    );
    let feedTitle: string;
    let feedSub: string;
    if (showEverything || pickedLabels.length === 0) {
      feedTitle = "Feed shows everything";
      feedSub = "No bias — every asset class gets equal room";
    } else {
      const lead = pickedLabels.slice(0, 2).join(" & ");
      const extra = pickedLabels.length - 2;
      feedTitle = `Feed leads with ${lead}${extra > 0 ? ` +${extra} more` : ""}`;
      feedSub = "Everything else stays one tap away";
    }

    return {
      title: archetype.title,
      description: archetype.description,
      tagline: archetype.tagline,
      feedTitle,
      feedSub,
      amountTitle: `Default buy size $${resolvedAmount.toLocaleString("en-US")}`,
      amountSub: "One tap to buy, always editable",
      chartTitle: horizonDef.chartLabel,
      chartSub: horizonDef.chartSub,
    };
  }, [picked, showEverything, resolvedAmount, risk, horizon]);

  const value = useMemo(
    () => ({
      picked,
      showEverything,
      amountPreset,
      customAmount,
      risk,
      horizon,
      togglePicked,
      setShowEverything,
      setAmountPreset,
      setCustomAmount,
      setRisk,
      setHorizon,
      resolvedAmount,
      computeProfile,
    }),
    [
      picked,
      showEverything,
      amountPreset,
      customAmount,
      risk,
      horizon,
      togglePicked,
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
