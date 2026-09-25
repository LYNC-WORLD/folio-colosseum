// Investor profile — prototype #s-investor
//
//   ‹ Back
//   (E) Emma
//       LONDON · 12.4K FOLLOWERS
//   [ +42% ] [ #1 ] [ 38 ]        MED RETURN · GLOBAL · TRADES   (return counts up)
//   [ Follow Emma ]  ⇄  [ ✓ Following ]   toast on follow
//   WATCHING NEXT   rows
//   HOLDS           chips with each position's return
//   PAST RETURNS ARE NOT A FORECAST

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";

import type { LeadersStackParamList } from "../navigation/LeadersStack";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Badge, Button, Pop, Rise } from "../components/ui";
import { BackLink } from "../components/BackLink";
import { useToast } from "../components/Toast";
import { useCountUp } from "../hooks/useCountUp";
import { WATCHING, findInvestor, globalRank } from "../data/mockLeaders";
import { toggleFollow, useFollowing } from "../lib/follows";

export function InvestorScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { params } = useRoute<RouteProp<LeadersStackParamList, "Investor">>();
  const v = findInvestor(params.id);
  const following = useFollowing();
  const ret = useCountUp(v?.ret ?? 0);

  if (!v) {
    return (
      <View style={[s.safe, { paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 20 }]}>
        <BackLink onPress={() => nav.goBack()} />
        <Text style={TYPE.sub}>This investor is no longer on the leaderboard.</Text>
      </View>
    );
  }

  const on = following.has(v.id);
  const stats: [string, string, string][] = [
    [`+${Math.round(ret)}%`, "MED RETURN", C.mint],
    [`#${globalRank(v.id)}`, "GLOBAL", C.ink1],
    [String(v.trades), "TRADES", C.ink1],
  ];

  return (
    <View style={s.safe}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <BackLink onPress={() => nav.goBack()} />

        <View style={s.head}>
          <Pop duration={320}>
            <View style={[s.av, { backgroundColor: v.color }]}>
              <Text style={s.avText}>{v.name[0]}</Text>
            </View>
          </Pop>
          <Rise duration={420} delay={60} style={{ gap: 5 }}>
            <Text style={[TYPE.h1, h1Size(30)]} accessibilityRole="header">
              {v.name}
            </Text>
            <Text style={s.meta}>
              {v.city} · {v.followers} FOLLOWERS
            </Text>
          </Rise>
        </View>

        <View style={s.stats}>
          {stats.map(([val, lbl, color], i) => (
            <Rise key={lbl} delay={120 + i * 55} duration={420} style={{ flex: 1 }}>
              <View style={s.stat}>
                <Text style={[s.statVal, { color }]}>{val}</Text>
                <Text style={s.statLbl}>{lbl}</Text>
              </View>
            </Rise>
          ))}
        </View>

        <Rise delay={290} duration={420}>
          <Button
            size="sm"
            variant={on ? "ghost" : "primary"}
            title={on ? "✓ Following" : `Follow ${v.name}`}
            onPress={() => {
              const now = toggleFollow(v.id);
              if (now) toast(`Following ${v.name}`, "YOU WILL SEE THEIR NEXT MOVE");
            }}
          />
        </Rise>

        <Rise delay={345} duration={420} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>WATCHING NEXT</Text>
          <View>
            {WATCHING.map(([code, name, when, kind], i) => (
              <View key={code} style={[s.watchRow, i < WATCHING.length - 1 && s.hair]}>
                <Text style={s.code}>{code}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={TYPE.ttl}>{name}</Text>
                  <Text style={s.when}>{when}</Text>
                </View>
                <Badge label={kind} />
              </View>
            ))}
          </View>
        </Rise>

        <Rise delay={400} duration={420} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>HOLDS</Text>
          <View style={s.holds}>
            {v.holds.map(([asset, r]) => (
              <View key={asset} style={s.hold}>
                <Text style={s.holdName}>{asset}</Text>
                <Text style={[s.holdRet, { color: r >= 0 ? C.mint : C.loss }]}>
                  {r >= 0 ? "+" : "−"}
                  {Math.abs(r)}%
                </Text>
              </View>
            ))}
          </View>
        </Rise>

        <Text style={s.foot}>PAST RETURNS ARE NOT A FORECAST</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20, gap: 18 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  av: { width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avText: { fontFamily: FONT.sans800, fontSize: 23, color: C.onMint },
  meta: { fontFamily: FONT.mono400, fontSize: 9.5, letterSpacing: em(9.5, 0.16), color: C.ink3 },

  stats: { flexDirection: "row", gap: 10 },
  stat: { backgroundColor: C.surface, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center", gap: 6 },
  statVal: { fontFamily: FONT.sans800, fontSize: 21, letterSpacing: em(21, -0.035), fontVariant: ["tabular-nums"] },
  statLbl: { fontFamily: FONT.mono400, fontSize: 8.5, letterSpacing: em(8.5, 0.14), color: C.ink4 },

  watchRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  code: { width: 36, fontFamily: FONT.mono400, fontSize: 10, color: C.ink4 },
  when: { fontFamily: FONT.mono400, fontSize: 8.5, letterSpacing: em(8.5, 0.14), color: C.ink4 },

  holds: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hold: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, flexDirection: "row", alignItems: "center", gap: 7 },
  holdName: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.ink2 },
  holdRet: { fontFamily: FONT.mono400, fontSize: 11 },

  foot: { marginTop: 4, textAlign: "center", fontFamily: FONT.mono400, fontSize: 9.5, letterSpacing: em(9.5, 0.16), color: C.ink4 },
});
