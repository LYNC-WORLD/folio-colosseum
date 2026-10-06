// Social tab: Leaderboard (live perp data, preloaded by LeaderboardProvider) + Groups (coming soon)

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useScrollToTop } from "@react-navigation/native";

import { useAuth } from "../context";
import { useLeaderboard } from "../context/LeaderboardContext";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE, em } from "../theme";
import { Badge, Button, PressScale, Rise } from "../components/ui";
import { Segmented } from "../components/Segmented";
import { useSplashDone } from "../components/SplashIntro";
import { useToast } from "../components/Toast";
import { PerpLeaderboardEntry } from "../services";

type Section = "leaders" | "groups";

const SECTIONS = [
  ["leaders", "Leaderboard"],
  ["groups", "Groups"],
] as const;
const NOTIFY_KEY = "folio.groupsNotify";

// avatars on the coming-soon card
const MEMBERS: [string, string][] = [
  ["A", "#E8A33D"],
  ["M", "#6FA8F5"],
  ["C", "#F07F9B"],
  ["H", "#7FD8A8"],
  ["O", "#C79BF0"],
  ["L", "#F0A07F"],
];
const STEPS = [
  "Start a group or join one with an invite link.",
  "Anyone proposes a buy: an asset, a share each, and a deadline.",
  "Everyone who is in pays their part, and it lands in their own Folio.",
];

// ---------- helpers ----------

const NEG = "#F0657A";
const PALETTE = [
  "#E8A33D",
  "#6FA8F5",
  "#F07F9B",
  "#7FD8A8",
  "#C79BF0",
  "#F0A07F",
];
const colorFor = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
const fmtRet = (r: number | null) =>
  r == null ? "—" : `${r > 0 ? "+" : ""}${r.toFixed(1)}%`;
const retColor = (r: number | null) =>
  r == null ? C.ink4 : r < 0 ? NEG : C.mint;
const fmtUsd = (v: string) => {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
};

// ---------- screen ----------

