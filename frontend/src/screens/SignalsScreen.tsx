import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, RADIUS, FONT } from "../theme";
import { SafeScreen } from "../components";

const REGIME = [
  { label: "Breadth", value: "Narrow", pct: 32, color: C.amber },
  { label: "Volatility", value: "Low", pct: 24, color: C.jade },
  { label: "Flow", value: "Inbound", pct: 71, color: C.series.usStocks },
];

const FILTERS = ["All", "Momentum", "Valuation", "Flow", "Sentiment"] as const;
type Filter = (typeof FILTERS)[number];

type Signal = {
  family: Exclude<Filter, "All">;
  color: string;
  direction: string;
  up: boolean;
  initial: string;
  asset: string;
  price: string;
  age: string;
  headline: string;
  why: string;
  confidence: number;
  horizon: string;
  cta: string;
};

const SIGNALS: Signal[] = [
  {
    family: "Valuation",
    color: C.series.commodities,
    direction: "Accumulate",
    up: true,
    initial: "S",
    asset: "SpaceX",
    price: "$212.50",
    age: "sample",
    headline: "Trading 3.1% under its last primary round",
    why: "The discount has held for nine sessions while volume rose 40%. Historically this gap closes within a quarter when no new round is pending.",
    confidence: 74,
    horizon: "3\u20136 months",
    cta: "Buy $250",
  },
  {
    family: "Momentum",
    color: C.series.usStocks,
    direction: "Strengthening",
    up: true,
    initial: "N",
    asset: "NVIDIA",
    price: "$184.20",
    age: "sample",
    headline: "50-day crossed the 200-day on rising volume",
    why: "Third crossover this cycle. The two previous ones ran 6 and 9 weeks before stalling. Earnings land inside your horizon.",
    confidence: 61,
    horizon: "4\u20138 weeks",
    cta: "Buy $250",
  },
  {
    family: "Flow",
    color: C.series.crypto,
    direction: "Crowded",
    up: false,
    initial: "T",
    asset: "Tesla",
    price: "$402.90",
    age: "sample",
    headline: "Top-decile wallets cut exposure two weeks running",
    why: "Net outflow from wallets in the top 10% of returns, against retail inflow.",
    confidence: 58,
    horizon: "2\u20134 weeks",
    cta: "Add to watchlist",
  },
  {
    family: "Sentiment",
    color: "#9085e9",
    direction: "Cooling",
    up: false,
    initial: "G",
    asset: "Tokenized gold",
    price: "$3,412",
    age: "sample",
    headline: "Hedging demand fading as volatility compresses",
    why: "Mentions and buy-side flow both down from the recent spike.",
    confidence: 49,
    horizon: "1\u20133 months",
    cta: "Review position",
  },
];

function confidenceColor(pct: number) {
  if (pct >= 70) return C.jade;
  if (pct >= 55) return C.bone;
  return C.amber;
}

