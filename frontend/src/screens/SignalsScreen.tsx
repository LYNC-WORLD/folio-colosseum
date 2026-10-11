// AI Analyst tab — prototype #s-analyst  (route name stays "Signals")
//
//   (✦) Your AI analyst
//       ● READS ONLY YOUR FOLIO
//   MARKET PULSE   [US STOCKS +0.8%] [PRE-IPOS −0.2%] [YOUR FOLIO +1.1%]
//   THIS MORNING
//   ( Good morning, Yash. Your Folio is worth … )      ← bubbles rise in, 140ms apart
//   ( NVDA is your largest position, at 42% … )
//                        ( Am I too concentrated? )  ← your question, mint
//   ( • • • )  →  ( Mildly. NVDA is 42% of … )        ← typing dots, then the answer
//   [What moved today?] [How much cash do I have?] …   ← tapped chips disappear
//
// Answers come from lib/analyst.ts, worked out from your real data.

import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useScrollToTop } from "@react-navigation/native";

import { useAuth, type OnboardingProfile } from "../context";
import { useWallet } from "../context/WalletContext";
import { useStocks } from "../hooks";
import { useRecurringBuys } from "../hooks/useTrade";
import { getOnboardingProfile } from "../lib";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, EASE, FONT, TYPE, em } from "../theme";
import { Chip, Rise, Skeleton } from "../components/ui";
import { useSplashDone } from "../components/SplashIntro";

import { dayChange, pct } from "../lib/format";
import {
  AnalystContext,
  answer,
  briefing,
  folioChange,
  Question,
  QUESTIONS,
} from "../lib/analyst";
import { TypingDots } from "../components/TypingDots";

type Turn = { id: number; q: Question; a: string | null };
const THINK_MS = 1100;
const SLIDE = LinearTransition.duration(300).easing(EASE);

