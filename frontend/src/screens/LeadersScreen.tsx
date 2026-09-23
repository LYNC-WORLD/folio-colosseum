import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context";
import { FONT, C, RADIUS } from "../theme";
import { SafeScreen } from "../components";

const TABS = ["This week", "30 days", "All time"] as const;
type Tab = (typeof TABS)[number];

type Podium = {
  rank: string;
  handle: string;
  ret: string;
  a: string;
  b: string;
  gold: boolean;
};
const PODIUM: Podium[] = [
  {
    rank: "2",
    handle: "0x9c\u202641ab",
    ret: "+112%",
    a: C.series.usStocks,
    b: "#9085e9",
    gold: false,
  },
  {
    rank: "1",
    handle: "slowcapital.eth",
    ret: "+186%",
    a: C.series.crypto,
    b: C.series.preIpo,
    gold: true,
  },
  {
    rank: "3",
    handle: "0x2e\u20268f13",
    ret: "+97%",
    a: C.series.commodities,
    b: C.series.usStocks,
    gold: false,
  },
];

type Row = {
  rank: string;
  handle: string;
  meta: string;
  ret: string;
  a: string;
  b: string;
};
const INITIAL_ROWS: Row[] = [
  {
    rank: "4",
    handle: "preipohunter.eth",
    meta: "1,204 followers",
    ret: "+88%",
    a: C.series.preIpo,
    b: C.series.crypto,
  },
  {
    rank: "5",
    handle: "0x77\u2026c0de",
    meta: "860 followers",
    ret: "+81%",
    a: "#9085e9",
    b: C.series.usStocks,
  },
  {
    rank: "6",
    handle: "goldbug.eth",
    meta: "742 followers",
    ret: "+74%",
    a: C.series.crypto,
    b: C.series.commodities,
  },
  {
    rank: "7",
    handle: "0xa3\u202619f2",
    meta: "611 followers",
    ret: "+69%",
    a: C.series.usStocks,
    b: C.series.preIpo,
  },
  {
    rank: "8",
    handle: "quietcompounder.eth",
    meta: "588 followers",
    ret: "+64%",
    a: C.series.commodities,
    b: "#9085e9",
  },
  {
    rank: "9",
    handle: "0xf0\u20263b71",
    meta: "430 followers",
    ret: "+59%",
    a: C.series.preIpo,
    b: C.series.usStocks,
  },
  {
    rank: "10",
    handle: "orbitlong.eth",
    meta: "377 followers",
    ret: "+55%",
    a: "#9085e9",
    b: C.series.crypto,
  },
];

function Quad({ a, b, size }: { a: string; b: string; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size >= 40 ? 8 : 7,
        overflow: "hidden",
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      <View style={{ width: "50%", height: "50%", backgroundColor: a }} />
      <View style={{ width: "50%", height: "50%", backgroundColor: b }} />
      <View style={{ width: "50%", height: "50%", backgroundColor: b }} />
      <View
        style={{ width: "50%", height: "50%", backgroundColor: C.raised }}
      />
    </View>
  );
}

