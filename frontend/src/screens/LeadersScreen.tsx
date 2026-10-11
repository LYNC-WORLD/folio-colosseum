// Leaderboard tab — prototype #s-leaders
//
//   TOP INVESTORS
//   This quarter                                ┐ rise in
//   Ranked by median return, not by size. …     ┘
//   [Global] [Friends] [Pre-IPO]
//   ┌ 01 (E) Emma   LONDON · 38 TRADES   +42% ┐  ← #1 has a mint ring
//   ┌ 02 …                                    ┐  top three are cards
//   03 …
//   04 (L) Lucas             FOLLOWING   +29%     rest are hairline rows
//   ── (S) You                     3 positions

import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useNavigation, useScrollToTop } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context";
import { useWallet } from "../context/WalletContext";
import type { LeadersStackParamList } from "../navigation/LeadersStack";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE, em } from "../theme";
import { Badge, Chip, PressScale, Rise } from "../components/ui";
import { useSplashDone } from "../components/SplashIntro";
import { LEADERS_ARE_SAMPLE, useLeaders, type Investor, type LeaderFilter } from "../data/mockLeaders";
import { useFollowing } from "../lib/follows";
import { hTap } from "../lib/haptics";

type Nav = NativeStackNavigationProp<LeadersStackParamList, "LeadersMain">;
const FILTERS: LeaderFilter[] = ["Global", "Friends", "Pre-IPO"];

export function LeadersScreen() {
  const nav = useNavigation<Nav>();
  const bottom = useTabBarSpace();
  const splashDone = useSplashDone();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { user } = useAuth();
  const { tokens } = useWallet();
  const following = useFollowing();
  const [filter, setFilter] = useState<LeaderFilter>("Global");
  const { investors } = useLeaders(filter);

  const initial = (user?.name ?? "").trim().charAt(0).toUpperCase() || "·";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView ref={scrollRef} contentContainerStyle={[s.page, { paddingBottom: bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Rise when={splashDone} duration={460}>
            <Text style={TYPE.lbl}>TOP INVESTORS</Text>
          </Rise>
          <Rise when={splashDone} duration={460} delay={55}>
            <Text style={TYPE.h1} accessibilityRole="header">
              This quarter
            </Text>
          </Rise>
          <Rise when={splashDone} duration={460} delay={110}>
            <Text style={TYPE.body}>Ranked by median return, not by size. Follow anyone to see their next move.</Text>
          </Rise>
        </View>

        <Rise when={splashDone} duration={460} delay={165} style={s.chips}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f} on={f === filter} onPress={() => setFilter(f)} />
          ))}
        </Rise>

        {/* keyed by filter: the list crossfades and re-cascades on every switch */}
        <Animated.View key={filter} entering={FadeIn.duration(180)} style={{ gap: 8 }}>
          {investors.length === 0 ? (
            <Text style={TYPE.sub}>No one here yet.</Text>
          ) : (
            investors.map((v, i) => (
              <Rise key={v.id} when={splashDone} delay={220 + i * 45} duration={420}>
                <LeaderRow
                  v={v}
                  i={i}
                  following={following.has(v.id)}
                  onPress={() => nav.navigate("Investor", { id: v.id })}
                />
              </Rise>
            ))
          )}

          <Rise when={splashDone} delay={220 + investors.length * 45} duration={420}>
            <View style={s.you}>
              <Text style={s.rankDim}>—</Text>
              <View style={[s.av, { width: 30, height: 30, backgroundColor: "#232833" }]}>
                <Text style={[s.avText, { fontSize: 12, color: "#D6DAE0" }]}>{initial}</Text>
              </View>
              <Text style={[TYPE.ttl, { flex: 1, fontFamily: FONT.sans600 }]}>You</Text>
              <Text style={s.youMeta}>
                {tokens.length} {tokens.length === 1 ? "position" : "positions"}
              </Text>
            </View>
          </Rise>
        </Animated.View>

        {LEADERS_ARE_SAMPLE ? <Text style={s.foot}>SAMPLE RANKINGS · LIVE DATA COMING SOON</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LeaderRow({ v, i, following, onPress }: { v: Investor; i: number; following: boolean; onPress: () => void }) {
  const top = i < 3;
  const first = i === 0;
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={[top ? s.card : s.row, first && s.first]}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${i + 1}, ${v.name}, plus ${v.ret} percent${following ? ", following" : ""}`}
    >
      <Text style={[s.rank, { fontSize: top ? 12 : 11, color: first ? C.mint : C.ink4 }]}>{String(i + 1).padStart(2, "0")}</Text>
      <View style={[s.av, { width: top ? 34 : 30, height: top ? 34 : 30, backgroundColor: v.color }]}>
        <Text style={[s.avText, { fontSize: top ? 14 : 12 }]}>{v.name[0]}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={TYPE.ttl}>{v.name}</Text>
        {top ? (
          <Text style={s.meta}>
            {v.city} · {v.trades} TRADES
          </Text>
        ) : null}
      </View>
      {following ? <Badge label="FOLLOWING" variant="mint" /> : null}
      <Text style={[s.ret, { fontSize: top ? 15 : 13 }]}>+{v.ret}%</Text>
    </PressScale>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 26, paddingHorizontal: 20, gap: 20 },
  chips: { flexDirection: "row", gap: 8 },

  card: {
    minHeight: 68,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  first: { borderColor: "rgba(55,224,153,0.38)" },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: C.hair },

  rank: { width: 20, fontFamily: FONT.mono400, fontVariant: ["tabular-nums"] },
  rankDim: { width: 20, fontFamily: FONT.mono400, fontSize: 11, color: C.ink4 },
  av: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avText: { fontFamily: FONT.sans800, color: C.onMint },
  meta: { fontFamily: FONT.mono400, fontSize: 9, letterSpacing: em(9, 0.16), color: C.ink3 },
  ret: { fontFamily: FONT.mono400, color: C.mint, fontVariant: ["tabular-nums"] },

  you: { marginTop: 6, minHeight: 56, paddingHorizontal: 16, borderRadius: 18, backgroundColor: C.sunk, flexDirection: "row", alignItems: "center", gap: 12 },
  youMeta: { fontFamily: FONT.mono400, fontSize: 12, color: C.ink3 },

  foot: { textAlign: "center", fontFamily: FONT.mono400, fontSize: 9.5, letterSpacing: em(9.5, 0.16), color: C.ink4 },
});
