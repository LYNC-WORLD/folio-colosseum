import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import type { HomeStackParamList } from "../navigation/HomeStack";
import type { TabParamList } from "../navigation/types"; // ← fix path to where TabParamList lives
import { C, FONT, TYPE } from "../theme";
import { Chip, PressScale, Rise } from "../components/ui";
import { money, pct } from "../lib/format";
import { hTap } from "../lib/haptics";
import {
  PERP_CATEGORIES,
  PERP_MARKETS,
  perpLabel,
  type PerpCategory,
  type PerpMarket,
} from "../data/perps";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

export function PerpMarketsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState<"all" | PerpCategory>("all");

  // most traded first
  const list = useMemo(
    () =>
      PERP_MARKETS.filter((m) => cat === "all" || m.category === cat).sort(
        (a, b) => b.vol24 - a.vol24,
      ),
    [cat],
  );

  const open = (m: PerpMarket) => {
    nav.navigate("Trade", { symbol: m.symbol });
    // clear this screen off the Home stack once the tab switch has covered it
    setTimeout(() => nav.popToTop(), 450);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View style={s.head}>
          <Pressable
            onPress={() => {
              hTap();
              nav.goBack();
            }}
            hitSlop={12}
            style={s.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={s.backChev}>‹</Text>
          </Pressable>
          <Text style={TYPE.lbl}>PERP MARKETS</Text>
          <Text style={TYPE.h2}>
            Long or short any of {PERP_MARKETS.length}
          </Text>
        </View>

        <View style={s.sticky}>
          <View style={s.cats}>
            {PERP_CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                variant={c.key === cat ? "mint" : undefined}
                onPress={() => setCat(c.key)}
              />
            ))}
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={[C.ground, "rgba(10,11,14,0)"]}
            style={s.fade}
          />
        </View>

        <View style={s.body}>
          {list.map((m, i) => (
            // keyed by category so rows re-cascade when you switch chips
            <Rise
              key={`${cat}-${m.symbol}`}
              delay={Math.min(i, 8) * 25}
              duration={300}
            >
              <PerpRow
                m={m}
                last={i === list.length - 1}
                onPress={() => open(m)}
              />
            </Rise>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PerpRow({
  m,
  last,
  onPress,
}: {
  m: PerpMarket;
  last: boolean;
  onPress: () => void;
}) {
  const up = m.change >= 0;
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={[s.row, !last && s.hair]}
      accessibilityRole="button"
      accessibilityLabel={`${m.name} perp, ${money(m.mark)}, ${pct(m.change)} today`}
    >
      <View style={s.logo}>
        <Text style={s.logoText}>
          {m.symbol.replace(/[^A-Z0-9]/g, "").slice(0, 3)}
        </Text>
      </View>
      <View style={s.mid}>
        <Text style={TYPE.ttl} numberOfLines={1}>
          {perpLabel(m)}
        </Text>
        <Text style={TYPE.sub} numberOfLines={1}>
          {m.name} · {m.kind}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.price}>{money(m.mark)}</Text>
        <Text style={[s.fig, { color: up ? C.mint : C.loss }]}>
          {pct(m.change)}
        </Text>
      </View>
    </PressScale>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  head: { paddingHorizontal: 20, gap: 6, marginBottom: 12 },
  back: { width: 44, height: 36, marginLeft: -8, justifyContent: "center" },
  backChev: { fontSize: 30, lineHeight: 32, color: C.ink1 },

  sticky: { backgroundColor: C.ground, paddingHorizontal: 20, paddingTop: 4 },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fade: { height: 18, marginHorizontal: -20, marginTop: 8 },

  body: { paddingHorizontal: 20 },
  row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#20252F",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontFamily: FONT.mono400, fontSize: 10, color: C.ink2 },
  mid: { flex: 1, gap: 3, minWidth: 0 },
  right: { alignItems: "flex-end", gap: 3 },
  price: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  fig: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
});