export function LeadersScreen() {
  const bottom = useTabBarSpace();
  const splashDone = useSplashDone();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [section, setSection] = useState<Section>("leaders");

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.page, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Rise when={splashDone} duration={460}>
          <Segmented
            options={SECTIONS}
            value={section}
            label="Social"
            onChange={(k) => {
              setSection(k);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
            style={{ marginBottom: 2 }}
          />
        </Rise>

        {/* keyed by section: crossfades between the two tabs */}
        <Animated.View
          key={section}
          entering={FadeIn.duration(280)}
          style={{ gap: 20 }}
        >
          {section === "leaders" ? <Leaderboard /> : <GroupsSoon />}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- leaderboard ----------

function Leaderboard() {
  const splashDone = useSplashDone();
  const { user } = useAuth();
  const { entries, me, loading, error, refresh } = useLeaderboard();
  const initial = (user?.name ?? "").trim().charAt(0).toUpperCase() || "·";

  // If data was already preloaded when this tab mounted, don't replay the stagger.
  const preloaded = useRef(entries.length > 0).current;
  const step = preloaded ? 0 : 45;

  return (
    <>
      <View style={{ gap: 8 }}>
        <Rise when={splashDone} duration={460} delay={55}>
          <Text style={TYPE.lbl}>TOP TRADERS</Text>
        </Rise>
        <Rise when={splashDone} duration={460} delay={110}>
          <Text style={TYPE.h1} accessibilityRole="header">
            This quarter
          </Text>
        </Rise>
        <Rise when={splashDone} duration={460} delay={165}>
          <Text style={TYPE.body}>
            Ranked by return on deposits, not by size.
          </Text>
        </Rise>
      </View>

      <View style={{ gap: 8 }}>
        {loading && entries.length === 0 ? (
          <ActivityIndicator color={C.mint} style={{ marginVertical: 24 }} />
        ) : error && entries.length === 0 ? (
          <PressScale onPress={refresh} accessibilityRole="button">
            <Text style={TYPE.sub}>{error} · Tap to retry</Text>
          </PressScale>
        ) : entries.length === 0 ? (
          <Text style={TYPE.sub}>No one here yet.</Text>
        ) : (
          entries.map((v, i) => (
            <Rise
              key={`${v.rank}-${v.displayName}`}
              when={splashDone}
              delay={220 + i * step}
              duration={420}
            >
              <LeaderRow v={v} />
            </Rise>
          ))
        )}

        <Rise
          when={splashDone}
          delay={220 + entries.length * step}
          duration={420}
        >
          <View style={s.you}>
            <Text style={s.rankDim}>
              {me?.rank != null ? String(me.rank).padStart(2, "0") : "—"}
            </Text>
            <View
              style={[
                s.av,
                { width: 30, height: 30, backgroundColor: "#232833" },
              ]}
            >
              <Text style={[s.avText, { fontSize: 12, color: "#D6DAE0" }]}>
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[TYPE.ttl, { fontFamily: FONT.sans600 }]}>You</Text>
              {me && me.rank == null ? (
                <Text style={s.meta}>UNRANKED</Text>
              ) : null}
            </View>
            <Text style={s.youMeta}>{me ? fmtUsd(me.accountValue) : "—"}</Text>
            {me?.returnPercent != null ? (
              <Text style={[s.ret, { color: retColor(me.returnPercent) }]}>
                {fmtRet(me.returnPercent)}
              </Text>
            ) : null}
          </View>
        </Rise>
      </View>
    </>
  );
}

function LeaderRow({ v }: { v: PerpLeaderboardEntry }) {
  const top = v.rank <= 3;
  const first = v.rank === 1;
  const name = v.displayName?.trim() || "Anonymous";
  return (
    <View
      style={[top ? s.card : s.row, first && s.first]}
      accessible
      accessibilityLabel={`Rank ${v.rank}, ${name}, return ${fmtRet(v.returnPercent)}`}
    >
      <Text
        style={[
          s.rank,
          { fontSize: top ? 12 : 11, color: first ? C.mint : C.ink4 },
        ]}
      >
        {String(v.rank).padStart(2, "0")}
      </Text>
      <View
        style={[
          s.av,
          {
            width: top ? 34 : 30,
            height: top ? 34 : 30,
            backgroundColor: colorFor(name),
          },
        ]}
      >
        <Text style={[s.avText, { fontSize: top ? 14 : 12 }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={TYPE.ttl} numberOfLines={1}>
          {name}
        </Text>
        {top ? (
          <Text style={s.meta}>{fmtUsd(v.accountValue)} VALUE</Text>
        ) : null}
      </View>
      <Text
        style={[
          s.ret,
          { fontSize: top ? 15 : 13, color: retColor(v.returnPercent) },
        ]}
      >
        {fmtRet(v.returnPercent)}
      </Text>
    </View>
  );
}

// ---------- groups: coming soon ----------

function GroupsSoon() {
  const toast = useToast();
  const [notify, setNotify] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(NOTIFY_KEY)
      .then((v) => setNotify(v === "1"))
      .catch(() => {});
  }, []);

  const toggle = () => {
    const next = !notify;
    setNotify(next);
    AsyncStorage.setItem(NOTIFY_KEY, next ? "1" : "0").catch(() => {});
    if (next)
      toast("You are on the list", "WE WILL TELL YOU WHEN GROUPS LAUNCH");
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        <Rise duration={460} delay={55}>
          <Text style={TYPE.lbl}>GROUPS</Text>
        </Rise>
        <Rise duration={460} delay={110}>
          <Text style={TYPE.h1} accessibilityRole="header">
            Buy together
          </Text>
        </Rise>
      </View>

      <Rise duration={460} delay={165}>
        <View style={s.soon}>
          <SoonGlow />

          <View style={s.soonTop}>
            <View
              style={{ flexDirection: "row" }}
              accessible
              accessibilityLabel="Group members"
            >
              {MEMBERS.map(([l, bg], i) => (
                <View
                  key={l}
                  style={[
                    s.mem,
                    { backgroundColor: bg, marginLeft: i ? -9 : 0 },
                  ]}
                >
                  <Text style={s.memText}>{l}</Text>
                </View>
              ))}
            </View>
            <Badge label="COMING SOON" variant="solid" />
          </View>

          <Text style={[TYPE.h2, { fontSize: 22 }]}>
            Pool one order with the people you trust
          </Text>
          <Text style={[TYPE.body, { fontSize: 13.5 }]}>
            Start a group, propose a buy, and everyone who is in pays their
            share. Each share settles to its own wallet, so nobody holds anybody
            else's asset.
          </Text>

          <View style={{ gap: 12 }}>
            {STEPS.map((t, i) => (
              <View key={i} style={s.step}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.stepText}>{t}</Text>
              </View>
            ))}
          </View>

          <Button
            variant={notify ? "ghost" : "primary"}
            title={
              notify ? "✓ We will let you know" : "Notify me when it launches"
            }
            onPress={toggle}
          />
        </View>
      </Rise>
    </>
  );
}

/** radial-gradient(80% 60% at 100% 0%, rgba(55,224,153,.12), transparent 60%) */
function SoonGlow() {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient
          id="soonGlow"
          cx="100%"
          cy="0%"
          rx="80%"
          ry="60%"
          fx="100%"
          fy="0%"
        >
          <Stop offset="0" stopColor={C.mint} stopOpacity={0.12} />
          <Stop offset="0.6" stopColor={C.mint} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#soonGlow)" />
    </Svg>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 22, paddingHorizontal: 20, gap: 20 },

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
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },

  rank: { width: 20, fontFamily: FONT.mono400, fontVariant: ["tabular-nums"] },
  rankDim: { width: 20, fontFamily: FONT.mono400, fontSize: 11, color: C.ink4 },
  av: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avText: { fontFamily: FONT.sans800, color: C.onMint },
  meta: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.16),
    color: C.ink3,
  },
  ret: {
    fontFamily: FONT.mono400,
    color: C.mint,
    fontVariant: ["tabular-nums"],
  },

  you: {
    marginTop: 6,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: C.sunk,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  youMeta: { fontFamily: FONT.mono400, fontSize: 12, color: C.ink3 },

  soon: {
    gap: 18,
    padding: 20,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "#232933",
    overflow: "hidden",
  },
  soonTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mem: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  memText: { fontFamily: FONT.sans800, fontSize: 12, color: C.onMint },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#262C36",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: FONT.mono500, fontSize: 11, color: C.mint },
  stepText: {
    flex: 1,
    fontFamily: FONT.sans400,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.ink2,
  },
});