export function LeadersScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("30 days");
  const [following, setFollowing] = useState<Record<string, boolean>>({
    "0x77\u2026c0de": true,
    "quietcompounder.eth": true,
  });

  const toggleFollow = (handle: string) =>
    setFollowing((prev) => ({ ...prev, [handle]: !prev[handle] }));

  const firstName = user?.name?.split(" ")[0] || "You";

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.h1}>Leaders</Text>
        <Text style={s.sub}>
          Ranked on realised plus unrealised return, verified on-chain. Wallets
          are pseudonymous — follow one and you get a push when it buys or
          sells.
        </Text>

        <View style={s.tabRow}>
          {TABS.map((t) => {
            const on = t === tab;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[s.tabPill, on && s.tabPillActive]}
              >
                <Text style={[s.tabLabel, on && s.tabLabelActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Podium — rendered 2nd, 1st, 3rd to match the visual order */}
        <View style={s.podiumRow}>
          {[PODIUM[0], PODIUM[1], PODIUM[2]].map((p) => (
            <View
              key={p.handle}
              style={[
                s.podiumCard,
                { height: p.gold ? 196 : p.rank === "2" ? 172 : 160 },
                p.gold ? s.podiumCardGold : s.podiumCardDefault,
              ]}
            >
              <View style={[s.podiumRank, p.gold && s.podiumRankGold]}>
                <Text
                  style={[s.podiumRankLabel, p.gold && s.podiumRankLabelGold]}
                >
                  {p.rank}
                </Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <Quad a={p.a} b={p.b} size={40} />
              </View>
              <Text style={s.podiumHandle} numberOfLines={1}>
                {p.handle}
              </Text>
              <Text style={s.podiumReturn}>{p.ret}</Text>
            </View>
          ))}
        </View>

        <View style={s.columnHeaderRow}>
          <Text style={s.columnHeading}>Rank</Text>
          <Text style={s.columnHeading}>30-day return</Text>
        </View>

        <View style={s.rowsList}>
          {INITIAL_ROWS.map((r, i) => {
            const isFollowing = !!following[r.handle];
            return (
              <View
                key={r.handle}
                style={[
                  s.row,
                  i === 0 && s.rowFirst,
                  i === INITIAL_ROWS.length - 1 && s.rowLast,
                ]}
              >
                <Text style={s.rowRank}>{r.rank}</Text>
                <Quad a={r.a} b={r.b} size={32} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rowHandle} numberOfLines={1}>
                    {r.handle}
                  </Text>
                  <Text style={s.rowMeta}>{r.meta}</Text>
                </View>
                <Text style={s.rowReturn}>{r.ret}</Text>
                <Pressable
                  onPress={() => toggleFollow(r.handle)}
                  style={[s.followBtn, isFollowing && s.followBtnActive]}
                >
                  <Text
                    style={[s.followLabel, isFollowing && s.followLabelActive]}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* "You" — placeholder until a real ranking exists for this account */}
        <View style={s.youRow}>
          <Text style={s.youRank}>—</Text>
          <View style={s.youAvatar}>
            <Text style={s.youAvatarLabel}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.youName}>You</Text>
            <Text style={s.youMeta}>Not ranked yet</Text>
          </View>
          <Text style={s.youReturn}>—</Text>
        </View>

        <Text style={s.disclaimer}>
          Past return is not a forecast. Following a wallet copies nothing
          automatically — every buy is still your decision.
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
  sub: {
    marginTop: 8,
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSecondary,
  },

  tabRow: { marginTop: 16, flexDirection: "row", gap: 8 },
  tabPill: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
  },
  tabPillActive: { backgroundColor: C.raised, borderColor: "#453D37" },
  tabLabel: { fontFamily: FONT.display500, fontSize: 13, color: C.inkMuted },
  tabLabelActive: { color: C.bone },

  podiumRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  podiumCard: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  podiumCardDefault: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  podiumCardGold: {
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.bone,
  },
  podiumRank: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumRankGold: { backgroundColor: C.bone },
  podiumRankLabel: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkSecondary,
  },
  podiumRankLabelGold: { color: C.buttonInk },
  podiumHandle: {
    marginTop: 10,
    fontFamily: FONT.mono400,
    fontSize: 11,
    color: C.inkSecondary,
    maxWidth: 92,
  },
  podiumReturn: {
    marginTop: 6,
    fontFamily: FONT.mono500,
    fontSize: 17,
    color: C.jade,
  },

  columnHeaderRow: {
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  columnHeading: {
    fontFamily: FONT.display600,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.inkMuted,
  },

  rowsList: {
    marginTop: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  rowFirst: { borderTopWidth: 0 },
  rowLast: {},
  rowRank: {
    width: 24,
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.inkMuted,
  },
  rowHandle: { fontFamily: FONT.mono400, fontSize: 13, color: C.bone },
  rowMeta: {
    marginTop: 2,
    fontFamily: FONT.display400,
    fontSize: 11,
    color: C.inkMuted,
  },
  rowReturn: {
    width: 56,
    textAlign: "right",
    fontFamily: FONT.mono400,
    fontSize: 14,
    color: C.jade,
  },
  followBtn: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bone,
    borderWidth: 1,
    borderColor: C.bone,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnActive: { backgroundColor: "transparent", borderColor: "#453D37" },
  followLabel: {
    fontFamily: FONT.display500,
    fontSize: 12,
    color: C.buttonInk,
  },
  followLabelActive: { color: C.inkSecondary },

  youRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: RADIUS.sm,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.bone,
  },
  youRank: {
    width: 24,
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.bone,
  },
  youAvatar: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: C.bone,
    alignItems: "center",
    justifyContent: "center",
  },
  youAvatarLabel: {
    fontFamily: FONT.display600,
    fontSize: 13,
    color: C.buttonInk,
  },
  youName: { fontFamily: FONT.display600, fontSize: 13, color: C.bone },
  youMeta: {
    marginTop: 2,
    fontFamily: FONT.display400,
    fontSize: 11,
    color: C.inkSecondary,
  },
  youReturn: { fontFamily: FONT.mono400, fontSize: 14, color: C.inkMuted },

  disclaimer: {
    marginTop: 14,
    fontFamily: FONT.display400,
    fontSize: 11,
    lineHeight: 17,
    color: C.inkMuted,
  },
});
