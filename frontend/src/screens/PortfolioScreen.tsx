import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, RADIUS, FONT } from "../theme";
import { SafeScreen } from "../components";

const RANGES = ["Today", "1M", "1Y", "All"] as const;
type Range = (typeof RANGES)[number];

const MOCK_ALLOCATION = [
  { label: "US stocks", pct: 44, value: "$1,840", color: C.series.usStocks },
  { label: "Pre-IPO", pct: 27, value: "$1,129", color: C.series.preIpo },
  { label: "Commodities", pct: 18, value: "$753", color: C.series.commodities },
  { label: "Crypto", pct: 11, value: "$460", color: C.series.crypto },
];

const MOCK_HOLDINGS = [
  {
    initial: "S",
    name: "SpaceX",
    units: "5.31 SPCX",
    value: "$1,128",
    pnl: "+18.4%",
    up: true,
  },
  {
    initial: "N",
    name: "NVIDIA",
    units: "4.02 NVDA",
    value: "$740",
    pnl: "+12.1%",
    up: true,
  },
  {
    initial: "B",
    name: "Berkshire B",
    units: "2.26 BRKB",
    value: "$1,100",
    pnl: "+3.2%",
    up: true,
  },
  {
    initial: "G",
    name: "Tokenized gold",
    units: "0.221 XAUT",
    value: "$753",
    pnl: "\u22120.8%",
    up: false,
  },
  {
    initial: "B",
    name: "Bitcoin",
    units: "0.0041 BTC",
    value: "$460",
    pnl: "+6.7%",
    up: true,
  },
];

export function PortfolioScreen() {
  const [range, setRange] = useState<Range>("All");

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Text style={s.h1}>Portfolio</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Portfolio settings"
            style={s.iconBtn}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={C.inkSecondary}
            />
          </Pressable>
        </View>

        <Text style={s.totalLabel}>Total value</Text>
        <Text style={s.totalValue}>$4,182.60</Text>
        <View style={s.gainRow}>
          <View style={s.gainPill}>
            <Ionicons name="arrow-up" size={12} color={C.jade} />
            <Text style={s.gainText}>+$318.42 · 8.2%</Text>
          </View>
          <Text style={s.gainNote}>all time</Text>
        </View>

        <View style={s.rangeRow}>
          {RANGES.map((r) => {
            const on = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[s.rangePill, on && s.rangePillActive]}
              >
                <Text style={[s.rangeLabel, on && s.rangeLabelActive]}>
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Allocation */}
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Allocation</Text>
            <View style={s.sectionRule} />
            <Text style={s.sectionAside}>
              {MOCK_ALLOCATION.length} collections
            </Text>
          </View>

          <View style={s.allocBar}>
            {MOCK_ALLOCATION.map((a) => (
              <View
                key={a.label}
                style={{
                  flexGrow: a.pct,
                  backgroundColor: a.color,
                  borderRadius: 4,
                }}
              />
            ))}
          </View>

          <View style={s.allocGrid}>
            {MOCK_ALLOCATION.map((a) => (
              <View key={a.label} style={s.allocItem}>
                <View style={[s.allocDot, { backgroundColor: a.color }]} />
                <View style={{ minWidth: 0 }}>
                  <Text style={s.allocLabel} numberOfLines={1}>
                    {a.label}
                  </Text>
                  <Text style={s.allocValue}>
                    {a.value} · {a.pct}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Holdings */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeading}>Holdings</Text>
          <View style={s.sectionRule} />
          <Text style={s.sectionAside}>{MOCK_HOLDINGS.length} positions</Text>
        </View>

        <View style={s.holdingsList}>
          {MOCK_HOLDINGS.map((h, i) => (
            <View
              key={h.name}
              style={[
                s.holdingRow,
                i === 0 && s.rowFirst,
                i === MOCK_HOLDINGS.length - 1 && s.rowLast,
              ]}
            >
              <View style={s.holdingBadge}>
                <Text style={s.holdingBadgeLabel}>{h.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.holdingName}>{h.name}</Text>
                <Text style={s.holdingUnits}>{h.units}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.holdingValue}>{h.value}</Text>
                <Text style={[s.holdingPnl, { color: h.up ? C.jade : C.clay }]}>
                  {h.pnl}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recurring buy */}
        <Pressable style={s.recurringCard}>
          <View style={s.recurringIcon}>
            <Ionicons name="refresh" size={18} color={C.bone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.recurringTitle}>$250 every Monday</Text>
            <Text style={s.recurringSub}>
              Split across SpaceX, NVDA and gold · next Monday
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.inkMuted} />
        </Pressable>
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  topRow: { flexDirection: "row", alignItems: "center" },
  h1: {
    flex: 1,
    fontFamily: FONT.display800,
    fontSize: 30,
    letterSpacing: -1.4,
    color: C.bone,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  totalLabel: {
    marginTop: 12,
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkMuted,
  },
  totalValue: {
    marginTop: 6,
    fontFamily: FONT.display800,
    fontSize: 46,
    letterSpacing: -2.2,
    color: C.bone,
  },
  gainRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  gainPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: "#10201A",
    borderWidth: 1,
    borderColor: "#1B3A2C",
  },
  gainText: { fontFamily: FONT.mono400, fontSize: 13, color: C.jade },
  gainNote: { fontFamily: FONT.display400, fontSize: 13, color: C.inkMuted },

  rangeRow: { marginTop: 18, flexDirection: "row", gap: 8 },
  rangePill: {
    flex: 1,
    height: 38,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rangePillActive: { backgroundColor: C.raised, borderColor: "#453D37" },
  rangeLabel: { fontFamily: FONT.display400, fontSize: 13, color: C.inkMuted },
  rangeLabelActive: { color: C.bone },

  card: {
    marginTop: 20,
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

  allocBar: { marginTop: 14, flexDirection: "row", gap: 3, height: 14 },
  allocGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 10,
  },
  allocItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  allocDot: { width: 10, height: 10, borderRadius: 3 },
  allocLabel: {
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkSecondary,
  },
  allocValue: {
    marginTop: 2,
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.bone,
  },

  holdingsList: {
    marginTop: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  holdingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  rowFirst: { borderTopWidth: 0 },
  rowLast: {},
  holdingBadge: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  holdingBadgeLabel: { fontFamily: FONT.mono400, fontSize: 13, color: C.bone },
  holdingName: { fontFamily: FONT.display600, fontSize: 14, color: C.bone },
  holdingUnits: {
    marginTop: 3,
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkMuted,
  },
  holdingValue: { fontFamily: FONT.mono400, fontSize: 14, color: C.bone },
  holdingPnl: { marginTop: 3, fontFamily: FONT.mono400, fontSize: 12 },

  recurringCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recurringIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  recurringTitle: { fontFamily: FONT.display600, fontSize: 14, color: C.bone },
  recurringSub: {
    marginTop: 3,
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkMuted,
  },
});
