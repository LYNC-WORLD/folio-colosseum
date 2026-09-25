// src/screens/IndexFundDetail.tsx — prototype #s-asset for an index fund
//
//   ‹ Back
//   GPU Infra                            $433.78
//   2 STOCKS · Index fund             +0.4% today
//   [ allocation bar, one segment per stock ]
//   WHAT'S INSIDE · 2 STOCKS            TOP 5 = 100%
//   Tracks NVIDIA and AMD. Weighted by price, …
//   01 NVIDIA  NVDAx  ▬▬▬▬▬▬           52.1%  +0.2%   ← opens that stock
//   Show all 7
//   AMOUNT                                  $440.00 USDC AVAILABLE
//   [ $ 100                               USDC ]
//   PAY WITH USDC · SETTLES TO your wallet
//   ─────────────── dock ───────────────
//   [            Buy GPU Infra            ]

import { useEffect, useMemo, useRef, useState } from "react";
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
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useIndexFunds } from "../hooks";
import { useWallet } from "../context/WalletContext";
import type { HomeStackParamList } from "../navigation/HomeStack";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Bar, Button, PressScale, Rise, Skeleton } from "../components/ui";
import { AmountField } from "../components/AmountField";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { IndexBuyFlow } from "../components/trade/IndexBuyFlow";
import { money, pct } from "../lib/format";
import { fundPositions, useFundLots } from "../lib/fundHoldings";
import { toFund, type FundHolding } from "../lib/indexFunds";
import { cleanAmt, fmtIn } from "../lib/trade";
import { hTap } from "../lib/haptics";
import { tracks } from "./IndexFundsScreen";

type Nav = NativeStackNavigationProp<HomeStackParamList, "IndexFundDetail">;

// allocation bar segments, heaviest first
const SEG_COLORS = [C.mint, "#2BB27A", "#20855C", "#1A6247", "#164835", "#123527"];

