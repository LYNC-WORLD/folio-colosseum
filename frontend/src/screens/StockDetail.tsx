// src/screens/StockDetail.tsx — prototype #s-asset
//
//   ‹ Back
//   NVDA                                 $184.20
//   NVIDIA · Stock                  +2.1% past year      ← shows the scrubbed price/date while dragging
//   [ chart, draws itself, pulsing end dot, 1D 1W 1M 1Y All ]
//   [ YOUR POSITION ]        (if you hold it)
//   [ RECURRING BUY ]        (if one is on)
//   ( Buy | Recurring )      sliding thumb
//   AMOUNT → 25% 50% 75% Max on focus         $440.00 USDC AVAILABLE
//   [ $ 100                               USDC ]
//   Recurring only: EVERY MONTH ON THE [1..30], FIRST BUY / THEN / A YEAR AT THIS RATE
//   PAY WITH USDC · SETTLES TO your wallet
//   RECENT ACTIVITY
//   ─────────────── dock ───────────────
//   [ Sell ][      Buy NVDA      ]     Sell slides in only when you hold some

import { useEffect, useRef, useState } from "react";
import {
  Pressable,
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
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Rect } from "react-native-svg";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useStockDetail } from "../hooks/useStockDetail";
import type { Candle, ChartPeriod } from "../hooks";
import { useWallet } from "../context/WalletContext";
import type { HomeStackParamList } from "../navigation/HomeStack";
import { C, EASE, FONT, TYPE, em, h1Size } from "../theme";
import { timing } from "../theme/motion";
import {
  Badge,
  Button,
  PressScale,
  Rise,
  Segmented,
  Skeleton,
} from "../components/ui";
import { PriceChart, type ChartChange } from "../components/PriceChart";
import { AmountField } from "../components/AmountField";
import { DayPicker } from "../components/DayPicker";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { BuyFlow, type BuyOutcome } from "../components/trade/BuyFlow";
import { LockedSell, SellFlow } from "../components/trade/SellFlow";
import { CancelRecurringFlow } from "../components/trade/CancelRecurringFlow";
import { money, pct } from "../lib/format";
import {
  cleanAmt,
  dayDate,
  defaultDay,
  fmtIn,
  maskUserId,
  nextOccurrence,
  thenText,
  timeAgo,
  units,
  PRE_IPO_LOCKED,
} from "../lib/trade";
import { hTap } from "../lib/haptics";

type Nav = NativeStackNavigationProp<HomeStackParamList, "StockDetail">;

const PERIOD_WORD: Record<ChartPeriod, string> = {
  "1D": "today",
  "1W": "past week",
  "1M": "past month",
  "1Y": "past year",
  All: "all time",
};

const SLIDE = LinearTransition.duration(380).easing(EASE);

