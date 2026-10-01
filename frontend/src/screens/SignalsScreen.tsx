// Folio AI tab — prototype #s-analyst  (route name stays "Signals")
//
//   [mochi] Folio AI                                   [new chat]
//           Your AI companion
//   MARKET PULSE                        ● US MARKET OPEN
//   [S&P 500 ][NASDAQ ][GOLD ][NVDA ] …   ← scrolls sideways, tap → asset
//   US stocks are up 0.8% on average today. NVIDIA is the move to watch…
//   TODAY
//   (◕) Morning, Yash. It's Folio AI. Ask me anything…
//       NVDA is your largest position, at 42% …
//                              ( Am I too concentrated? )   ← you, mint
//   (◕~) • • •      → reply streams in 2 words at a time, then action chips
//   ─────────── sticky composer ───────────
//   [How is my Folio doing?] [What moved today?] …   ← change after each answer
//   ( Ask Folio AI anything…                    (↑) )
//   FOLIO AI CAN MAKE MISTAKES. IT IS NOT FINANCIAL ADVICE.
//
// Answers come from lib/analyst.ts, worked out from your real data.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Svg, {
  Defs,
  Path,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useScrollToTop } from "@react-navigation/native";

import { useAuth, type OnboardingProfile } from "../context";
import { useWallet } from "../context/WalletContext";
import { useStocks } from "../hooks";
import { useRecurringBuys } from "../hooks/useTrade";
import { getOnboardingProfile } from "../lib";
import { hSelect } from "../lib/haptics";
import { TAB_BAR_HEIGHT } from "../navigation/TabBar";
import { C, FONT, TYPE, em } from "../theme";
import { Chip, Rise, Skeleton } from "../components/ui";
import { PressScale } from "../components/ui/PressScale";
import { useSplashDone } from "../components/SplashIntro";
import { TypingDots } from "../components/TypingDots";

import { dayChange, money, pct } from "../lib/format";
import {
  AnalystAction,
  AnalystAsset,
  AnalystContext,
  answer,
  baseSym,
  briefing,
  cleanName,
  pulseNote,
  starters,
} from "../lib/analyst";
import { FolioAIMark } from "../components/FolioAIMark";

// ⚠️ Point this at your asset detail screen. Used by pulse tiles and
// "Open NVIDIA"-style chips. If the detail screen lives in another tab's
// stack, use nav.navigate("Home", { screen: "Asset", params: {...} }).
function openAsset(nav: any, tokenAddress: string) {
  nav.navigate("Asset", { tokenAddress });
}

type Msg = {
  id: number;
  from: "me" | "ai";
  text: string;
  actions?: AnalystAction[];
  /** words revealed so far while streaming; undefined = all */
  shown?: number;
};

const THINK_MS = 750;
const WORD_MS = 28;

// pulse: these first if listed, then the day's biggest movers, 6 tiles max
const PULSE_PREFER = [
  ["SPY", "VOO", "SP500"],
  ["QQQ", "NDX100"],
  ["GLD", "XAUT"],
  ["NVDA"],
  ["TSLA"],
  ["AAPL"],
];
const SHORT: Record<string, string> = {
  SPY: "S&P 500",
  VOO: "S&P 500",
  SP500: "S&P 500",
  QQQ: "NASDAQ-100",
  NDX100: "NASDAQ-100",
  GLD: "GOLD",
  XAUT: "GOLD",
};