export function SignalsScreen() {
  const [filter, setFilter] = useState<Filter>("All");

  const visible =
    filter === "All" ? SIGNALS : SIGNALS.filter((s) => s.family === filter);

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.h1}>Signals</Text>
        <Text style={s.metaLine}>Sample signals · not live yet</Text>

        {/* Market read */}
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Market read</Text>
            <View style={s.sectionRule} />
            <Text style={s.sectionAside}>sample</Text>
          </View>
          <Text style={s.marketRead}>
            Risk-on, but the breadth is{" "}
            <Text style={{ color: C.amber }}>narrowing</Text>.
          </Text>
          <View style={s.regimeGrid}>
            {REGIME.map((g) => (
              <View key={g.label}>
                <Text style={s.regimeLabel}>{g.label}</Text>
                <View style={s.regimeTrack}>
                  <View
                    style={[
                      s.regimeFill,
                      { width: `${g.pct}%`, backgroundColor: g.color },
                    ]}
                  />
                </View>
                <Text style={s.regimeValue}>{g.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[s.filterPill, on && s.filterPillActive]}
              >
                <Text style={[s.filterLabel, on && s.filterLabelActive]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Signal cards */}
        <View style={{ gap: 12, marginTop: 16 }}>
          {visible.map((sig) => (
            <View key={sig.asset} style={s.signalCard}>
              <View style={s.signalTopRow}>
                <View
                  style={[
                    s.tag,
                    {
                      backgroundColor: sig.color + "1F",
                      borderColor: sig.color + "4D",
                    },
                  ]}
                >
                  <Text style={[s.tagLabel, { color: sig.color }]}>
                    {sig.family}
                  </Text>
                </View>
                <Text
                  style={[s.direction, { color: sig.up ? C.jade : C.amber }]}
                >
                  {sig.direction}
                </Text>
                <View style={{ flexGrow: 1 }} />
                <Text style={s.age}>{sig.age}</Text>
              </View>

              <View style={s.assetRow}>
                <View style={s.assetBadge}>
                  <Text style={s.assetBadgeLabel}>{sig.initial}</Text>
                </View>
                <Text style={s.assetName}>{sig.asset}</Text>
                <Text style={s.assetPrice}>{sig.price}</Text>
              </View>

              <Text style={s.headline}>{sig.headline}</Text>
              <Text style={s.why}>{sig.why}</Text>

              <View style={s.confidenceRow}>
                <View style={{ flex: 1 }}>
                  <View style={s.confidenceLabelRow}>
                    <Text style={s.confidenceLabel}>Confidence</Text>
                    <Text style={s.confidenceValue}>{sig.confidence}%</Text>
                  </View>
                  <View style={s.confidenceTrack}>
                    <View
                      style={[
                        s.confidenceFill,
                        {
                          width: `${sig.confidence}%`,
                          backgroundColor: confidenceColor(sig.confidence),
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={s.horizonPill}>
                  <Text style={s.horizonLabel}>{sig.horizon}</Text>
                </View>
              </View>

              <View style={s.ctaRow}>
                <Pressable style={s.ctaGhost}>
                  <Text style={s.ctaGhostLabel}>See the evidence</Text>
                </Pressable>
                <Pressable
                  style={s.ctaPrimary}
                  // TODO: wire to a real order flow — this is a no-op until
                  // trade execution exists. Don't remove this comment when
                  // you do wire it up; it's the reminder that it isn't yet.
                  onPress={() => {}}
                >
                  <Text style={s.ctaPrimaryLabel}>{sig.cta}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.disclaimer}>
          Signals are model output over public market data, not investment
          advice. Folio does not act on them for you — nothing is bought or sold
          until you tap.
        </Text>
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  h1: {
    fontFamily: FONT.display800,
    fontSize: 30,
    letterSpacing: -1.4,
    color: C.bone,
  },
  metaLine: {
    marginTop: 6,
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkMuted,
  },

  card: {
    marginTop: 18,
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionHeading: {
    fontFamily: FONT.display600,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.inkMuted,
  },
  sectionRule: { flexGrow: 1, height: 1, backgroundColor: C.hairline },
  sectionAside: {
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkMuted,
  },

  marketRead: {
    marginTop: 12,
    fontFamily: FONT.display800,
    fontSize: 26,
    lineHeight: 27,
    letterSpacing: -1.2,
    color: C.bone,
  },
  regimeGrid: { marginTop: 16, flexDirection: "row", gap: 10 },
  regimeLabel: { fontFamily: FONT.display400, fontSize: 11, color: C.inkMuted },
  regimeTrack: {
    marginTop: 5,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.hairline,
  },
  regimeFill: { height: 4, borderRadius: 2 },
  regimeValue: {
    marginTop: 5,
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.bone,
  },

  filterRow: { marginTop: 20, gap: 8, paddingRight: 4 },
  filterPill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: RADIUS.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: { backgroundColor: C.bone, borderColor: C.bone },
  filterLabel: {
    fontFamily: FONT.display500,
    fontSize: 13,
    color: C.inkSecondary,
  },
  filterLabelActive: { color: C.buttonInk },

  signalCard: {
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  signalTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  tagLabel: { fontFamily: FONT.display500, fontSize: 11, letterSpacing: 0.3 },
  direction: { fontFamily: FONT.display400, fontSize: 11 },
  age: { fontFamily: FONT.display400, fontSize: 11, color: C.inkMuted },

  assetRow: {
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  assetBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  assetBadgeLabel: { fontFamily: FONT.mono400, fontSize: 12, color: C.bone },
  assetName: {
    flex: 1,
    fontFamily: FONT.display600,
    fontSize: 14,
    color: C.bone,
  },
  assetPrice: { fontFamily: FONT.mono400, fontSize: 13, color: C.inkSecondary },

  headline: {
    marginTop: 12,
    fontFamily: FONT.display600,
    fontSize: 15,
    lineHeight: 21,
    color: C.bone,
  },
  why: {
    marginTop: 8,
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSecondary,
  },

  confidenceRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  confidenceLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  confidenceLabel: {
    fontFamily: FONT.display400,
    fontSize: 11,
    color: C.inkMuted,
  },
  confidenceValue: { fontFamily: FONT.mono400, fontSize: 12, color: C.bone },
  confidenceTrack: {
    marginTop: 6,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.hairline,
  },
  confidenceFill: { height: 5, borderRadius: 3 },
  horizonPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  horizonLabel: {
    fontFamily: FONT.display400,
    fontSize: 11,
    color: C.inkSecondary,
  },

  ctaRow: { marginTop: 14, flexDirection: "row", gap: 8 },
  ctaGhost: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaGhostLabel: { fontFamily: FONT.display500, fontSize: 14, color: C.bone },
  ctaPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: C.bone,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimaryLabel: {
    fontFamily: FONT.display600,
    fontSize: 14,
    color: C.buttonInk,
  },

  disclaimer: {
    marginTop: 16,
    fontFamily: FONT.display400,
    fontSize: 11,
    lineHeight: 17,
    color: C.inkMuted,
  },
});