export function SignalsScreen() {
  const bottom = useTabBarSpace();
  const splashDone = useSplashDone();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { user } = useAuth();
  const { tokens, usdcValue, loading } = useWallet();
  const us = useStocks("us-stock");
  const pre = useStocks("pre-ipo");
  const { recurringBuys } = useRecurringBuys();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  useEffect(() => {
    getOnboardingProfile().then(setProfile);
  }, []);

  // ---------- context from real data ----------
  const ctx = useMemo<AnalystContext>(() => {
    const moves = new Map<string, number | null>();
    for (const s of [...us.stocks, ...pre.stocks])
      moves.set(s.tokenAddress, dayChange(s.price, s.marketOpenPrice));
    const avg = (list: typeof us.stocks) => {
      const v = list
        .map((s) => dayChange(s.price, s.marketOpenPrice))
        .filter((x): x is number => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    return {
      firstName: (user?.name ?? "").trim().split(" ")[0] ?? "",
      cash: usdcValue,
      holdings: tokens.map((t) => ({
        symbol: t.symbol,
        value: t.balance * Number(t.price),
        change: moves.get(t.mint) ?? null,
        preIpo: t.stockType === "PreIPO",
      })),
      recurring: recurringBuys
        .filter((r) => r.isActive)
        .map((r) => ({
          symbol: r.stock.symbol,
          amount:
            Number(r.usdcAmount) ||
            Number(r.stockAmount) * Number(r.stock.price) ||
            0,
          next: new Date(r.buyDate),
        })),
      owns: profile?.owns ?? [],
      market: { stocks: avg(us.stocks), preIpos: avg(pre.stocks) },
    };
  }, [
    user?.name,
    tokens,
    usdcValue,
    us.stocks,
    pre.stocks,
    recurringBuys,
    profile,
  ]);

  const intro = useMemo(() => briefing(ctx), [ctx]);
  const mine = folioChange(ctx);

  // ---------- Q&A ----------
  const [turns, setTurns] = useState<Turn[]>([]);
  const asked = new Set(turns.map((t) => t.q));
  const thinking = turns.some((t) => t.a == null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const ask = (q: Question) => {
    if (thinking) return;
    const id = Date.now();
    setTurns((t) => [...t, { id, q, a: null }]);
    setTimeout(() => {
      setTurns((t) =>
        t.map((x) =>
          x.id === id ? { ...x, a: answer(q, ctxRef.current) } : x,
        ),
      );
    }, THINK_MS);
  };

  useEffect(() => {
    if (!turns.length) return;
    const h = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(h);
  }, [turns]);

  const pulse: [string, number | null][] = [
    ["US STOCKS", ctx.market.stocks],
    ["PRE-IPOS", ctx.market.preIpos],
    ["YOUR FOLIO", mine],
  ];
  const r = (i: number) => ({ when: splashDone, delay: i * 55, duration: 460 });
  const ready = !loading && !us.loading;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.page, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <Rise {...r(0)} style={s.head}>
          <View style={s.av}>
            <Svg width={20} height={20} viewBox="0 0 22 22" fill={C.onMint}>
              <Path d="M11 2.6c.6 4.1 3.7 7.2 7.8 7.8-4.1.6-7.2 3.7-7.8 7.8-.6-4.1-3.7-7.2-7.8-7.8 4.1-.6 7.2-3.7 7.8-7.8z" />
            </Svg>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.title} accessibilityRole="header">
              Your AI analyst
            </Text>
            <Text style={s.reads}>● READS ONLY YOUR FOLIO</Text>
          </View>
        </Rise>

        {/* market pulse */}
        <Rise {...r(1)} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>MARKET PULSE</Text>
          <View style={s.pulse}>
            {pulse.map(([k, v]) => (
              <View key={k} style={s.pulseCard}>
                <Text style={s.pulseKey}>{k}</Text>
                {ready ? (
                  <Text
                    style={[
                      s.pulseVal,
                      { color: v == null ? C.ink4 : v >= 0 ? C.mint : C.loss },
                    ]}
                  >
                    {v == null ? "—" : pct(v)}
                  </Text>
                ) : (
                  <Skeleton width={52} height={14} radius={4} />
                )}
              </View>
            ))}
          </View>
        </Rise>

        {/* chat */}
        <View style={{ gap: 12 }}>
          <Rise {...r(2)}>
            <Text style={TYPE.lbl}>
              {new Date().getHours() < 12 ? "THIS MORNING" : "TODAY"}
            </Text>
          </Rise>
          {!ready ? (
            <View style={{ gap: 12 }}>
              <Skeleton width="80%" height={58} radius={18} />
              <Skeleton width="60%" height={40} radius={18} />
            </View>
          ) : (
            intro.map((m, i) => (
              <Rise
                key={i}
                when={splashDone}
                delay={165 + i * 140}
                duration={420}
              >
                <View style={s.msg}>
                  <Text style={s.msgText}>{m}</Text>
                </View>
              </Rise>
            ))
          )}

          {turns.map((t) => (
            <View key={t.id} style={{ gap: 12 }}>
              <Rise duration={420}>
                <View style={[s.msg, s.me]}>
                  <Text style={[s.msgText, s.meText]}>{t.q}</Text>
                </View>
              </Rise>
              <Rise delay={200} duration={420}>
                <View style={s.msg} accessibilityLiveRegion="polite">
                  {t.a == null ? (
                    <TypingDots />
                  ) : (
                    <Text style={s.msgText}>{t.a}</Text>
                  )}
                </View>
              </Rise>
            </View>
          ))}
        </View>

        {/* prompts — a tapped one leaves; the rest slide over */}
        {ready ? (
          <Rise {...r(3)} style={s.prompts}>
            {QUESTIONS.filter((q) => !asked.has(q)).map((q) => (
              <Animated.View
                key={q}
                layout={SLIDE}
                exiting={FadeOut.duration(180)}
              >
                <Chip label={q} onPress={() => ask(q)} />
              </Animated.View>
            ))}
          </Rise>
        ) : null}

        <Text style={s.foot}>
          NOT INVESTMENT ADVICE · NOTHING IS BOUGHT OR SOLD UNTIL YOU TAP
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// the Analyst is the new name for this tab
export { SignalsScreen as AnalystScreen };

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 26, paddingHorizontal: 20, gap: 18 },

  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  av: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: FONT.sans800,
    fontSize: 17,
    letterSpacing: em(17, -0.03),
    color: C.ink1,
  },
  reads: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.16),
    color: C.mint,
  },

  pulse: { flexDirection: "row", gap: 10 },
  pulseCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 7,
  },
  pulseKey: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.14),
    color: C.ink4,
  },
  pulseVal: {
    fontFamily: FONT.mono400,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },

  msg: {
    alignSelf: "flex-start",
    maxWidth: "86%",
    paddingVertical: 13,
    paddingHorizontal: 15,
    backgroundColor: C.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 6,
  },
  msgText: {
    fontFamily: FONT.sans400,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#DDE2E8",
  },
  me: {
    alignSelf: "flex-end",
    backgroundColor: C.mint,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 6,
  },
  meText: { fontFamily: FONT.sans600, color: C.onMint },

  prompts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  foot: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.14),
    color: C.ink4,
  },
});