export function SignalsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const splashDone = useSplashDone();
  const reduced = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const kbOpen = useKeyboardOpen();
  const marketOpen = useUsMarketOpen();

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
    const toAsset = (
      s: (typeof us.stocks)[number],
      preIpo: boolean,
    ): AnalystAsset => ({
      symbol: s.symbol,
      name: cleanName((s as { name?: string }).name, s.symbol),
      tokenAddress: s.tokenAddress,
      price: Number(s.price),
      change: dayChange(s.price, s.marketOpenPrice),
      preIpo,
    });
    const assets = [
      ...us.stocks.map((s) => toAsset(s, false)),
      ...pre.stocks.map((s) => toAsset(s, true)),
    ];
    const byMint = new Map(assets.map((a) => [a.tokenAddress, a]));
    const avg = (list: AnalystAsset[]) => {
      const v = list.map((a) => a.change).filter((x): x is number => x != null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    return {
      firstName: (user?.name ?? "").trim().split(" ")[0] ?? "",
      cash: usdcValue,
      assets,
      holdings: tokens.map((t) => {
        const a = byMint.get(t.mint);
        return {
          symbol: t.symbol,
          name: a?.name ?? baseSym(t.symbol),
          tokenAddress: t.mint,
          value: t.balance * Number(t.price),
          change: a?.change ?? null,
          preIpo: t.stockType === "PreIPO",
        };
      }),
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
      market: {
        stocks: avg(assets.filter((a) => !a.preIpo)),
        preIpos: avg(assets.filter((a) => a.preIpo)),
      },
      marketOpen,
    };
  }, [
    user?.name,
    tokens,
    usdcValue,
    us.stocks,
    pre.stocks,
    recurringBuys,
    profile,
    marketOpen,
  ]);

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const ready = !loading && !us.loading;
  const intro = useMemo(() => briefing(ctx), [ctx]);
  const note = useMemo(() => pulseNote(ctx), [ctx]);
  const tiles = useMemo(() => pickPulse(ctx.assets), [ctx.assets]);
  const trails = useTrails(tiles);

  // ---------- chat ----------
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState<string[] | null>(null); // null = starters
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) =>
    timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const scrollEnd = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const ask = (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    hSelect();
    const id = Date.now();
    setMsgs((m) => [...m, { id, from: "me", text: q }]);
    setDraft("");
    setSugg([]);
    setBusy(true);
    setThinking(true);
    scrollEnd();

    later(() => {
      const r = answer(q, ctxRef.current);
      const words = r.text.split(" ");
      const aid = id + 1;
      const done = () => {
        setSugg(r.next);
        setBusy(false);
        scrollEnd();
        AccessibilityInfo.announceForAccessibility(r.text);
      };
      setThinking(false);
      if (reduced) {
        setMsgs((m) => [
          ...m,
          { id: aid, from: "ai", text: r.text, actions: r.actions },
        ]);
        return done();
      }
      setMsgs((m) => [
        ...m,
        { id: aid, from: "ai", text: r.text, actions: r.actions, shown: 0 },
      ]);
      let i = 0;
      const tick = () => {
        i = Math.min(words.length, i + 2);
        setMsgs((m) => m.map((x) => (x.id === aid ? { ...x, shown: i } : x)));
        if (i < words.length) {
          if (i % 10 === 0) scrollEnd();
          return later(tick, WORD_MS);
        }
        done();
      };
      tick();
    }, THINK_MS);
  };

  const newChat = () => {
    clearTimers();
    setMsgs([]);
    setThinking(false);
    setBusy(false);
    setSugg(null);
    setDraft("");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const act = (a: AnalystAction) => {
    if ("tab" in a) nav.navigate(a.tab);
    else openAsset(nav, a.asset);
  };

  const chips = sugg ?? starters(ctx);
  const canSend = !!draft.trim() && !busy;
  const r = (i: number) => ({ when: splashDone, delay: i * 55, duration: 460 });

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          {/* header */}
          <Rise {...r(0)} style={s.head}>
            <View style={s.halo}>
              <Glow />
              <FolioAIMark size={38} mode={thinking ? "think" : "float"} />
            </View>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text style={s.title} accessibilityRole="header">
                Folio AI
              </Text>
              <Text style={s.subtitle}>Your AI companion</Text>
            </View>
            <PressScale
              onPress={newChat}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel="New chat"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={s.iconBtn}
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.ink2}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M15.5 10.5v4A1.5 1.5 0 0 1 14 16H5.5A1.5 1.5 0 0 1 4 14.5V6a1.5 1.5 0 0 1 1.5-1.5h4" />
                <Path d="M14 3.5 16.5 6 10 12.5H7.5V10z" />
              </Svg>
            </PressScale>
          </Rise>

          {/* market pulse */}
          <Rise {...r(1)} style={{ gap: 12 }}>
            <View style={s.rowx}>
              <Text style={[TYPE.lbl, { flex: 1 }]}>MARKET PULSE</Text>
              {marketOpen != null ? (
                <View style={s.rowx}>
                  <View
                    style={[
                      s.dot,
                      { backgroundColor: marketOpen ? C.mint : C.amber },
                    ]}
                  />
                  <Text style={s.stat}>
                    {marketOpen ? "US MARKET OPEN" : "US MARKET CLOSED"}
                  </Text>
                </View>
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.bleed}
              contentContainerStyle={s.pulseRow}
            >
              {ready
                ? tiles.map((a) => {
                    const up = (a.change ?? 0) >= 0;
                    return (
                      <PressScale
                        key={a.tokenAddress}
                        scaleTo={0.97}
                        onPress={() => openAsset(nav, a.tokenAddress)}
                        accessibilityRole="button"
                        accessibilityLabel={`${a.name}, ${money(a.price)}${a.change != null ? `, ${pct(a.change)} today` : ""}`}
                        style={s.tile}
                      >
                        <Text style={s.tileKey} numberOfLines={1}>
                          {SHORT[baseSym(a.symbol).toUpperCase()] ??
                            baseSym(a.symbol).toUpperCase()}
                        </Text>
                        <Text style={s.tilePrice} numberOfLines={1}>
                          {money(a.price)}
                        </Text>
                        <Spark
                          pts={trails.get(a.tokenAddress) ?? [a.price]}
                          up={up}
                        />
                        <Text
                          style={[
                            s.tileChg,
                            {
                              color:
                                a.change == null
                                  ? C.ink4
                                  : up
                                    ? C.mint
                                    : C.loss,
                            },
                          ]}
                        >
                          {a.change == null ? "—" : pct(a.change)}
                        </Text>
                      </PressScale>
                    );
                  })
                : [0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} width={104} height={84} radius={14} />
                  ))}
            </ScrollView>
            {ready && note ? <Text style={s.pulseNote}>{note}</Text> : null}
          </Rise>

          {/* chat */}
          <View style={{ gap: 12 }}>
            <Rise {...r(2)}>
              <Text style={TYPE.lbl}>TODAY</Text>
            </Rise>

            {!ready ? (
              <View style={{ gap: 12, paddingLeft: 36 }}>
                <Skeleton width="80%" height={58} radius={18} />
                <Skeleton width="60%" height={40} radius={18} />
              </View>
            ) : (
              intro.map((m, i) => (
                <Rise
                  key={`intro${i}`}
                  when={splashDone}
                  delay={165 + i * 140}
                  duration={420}
                >
                  <AiBubble text={m} avatar={i === 0} />
                </Rise>
              ))
            )}

            {msgs.map((m) =>
              m.from === "me" ? (
                <Rise key={m.id} duration={360}>
                  <View style={[s.msg, s.me]}>
                    <Text style={[s.msgText, s.meText]}>{m.text}</Text>
                  </View>
                </Rise>
              ) : (
                <Rise key={m.id} duration={360}>
                  <AiBubble
                    text={visible(m)}
                    actions={isDone(m) ? m.actions : undefined}
                    onAction={act}
                  />
                </Rise>
              ),
            )}

            {thinking ? (
              <Rise duration={360}>
                <View style={s.aiRow} accessibilityLabel="Folio AI is thinking">
                  <View style={s.aiAv}>
                    <FolioAIMark size={26} mode="think" />
                  </View>
                  <View style={s.msg}>
                    <TypingDots />
                  </View>
                </View>
              </Rise>
            ) : null}
          </View>
        </ScrollView>

        {/* sticky composer */}
        <View
          style={[
            s.composerWrap,
            { paddingBottom: kbOpen ? 10 : TAB_BAR_HEIGHT + insets.bottom + 8 },
          ]}
        >
          <LinearGradient
            colors={["rgba(10,11,14,0)", C.ground]}
            style={s.fade}
            pointerEvents="none"
          />
          {ready && chips.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={s.bleed}
              contentContainerStyle={s.sugg}
            >
              {chips.map((q, i) => (
                <Animated.View
                  key={q}
                  entering={FadeIn.duration(220).delay(i * 40)}
                >
                  <Chip label={q} onPress={() => ask(q)} />
                </Animated.View>
              ))}
            </ScrollView>
          ) : null}

          <View style={[s.composer, focused && { borderColor: C.mint }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Folio AI anything…"
              placeholderTextColor={C.ink4}
              accessibilityLabel="Ask Folio AI"
              style={s.input}
              multiline
              submitBehavior="submit"
              returnKeyType="send"
              onSubmitEditing={() => ask(draft)}
              onFocus={() => {
                setFocused(true);
                setTimeout(
                  () => scrollRef.current?.scrollToEnd({ animated: true }),
                  320,
                );
              }}
              onBlur={() => setFocused(false)}
              selectionColor={C.mint}
              cursorColor={C.mint}
            />
            <PressScale
              onPress={() => ask(draft)}
              disabled={!canSend}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              style={[s.send, !canSend && { opacity: 0.3 }]}
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.onMint}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M10 16V4.5M5 9.5l5-5 5 5" />
              </Svg>
            </PressScale>
          </View>

          <Text style={s.foot}>
            FOLIO AI CAN MAKE MISTAKES. IT IS NOT FINANCIAL ADVICE.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// the tab's new name
export { SignalsScreen as AnalystScreen, SignalsScreen as FolioAIScreen };

// ---------- pieces ----------

function AiBubble({
  text,
  avatar = true,
  actions,
  onAction,
}: {
  text: string;
  avatar?: boolean;
  actions?: AnalystAction[];
  onAction?: (a: AnalystAction) => void;
}) {
  return (
    <View style={[s.aiRow, !avatar && s.cont]}>
      <View style={s.aiAv}>{avatar ? <FolioAIMark size={26} /> : null}</View>
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <View style={[s.msg, { maxWidth: "100%" }]}>
          <Text style={s.msgText}>{text}</Text>
        </View>
        {actions?.length ? (
          <Animated.View entering={FadeIn.duration(220)} style={s.acts}>
            {actions.map((a) => (
              <Chip
                key={a.label}
                variant="outline"
                label={a.label}
                onPress={() => onAction?.(a)}
              />
            ))}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** radial-gradient(circle, rgba(55,224,153,.2), transparent 70%) */
function Glow() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="faiGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={C.mint} stopOpacity={0.2} />
          <Stop offset="0.7" stopColor={C.mint} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#faiGlow)" />
    </Svg>
  );
}

function Spark({ pts, up }: { pts: number[]; up: boolean }) {
  const v = pts.length > 1 ? pts : [pts[0], pts[0]];
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const d = v
    .map((y, i) => {
      const x = (i / (v.length - 1)) * 100;
      const yy = hi === lo ? 13 : 24 - ((y - lo) / (hi - lo)) * 22;
      return `${x.toFixed(1)},${yy.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg
      width="100%"
      height={16}
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
    >
      <Polyline
        points={d}
        fill="none"
        stroke={up ? C.mint : C.loss}
        strokeWidth={1.6}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}

// ---------- helpers ----------

const words = (t: string) => t.split(" ");
const isDone = (m: Msg) => m.shown == null || m.shown >= words(m.text).length;
const visible = (m: Msg) =>
  m.shown == null ? m.text : words(m.text).slice(0, m.shown).join(" ");

function pickPulse(assets: AnalystAsset[]): AnalystAsset[] {
  const out: AnalystAsset[] = [];
  const used = new Set<string>();
  for (const group of PULSE_PREFER) {
    const a = assets.find(
      (x) =>
        !x.preIpo &&
        !used.has(x.tokenAddress) &&
        group.includes(baseSym(x.symbol).toUpperCase()),
    );
    if (a) {
      out.push(a);
      used.add(a.tokenAddress);
    }
  }
  const rest = assets
    .filter((a) => !used.has(a.tokenAddress) && a.change != null)
    .sort((x, y) => Math.abs(y.change!) - Math.abs(x.change!));
  while (out.length < 6 && rest.length) out.push(rest.shift()!);
  return out;
}

/**
 * Sparkline points per asset: today's open, then every price we've seen
 * this session (kept to 24). Swap this for real intraday candles if you have
 * a price-history hook.
 */
function useTrails(tiles: AnalystAsset[]) {
  const store = useRef(new Map<string, number[]>());
  return useMemo(() => {
    const m = store.current;
    for (const t of tiles) {
      const open = t.change != null ? t.price / (1 + t.change / 100) : t.price;
      const tr = m.get(t.tokenAddress) ?? [open];
      if (tr[tr.length - 1] !== t.price) tr.push(t.price);
      if (tr.length > 24) tr.splice(1, tr.length - 24);
      m.set(t.tokenAddress, tr);
    }
    return new Map(m);
  }, [tiles]);
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const a = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      () => setOpen(true),
    );
    const b = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setOpen(false),
    );
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return open;
}

/** US regular session, Mon–Fri 9:30–16:00 New York. Ignores holidays. */
function usMarketOpen(d = new Date()): boolean | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
    if (get("weekday") === "Sat" || get("weekday") === "Sun") return false;
    const mins = Number(get("hour")) * 60 + Number(get("minute"));
    return mins >= 570 && mins < 960;
  } catch {
    return null;
  }
}

function useUsMarketOpen() {
  const [open, setOpen] = useState(usMarketOpen);
  useEffect(() => {
    const h = setInterval(() => setOpen(usMarketOpen()), 60_000);
    return () => clearInterval(h);
  }, []);
  return open;
}

// ---------- styles ----------

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  rowx: { flexDirection: "row", alignItems: "center" },
  bleed: { marginHorizontal: -20, flexGrow: 0 },

  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  halo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: FONT.sans800,
    fontSize: 20,
    letterSpacing: em(20, -0.035),
    color: C.ink1,
  },
  subtitle: { fontFamily: FONT.sans400, fontSize: 12.5, color: C.ink3 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  dot: { width: 6, height: 6, borderRadius: 9, marginRight: 6 },
  stat: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.14),
    color: C.ink4,
  },
  pulseRow: { paddingHorizontal: 20, paddingBottom: 2, gap: 10 },
  tile: {
    width: 104,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: C.surface,
  },
  tileKey: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.14),
    color: C.ink4,
  },
  tilePrice: {
    fontFamily: FONT.mono400,
    fontSize: 13.5,
    color: "#E4E8EE",
    fontVariant: ["tabular-nums"],
  },
  tileChg: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  pulseNote: {
    marginTop: -2,
    fontFamily: FONT.sans400,
    fontSize: 12.5,
    lineHeight: 18,
    color: C.ink3,
  },

  aiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "92%",
  },
  cont: { marginTop: -4 },
  aiAv: { width: 26, paddingTop: 4 },
  acts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

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

  composerWrap: {
    paddingTop: 8,
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: C.ground,
  },
  fade: { position: "absolute", left: 0, right: 0, top: -18, height: 18 },
  sugg: { paddingHorizontal: 20, gap: 8 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingVertical: 6,
    paddingRight: 6,
    paddingLeft: 16,
    borderRadius: 24,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.stroke,
  },
  input: {
    flex: 1,
    minWidth: 0,
    maxHeight: 120,
    paddingTop: 9,
    paddingBottom: 9,
    fontFamily: FONT.sans400,
    fontSize: 16,
    lineHeight: 21,
    color: C.ink1,
    textAlignVertical: "center",
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  foot: {
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.14),
    color: C.ink4,
  },
});
