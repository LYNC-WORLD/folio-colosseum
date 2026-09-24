export const MOCK_DETAIL = {
  changeAbs: 2.6,
  changePct: 1.24,
  periodLabel: "past year",
  chartPoint: { date: "14 Jul 2026", price: 198.1 },
  periods: ["1D", "1W", "1M", "1Y", "All"] as const,
  banner: {
    label: "3.1% below the last round",
    sublabel: "Best route right now: Hyperliquid spot",
  },
  stats: [
    { label: "Last round mark", value: "$219.30" },
    { label: "24h volume", value: "$4.1M" },
    { label: "Holders on Folio", value: "8,420" },
    { label: "Min buy", value: "$10" },
  ],
  buyers: [
    { handle: "0x4f...a29c", detail: "Bought $1,200 · 2h ago", pnl: "+64%" },
    {
      handle: "quietcompounder.eth",
      detail: "Bought $400 · 6h ago",
      pnl: "+41%",
    },
    {
      handle: "0xb1...7e04",
      detail: "Added to a 3-month position",
      pnl: "+28%",
    },
  ],
};