export function StockDetail() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<HomeStackParamList, "StockDetail">>();
  const {
    stock,
    investment,
    recurringBuy,
    latestBuys,
    loading,
    error,
    reload,
  } = useStockDetail(params.category, params.symbol);
  const { usdc, tokens, loading: walletLoading } = useWallet();
  const sheet = useSheet();
  const toast = useToast();

  const scrollRef = useRef<ScrollView>(null);
  const amountRef = useRef<TextInput>(null);
  const segY = useRef(0);
  const amountY = useRef(0);

  const [change, setChange] = useState<ChartChange | null>(null);
  const [scrub, setScrub] = useState<Candle | null>(null);
  const [mode, setMode] = useState<0 | 1>(0); // 0 = Buy, 1 = Recurring
  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  const [day, setDay] = useState(defaultDay());

  const balance = usdc?.balance ?? 0;
  const amt = parseFloat(input) || 0;

  // Prototype starts at $100 — only when you have it, and only until you type.
  useEffect(() => {
    if (!touched && !walletLoading && balance >= 100) setInput("100");
  }, [walletLoading, balance, touched]);

  // keyboard: extra space at the end so the field can scroll above it
  const kb = useAnimatedKeyboard();
  const kbSpace = useAnimatedStyle(() => ({ height: kb.height.value }));

  if (loading)
    return <LoadingState top={insets.top} onBack={() => nav.goBack()} />;
  if (error || !stock) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={[TYPE.sub, { color: C.loss }]}>
          {error ?? "Stock not found"}
        </Text>
        <Button
          variant="quiet"
          size="sm"
          title="Retry"
          onPress={() => reload()}
          style={{ width: 140 }}
        />
      </SafeAreaView>
    );
  }

  const price = Number(stock.price);
  const isPre = params.category === "pre-ipo";
  const kind = isPre ? "Pre-IPO" : "Stock";

  // position
  const token = tokens?.find(
    (t: { mint: string }) => t.mint === stock.tokenAddress,
  );
  const holding = investment?.hasInvestment ? investment.data[0] : undefined;
  const held = token?.balance ?? holding?.stockAmount ?? 0;
  const posValue = held * price;
  const invested = holding?.investmesntAmount;
  const ret =
    invested && invested > 0 ? ((posValue - invested) / invested) * 100 : null;

  // recurring
  const activeRec = recurringBuy?.hasRecurringBuy
    ? recurringBuy.data.find((r) => r.isActive)
    : undefined;
  const recLabel = activeRec
    ? activeRec.usdcAmount
      ? `${money(Number(activeRec.usdcAmount))} every month`
      : `${activeRec.stockAmount} ${stock.symbol} every month`
    : undefined;

  // header: scrubbed point, else price + period change
  const shownPrice = scrub ? scrub.close : price;
  const headerSub = scrub
    ? new Date(scrub.time * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : change
      ? `${pct(change.changePct)} ${PERIOD_WORD[change.period]}`
      : " ";
  const headerColor = scrub
    ? C.ink3
    : (change?.changeAbs ?? 0) >= 0
      ? C.mint
      : C.loss;

  // amount validation (prototype renderAmt)
  const rep = mode === 1;
  const over = amt > balance + 1e-9;
  const zero = amt <= 0;
  const blockedRec = rep && !!activeRec;
  const hint = walletLoading
    ? "Checking your balance…"
    : over
      ? `More than the ${money(balance)} you have available`
      : zero
        ? "Enter an amount in USDC"
        : `≈ ${units(price ? amt / price : 0)} ${stock.symbol} at ${money(price)}`;
  const buyTitle = blockedRec
    ? "Recurring buy already on"
    : over
      ? "Not enough USDC"
      : zero
        ? "Enter an amount"
        : rep
          ? `Buy ${money(amt)} every month`
          : `Buy ${stock.symbol}`;
  const buyDisabled = walletLoading || over || zero || blockedRec;

  const pcts = [25, 50, 75, 100].map((p) => ({
    label: p === 100 ? "Max" : `${p}%`,
    value: Math.floor(balance * p) / 100,
  }));

  // ---------- actions ----------
  const openBuy = () => {
    amountRef.current?.blur();
    sheet.open(
      <BuyFlow
        stock={{
          tokenAddress: stock.tokenAddress,
          symbol: stock.symbol,
          price,
        }}
        amount={amt}
        recurringDay={rep ? day : null}
        isPreIpo={isPre}
        canMakeRecurring={!activeRec}
        onFinish={(o, sum) => afterBuy(o, sum)}
      />,
      {
        label: rep ? "Confirm recurring buy" : "Confirm order",
        onClose: () => reload(),
      },
    );
  };

  const leaveTo = (route: "Portfolio" | "Profile", params?: object) => {
    (nav.getParent() as any)?.navigate(route, params);
    setTimeout(() => nav.popToTop(), 350);
  };

  const afterBuy = (o: BuyOutcome, sum: { amount: number; units: number }) => {
    sheet.close();
    if (rep) toast("Recurring buy is on", `${money(sum.amount)} EVERY MONTH`);
    else
      toast(
        `${stock.symbol} is in your Folio`,
        `${money(sum.amount)} · SETTLED`,
      );
    if (o === "folio") leaveTo("Portfolio");
    // Standing orders live in the Profile stack (opened from Folio's gear)
    if (o === "orders") leaveTo("Profile", { screen: "RecurringBuys" });
    if (o === "makeRecurring") {
      setMode(1);
      setTimeout(
        () =>
          scrollRef.current?.scrollTo({
            y: Math.max(0, segY.current - 20),
            animated: true,
          }),
        450,
      );
    }
  };

  const openSell = () => {
    if (isPre && PRE_IPO_LOCKED) {
      sheet.open(<LockedSell symbol={stock.symbol} value={posValue} />);
      return;
    }
    sheet.open(
      <SellFlow
        stock={{
          tokenAddress: stock.tokenAddress,
          symbol: stock.symbol,
          price,
        }}
        balance={held}
        recurringLabel={recLabel}
        onFinish={(o, sum) => {
          sheet.close();
          toast(
            `Sold ${stock.symbol}`,
            `${money(sum.usd)} USDC · IN YOUR WALLET`,
          );
          if (o === "folio") nav.getParent()?.navigate("Portfolio" as never);
          if (o === "cancelRecurring") setTimeout(openCancel, 480);
        }}
      />,
      { label: `Sell ${stock.symbol}`, onClose: () => reload() },
    );
  };

  const openCancel = () => {
    if (!activeRec) return;
    sheet.open(
      <CancelRecurringFlow
        recurringId={activeRec.id}
        symbol={stock.symbol}
        label={recLabel ?? ""}
        onCancelled={() => reload()}
      />,
      { label: "Cancel recurring buy" },
    );
  };

  // ---------- render ----------
  return (
    <View style={s.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          s.page,
          { paddingTop: insets.top + 12, paddingBottom: 130 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={16} color={C.mint} />
          <Text style={s.backText}>Back</Text>
        </Pressable>

        {/* header */}
        <Rise duration={420}>
          <View style={s.head}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={[TYPE.h1, h1Size(40)]}
                numberOfLines={1}
                adjustsFontSizeToFit
                accessibilityRole="header"
              >
                {stock.symbol}
              </Text>
              <Text style={TYPE.sub} numberOfLines={1}>
                {stock.name} · {kind}
              </Text>
            </View>
            <View style={s.headRight}>
              <Text style={s.price}>{money(shownPrice)}</Text>
              <Text style={[s.fig, { color: headerColor }]}>{headerSub}</Text>
            </View>
          </View>
        </Rise>

        <Rise duration={420} delay={60}>
          <PriceChart
            mint={stock.tokenAddress}
            onChange={setChange}
            onScrub={setScrub}
          />
        </Rise>

        {held > 0 ? (
          <Rise duration={420} delay={120}>
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={[TYPE.lbl, { flex: 1 }]}>YOUR POSITION</Text>
                {isPre && PRE_IPO_LOCKED ? (
                  <Badge label="LOCKED UNTIL LISTING" />
                ) : null}
              </View>
              <View style={s.posRow}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.posValue}>{money(posValue)}</Text>
                  <Text style={s.posQty}>
                    {units(held)} {stock.symbol}
                  </Text>
                </View>
                {ret != null ? (
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    <Text
                      style={[s.fig, { color: ret >= 0 ? C.mint : C.loss }]}
                    >
                      {pct(ret)}
                    </Text>
                    <Text style={s.tinyLbl}>RETURN</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Rise>
        ) : null}

        {activeRec ? (
          <Rise duration={420} delay={150}>
            <View style={s.card}>
              <View style={s.cardHead}>
                <View style={s.liveDot} />
                <Text style={[TYPE.lbl, { flex: 1 }]}>RECURRING BUY</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={[TYPE.ttl, { fontSize: 16 }]}>{recLabel}</Text>
                <Text style={TYPE.sub}>
                  Next buy {dayDate(new Date(activeRec.buyDate))}
                </Text>
              </View>
              <Pressable
                onPress={openCancel}
                hitSlop={10}
                style={s.linkDanger}
                accessibilityRole="button"
              >
                <Text style={s.linkDangerText}>Cancel recurring buy</Text>
              </Pressable>
            </View>
          </Rise>
        ) : null}

        <View onLayout={(e) => (segY.current = e.nativeEvent.layout.y)}>
          <Segmented
            options={["Buy", "Recurring"]}
            index={mode}
            onChange={(i) => setMode(i as 0 | 1)}
          />
        </View>

        <View onLayout={(e) => (amountY.current = e.nativeEvent.layout.y)}>
          <AmountField
            ref={amountRef}
            value={input}
            onChangeText={(t) => {
              setTouched(true);
              setInput(cleanAmt(t));
            }}
            amount={amt}
            pcts={pcts}
            onPick={(v) => {
              setTouched(true);
              setInput(fmtIn(v));
            }}
            availValue={walletLoading ? "…" : money(balance)}
            availLabel="USDC AVAILABLE"
            hint={hint}
            bad={over}
            onFocus={() =>
              setTimeout(
                () =>
                  scrollRef.current?.scrollTo({
                    y: Math.max(0, amountY.current - 90),
                    animated: true,
                  }),
                250,
              )
            }
          />
        </View>

        {rep ? (
          <Animated.View
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(160)}
            style={{ gap: 12 }}
          >
            {activeRec ? (
              <View style={s.wash}>
                <Text style={[TYPE.sub, { color: C.ink2, lineHeight: 19 }]}>
                  You already buy {stock.symbol}{" "}
                  {recLabel?.replace(/^\$[\d,.]+ /, "")}. Cancel that one above
                  to set up a new amount.
                </Text>
              </View>
            ) : (
              <>
                <Text style={TYPE.lbl}>EVERY MONTH ON THE</Text>
                <DayPicker day={day} onPick={setDay} />
                <View style={[s.wash, { paddingVertical: 4 }]}>
                  <WashRow k="FIRST BUY" v={dayDate(nextOccurrence(day))} />
                  <WashRow k="THEN" v={thenText(day)} />
                  <WashRow k="A YEAR AT THIS RATE" v={money(amt * 12)} last />
                </View>
              </>
            )}
          </Animated.View>
        ) : null}

        <Animated.View layout={SLIDE}>
          <WashRow k="PAY WITH" v="USDC" hairOnly />
          <WashRow k="SETTLES TO" v="Your wallet" hairOnly />
        </Animated.View>

        <Animated.View layout={SLIDE} style={{ gap: 4 }}>
          <Text style={[TYPE.lbl, { marginTop: 8, marginBottom: 4 }]}>
            RECENT ACTIVITY
          </Text>
          {latestBuys.length === 0 ? (
            <Text style={TYPE.sub}>No trades yet. Be the first.</Text>
          ) : (
            latestBuys.map((b, i) => (
              <View
                key={b.id}
                style={[s.actRow, i < latestBuys.length - 1 && s.hair]}
              >
                <View
                  style={[
                    s.actDot,
                    {
                      backgroundColor: b.tradeType === "BUY" ? C.mint : C.loss,
                    },
                  ]}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[TYPE.ttl, { fontFamily: FONT.sans600 }]}>
                    {b.tradeType === "BUY" ? "Bought" : "Sold"}{" "}
                    {money(b.investmentAmount)}
                  </Text>
                  <Text style={s.actSub}>
                    {maskUserId(b.userId)} · {timeAgo(b.createdAt)}
                  </Text>
                </View>
                <Text style={[s.fig, { color: "#D6DAE0" }]}>
                  {money(b.stockPrice)}
                </Text>
              </View>
            ))
          )}
        </Animated.View>

        <Animated.View style={kbSpace} />
      </ScrollView>

      <Dock
        held={held > 0}
        locked={isPre && PRE_IPO_LOCKED}
        buyTitle={buyTitle}
        buyDisabled={buyDisabled}
        onBuy={openBuy}
        onSell={openSell}
        bottom={insets.bottom}
      />
    </View>
  );
}

// ---------- pieces ----------

function WashRow({
  k,
  v,
  last,
  hairOnly,
}: {
  k: string;
  v: string;
  last?: boolean;
  hairOnly?: boolean;
}) {
  return (
    <View
      style={[s.washRow, hairOnly ? { minHeight: 44 } : null, !last && s.hair]}
    >
      <Text style={s.washKey}>{k}</Text>
      <Text style={[s.fig, { color: "#D6DAE0" }]}>{v}</Text>
    </View>
  );
}

/** Bottom dock: Sell slides in beside Buy once you hold the asset (prototype .dockRow). */
function Dock({
  held,
  locked,
  buyTitle,
  buyDisabled,
  onBuy,
  onSell,
  bottom,
}: {
  held: boolean;
  locked: boolean;
  buyTitle: string;
  buyDisabled: boolean;
  onBuy: () => void;
  onSell: () => void;
  bottom: number;
}) {
  const w = useSharedValue(0);
  const p = useSharedValue(held ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(held ? 1 : 0, timing(420));
  }, [held]);

  // grid 1fr : 1.75fr with a 10pt gap, collapsing to 0 : 1
  const sell = useAnimatedStyle(() => ({
    width: (p.value * (w.value - 10)) / 2.75,
    marginRight: p.value * 10,
    opacity: p.value,
  }));

  return (
    <View
      style={[s.dock, { paddingBottom: 16 + bottom }]}
      pointerEvents="box-none"
    >
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,11,14,0)", C.ground]}
        locations={[0, 0.34]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={s.dockRow}
        onLayout={(e) => (w.value = e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[{ overflow: "hidden" }, sell]}
          pointerEvents={held ? "auto" : "none"}
        >
          <PressScale
            onPress={() => {
              hTap();
              onSell();
            }}
            style={s.sellBtn}
            accessibilityRole="button"
            accessibilityLabel={locked ? "Sell, locked until listing" : "Sell"}
          >
            {locked ? (
              <Svg
                width={13}
                height={13}
                viewBox="0 0 16 16"
                fill="none"
                stroke={C.ink1}
                strokeWidth={1.8}
                strokeLinecap="round"
              >
                <Rect x="3" y="7" width="10" height="7" rx="2" />
                <Path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
              </Svg>
            ) : null}
            <Text style={s.sellText} numberOfLines={1}>
              Sell
            </Text>
          </PressScale>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Button title={buyTitle} disabled={buyDisabled} onPress={onBuy} />
        </View>
      </View>
    </View>
  );
}

function LoadingState({ top, onBack }: { top: number; onBack: () => void }) {
  return (
    <View
      style={[s.safe, { paddingTop: top + 12, paddingHorizontal: 20, gap: 18 }]}
    >
      <Pressable
        onPress={onBack}
        style={s.back}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={16} color={C.mint} />
        <Text style={s.backText}>Back</Text>
      </Pressable>
      <View style={s.head}>
        <View style={{ flex: 1, gap: 10 }}>
          <Skeleton width={140} height={36} />
          <Skeleton width={110} height={12} />
        </View>
        <View style={{ alignItems: "flex-end", gap: 10 }}>
          <Skeleton width={96} height={20} />
          <Skeleton width={70} height={12} />
        </View>
      </View>
      <Skeleton height={210} radius={16} />
      <Skeleton height={46} radius={999} />
      <Skeleton height={70} radius={16} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  center: { alignItems: "center", justifyContent: "center", gap: 14 },
  page: { paddingHorizontal: 20, gap: 18 },

  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    minHeight: 44,
    marginLeft: -4,
    marginVertical: -8,
  },
  backText: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },

  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headRight: { alignItems: "flex-end", gap: 6, paddingTop: 4 },
  price: {
    fontFamily: FONT.mono400,
    fontSize: 20,
    letterSpacing: em(20, -0.03),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  fig: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.mint },
  posRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  posValue: {
    fontFamily: FONT.mono400,
    fontSize: 24,
    letterSpacing: em(24, -0.03),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  posQty: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  tinyLbl: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.14),
    color: C.ink4,
  },
  linkDanger: {
    alignSelf: "flex-start",
    minHeight: 32,
    justifyContent: "center",
  },
  linkDangerText: { fontFamily: FONT.sans600, fontSize: 13.5, color: C.loss },

  wash: {
    backgroundColor: C.sunk,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  washRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  washKey: {
    flex: 1,
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.18),
    color: C.ink4,
  },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },

  actRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actDot: { width: 7, height: 7, borderRadius: 999 },
  actSub: { fontFamily: FONT.mono400, fontSize: 11, color: C.ink4 },

  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 22,
    paddingHorizontal: 20,
  },
  dockRow: { flexDirection: "row", alignItems: "center" },
  sellBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: C.raised,
    borderWidth: 1.5,
    borderColor: C.strokeHi,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  sellText: { fontFamily: FONT.sans700, fontSize: 16, color: C.ink1 },
});