export function IndexFundDetail() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<HomeStackParamList, "IndexFundDetail">>();
  const { funds, loading, error, reload } = useIndexFunds();
  const raw = funds.find((f) => f.id === params.id);
  const fund = useMemo(() => (raw ? toFund(raw) : null), [raw]);

  const { usdc, tokens, walletAddress, loading: walletLoading } = useWallet();
  const lots = useFundLots();
  const position = useMemo(
    () => fundPositions(lots, walletAddress, tokens).find((p) => p.fundId === params.id),
    [lots, walletAddress, tokens, params.id],
  );
  const sheet = useSheet();
  const toast = useToast();

  const scrollRef = useRef<ScrollView>(null);
  const amountRef = useRef<TextInput>(null);
  const amountY = useRef(0);

  const [input, setInput] = useState("");
  const [touched, setTouched] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  const balance = usdc?.balance ?? 0;
  const amt = parseFloat(input) || 0;

  useEffect(() => {
    if (!touched && !walletLoading && balance >= 100) setInput("100");
  }, [walletLoading, balance, touched]);

  const kb = useAnimatedKeyboard();
  const kbSpace = useAnimatedStyle(() => ({ height: kb.height.value }));

  if (loading)
    return <LoadingState top={insets.top} onBack={() => nav.goBack()} />;
  if (!fund) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={[TYPE.sub, { color: C.loss }]}>
          {error ?? "This fund isn't available any more"}
        </Text>
        <Button
          variant="quiet"
          size="sm"
          title={error ? "Retry" : "Back"}
          onPress={() => (error ? reload() : nav.goBack())}
          style={{ width: 140 }}
        />
      </SafeAreaView>
    );
  }

  const n = fund.holdings.length;
  const over = amt > balance + 1e-9;
  const zero = amt <= 0;
  const hint = walletLoading
    ? "Checking your balance…"
    : over
      ? `More than the ${money(balance)} you have available`
      : zero
        ? "Enter an amount in USDC"
        : `≈ ${(fund.price ? amt / fund.price : 0).toFixed(4)} units, split across ${n} stocks`;
  const buyTitle = over
    ? "Not enough USDC"
    : zero
      ? "Enter an amount"
      : `Buy ${fund.name}`;
  const buyDisabled = walletLoading || over || zero;

  const pcts = [25, 50, 75, 100].map((p) => ({
    label: p === 100 ? "Max" : `${p}%`,
    value: Math.floor(balance * p) / 100,
  }));

  const rows = allOpen ? fund.holdings : fund.holdings.slice(0, 5);
  const topShown = fund.holdings
    .slice(0, 5)
    .reduce((t, h) => t + h.weight, 0);

  const openBuy = () => {
    amountRef.current?.blur();
    sheet.open(
      <IndexBuyFlow
        fund={fund}
        amount={amt}
        onFinish={(o, sum) => {
          sheet.close();
          toast(`${fund.name} is in your Folio`, `${money(sum.spent)} · SETTLED`);
          if (o === "folio") {
            (nav.getParent() as any)?.navigate("Portfolio");
            setTimeout(() => nav.popToTop(), 350);
          }
        }}
      />,
      { label: "Confirm order", onClose: () => reload() },
    );
  };

  const openStock = (h: FundHolding) =>
    nav.push("StockDetail", { symbol: h.stock.symbol, category: h.category });

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

        <Rise duration={420}>
          <View style={s.head}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={[TYPE.h1, h1Size(40)]}
                numberOfLines={1}
                adjustsFontSizeToFit
                accessibilityRole="header"
              >
                {fund.name}
              </Text>
              <Text style={TYPE.sub} numberOfLines={1}>
                {n} {n === 1 ? "stock" : "stocks"} · Index fund
              </Text>
            </View>
            <View style={s.headRight}>
              <Text style={s.price}>{money(fund.price)}</Text>
              {fund.change != null ? (
                <Text
                  style={[s.fig, { color: fund.change >= 0 ? C.mint : C.loss }]}
                >
                  {pct(fund.change)} today
                </Text>
              ) : null}
            </View>
          </View>
        </Rise>

        <Rise duration={420} delay={60}>
          <View style={s.card}>
            <Text style={s.tinyLbl}>ALLOCATION</Text>
            <View style={s.alloc}>
              {fund.holdings.map((h, i) => (
                <View
                  key={h.stock.tokenAddress}
                  style={{
                    flex: h.weight,
                    backgroundColor: SEG_COLORS[Math.min(i, SEG_COLORS.length - 1)],
                  }}
                />
              ))}
            </View>
            <View style={s.legend}>
              {fund.holdings.slice(0, 6).map((h, i) => (
                <View key={h.stock.tokenAddress} style={s.legendItem}>
                  <View
                    style={[
                      s.legendDot,
                      { backgroundColor: SEG_COLORS[Math.min(i, SEG_COLORS.length - 1)] },
                    ]}
                  />
                  <Text style={s.legendText}>
                    {h.stock.symbol} {h.weight.toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Rise>

        {position ? (
          <Rise duration={420} delay={90}>
            <View style={s.card}>
              <Text style={TYPE.lbl}>YOUR POSITION</Text>
              <View style={s.posRow}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.posValue}>{money(position.value)}</Text>
                  <Text style={s.posQty} numberOfLines={1}>
                    {position.legs.length} of {n} stocks ·{" "}
                    {money(position.invested)} put in
                  </Text>
                </View>
                {position.ret != null ? (
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    <Text
                      style={[s.fig, { color: position.ret >= 0 ? C.mint : C.loss }]}
                    >
                      {pct(position.ret)}
                    </Text>
                    <Text style={s.tinyLbl}>RETURN</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Rise>
        ) : null}

        <Rise duration={420} delay={120} style={{ gap: 12 }}>
          <View style={s.insideHead}>
            <Text style={[TYPE.lbl, { flex: 1 }]}>
              WHAT'S INSIDE · {n} {n === 1 ? "STOCK" : "STOCKS"}
            </Text>
            <Text style={s.tinyLbl}>
              TOP {Math.min(5, n)} = {topShown.toFixed(1)}%
            </Text>
          </View>
          <Text style={[TYPE.body, { fontSize: 13.5, marginTop: -4 }]}>
            {tracks(fund)}. Weighted by share price, so one unit holds an equal
            number of shares of each.
          </Text>
          <View>
            {rows.map((h, i) => (
              <InsideRow
                key={h.stock.tokenAddress}
                h={h}
                i={i}
                top={fund.holdings[0].weight}
                last={i === rows.length - 1}
                onPress={() => openStock(h)}
              />
            ))}
          </View>
          {n > 5 ? (
            <Pressable
              onPress={() => setAllOpen((v) => !v)}
              hitSlop={8}
              style={s.more}
              accessibilityRole="button"
            >
              <Text style={s.backText}>
                {allOpen ? "Show top 5" : `Show all ${n}`}
              </Text>
            </Pressable>
          ) : null}
        </Rise>

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

        <View>
          <WashRow k="PAY WITH" v="USDC" />
          <WashRow k="SPLIT ACROSS" v={`${n} stocks`} />
          <WashRow k="SETTLES TO" v="Your wallet" last />
        </View>

        <Animated.View style={kbSpace} />
      </ScrollView>

      <View
        style={[s.dock, { paddingBottom: 16 + insets.bottom }]}
        pointerEvents="box-none"
      >
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10,11,14,0)", C.ground]}
          locations={[0, 0.34]}
          style={StyleSheet.absoluteFill}
        />
        <Button title={buyTitle} disabled={buyDisabled} onPress={openBuy} />
      </View>
    </View>
  );
}

// ---------- pieces ----------

function InsideRow({
  h,
  i,
  top,
  last,
  onPress,
}: {
  h: FundHolding;
  i: number;
  top: number;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={[s.insideRow, !last && s.hair]}
      accessibilityRole="button"
      accessibilityLabel={`${h.stock.name}, ${h.weight.toFixed(1)} percent of the fund`}
    >
      <Text style={s.idx}>{String(i + 1).padStart(2, "0")}</Text>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={s.nameRow}>
          <Text style={[TYPE.ttl, { flexShrink: 1 }]} numberOfLines={1}>
            {h.stock.name}
          </Text>
          <Text style={s.sym}>{h.stock.symbol}</Text>
        </View>
        <Bar
          value={top > 0 ? h.weight / top : 0}
          height={4}
          delay={i * 30}
          style={{ maxWidth: 160 }}
        />
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text style={[s.fig, { color: C.ink1 }]}>{h.weight.toFixed(1)}%</Text>
        {h.change != null ? (
          <Text
            style={[s.fig, { fontSize: 11, color: h.change >= 0 ? C.mint : C.loss }]}
          >
            {pct(h.change)}
          </Text>
        ) : null}
      </View>
    </PressScale>
  );
}

function WashRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[s.washRow, !last && s.hair]}>
      <Text style={s.washKey}>{k}</Text>
      <Text style={[s.fig, { color: "#D6DAE0" }]}>{v}</Text>
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
          <Skeleton width={160} height={36} />
          <Skeleton width={110} height={12} />
        </View>
        <View style={{ alignItems: "flex-end", gap: 10 }}>
          <Skeleton width={96} height={20} />
          <Skeleton width={70} height={12} />
        </View>
      </View>
      <Skeleton height={90} radius={16} />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={44} radius={12} />
      ))}
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
  tinyLbl: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.14),
    color: C.ink4,
  },
  alloc: {
    flexDirection: "row",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    gap: 2,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 999 },
  legendText: { fontFamily: FONT.mono400, fontSize: 11, color: C.ink2 },

  posRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  posValue: {
    fontFamily: FONT.mono400,
    fontSize: 24,
    letterSpacing: em(24, -0.03),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  posQty: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },

  insideHead: { flexDirection: "row", alignItems: "center" },
  insideRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  idx: { fontFamily: FONT.mono400, fontSize: 10, color: C.ink4, width: 20 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sym: { fontFamily: FONT.mono400, fontSize: 10, color: C.ink4 },
  more: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },

  washRow: {
    minHeight: 44,
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

  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 22,
    paddingHorizontal: 20,
  },
});
