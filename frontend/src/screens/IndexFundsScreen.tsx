// src/screens/IndexFundsScreen.tsx — prototype #s-collection (curColl = 'index')
//
//   ‹ Home
//   COLLECTION
//   Index funds
//   Several companies in one buy. …
//   ┌ card ─────────────────────────────┐
//   │ GPU  GPU Infra           $433.78  │
//   │      Tracks NVIDIA · AMD  +0.4%   │
//   │ [2 STOCKS]  Top: NVDAx · AMDx     │
//   └───────────────────────────────────┘

import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useIndexFunds } from "../hooks";
import type { HomeStackParamList } from "../navigation/HomeStack";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Badge, Chip, PressScale, Rise, Skeleton } from "../components/ui";
import { COLLECTIONS } from "../lib/assets";
import { fundCode, toFund, type Fund } from "../lib/indexFunds";
import { money, pct } from "../lib/format";
import { hTap } from "../lib/haptics";

export function IndexFundsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const coll = COLLECTIONS["index-fund"];
  const { funds, loading, refreshing, error, refresh, reload } =
    useIndexFunds();
  const list = useMemo(() => funds.map(toFund), [funds]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            tintColor={C.mint}
            colors={[C.mint]}
            progressBackgroundColor={C.raised}
          />
        }
      >
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Ionicons name="chevron-back" size={16} color={C.mint} />
          <Text style={s.backText}>Home</Text>
        </Pressable>

        <View style={s.header}>
          <Rise duration={460}>
            <Text style={TYPE.lbl}>COLLECTION</Text>
          </Rise>
          <Rise duration={460} delay={55}>
            <Text style={[TYPE.h1, h1Size(38)]} accessibilityRole="header">
              {coll.title}
            </Text>
          </Rise>
          <Rise duration={460} delay={110}>
            <Text style={TYPE.body}>{coll.blurb}</Text>
          </Rise>
        </View>

        {error ? (
          <View style={s.errorRow}>
            <Text style={[TYPE.sub, { color: C.loss, flex: 1 }]}>{error}</Text>
            <Chip label="Retry" onPress={() => reload()} />
          </View>
        ) : null}

        <View style={s.list}>
          {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} height={116} radius={16} />)
          ) : list.length === 0 && !error ? (
            <Text style={[TYPE.sub, s.none]}>No funds open yet.</Text>
          ) : (
            list.map((f, i) => (
              <Rise key={f.id} delay={165 + Math.min(i, 8) * 40} duration={420}>
                <FundCard
                  f={f}
                  onPress={() => nav.navigate("IndexFundDetail", { id: f.id })}
                />
              </Rise>
            ))
          )}
        </View>

        <View style={s.note}>
          <Text style={s.noteDot}>●</Text>
          <Text style={s.noteText}>
            One buy splits your USDC across every stock in the fund. You hold
            the stocks themselves, in your wallet, and can sell each one on its
            own.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FundCard({ f, onPress }: { f: Fund; onPress: () => void }) {
  const n = f.holdings.length;
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={s.card}
      accessibilityRole="button"
      accessibilityLabel={`${f.name}, ${n} stocks, ${money(f.price)}`}
    >
      <View style={s.cardTop}>
        <View style={s.code}>
          <Text style={s.codeText}>{fundCode(f.name)}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.cardName} numberOfLines={1}>
            {f.name}
          </Text>
          <Text style={TYPE.sub} numberOfLines={2}>
            {tracks(f)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <Text style={s.fig}>{money(f.price)}</Text>
          {f.change != null ? (
            <Text
              style={[
                s.fig,
                { fontSize: 11.5, color: f.change >= 0 ? C.mint : C.loss },
              ]}
            >
              {pct(f.change)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={s.cardFoot}>
        <Badge label={`${n} ${n === 1 ? "STOCK" : "STOCKS"}`} />
        {f.hasPreIpo ? <Badge label="PRE-IPO" variant="mint" /> : null}
        <Text style={[TYPE.sub, { fontSize: 12.5, flex: 1 }]} numberOfLines={1}>
          Top: {f.holdings.slice(0, 3).map((h) => h.stock.symbol).join(" · ")}
        </Text>
      </View>
    </PressScale>
  );
}

/** "Tracks NVIDIA and AMD" / "Tracks Oracle, Netflix and 3 more" */
export function tracks(f: Fund) {
  const names = f.holdings.map((h) => h.stock.name.replace(/ PreStocks$/i, ""));
  if (names.length <= 2) return `Tracks ${names.join(" and ")}`;
  if (names.length === 3) return `Tracks ${names[0]}, ${names[1]} and ${names[2]}`;
  return `Tracks ${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    minHeight: 44,
    marginLeft: -4,
    marginBottom: -12,
  },
  backText: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },

  header: { gap: 8 },

  list: { gap: 10 },
  none: { fontSize: 13.5, lineHeight: 21, paddingVertical: 14 },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  code: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#20252F",
    alignItems: "center",
    justifyContent: "center",
  },
  codeText: { fontFamily: FONT.mono500, fontSize: 12, color: C.mint },
  cardName: {
    fontFamily: FONT.sans800,
    fontSize: 17,
    letterSpacing: em(17, -0.04),
    color: C.ink1,
  },
  fig: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 8 },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  note: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.sunk,
    borderRadius: 18,
    padding: 16,
  },
  noteDot: { color: C.mint, fontSize: 13, lineHeight: 17 },
  noteText: {
    flex: 1,
    fontFamily: FONT.sans400,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink2,
  },
});
