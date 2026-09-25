// src/screens/PortfolioScreen.tsx — the Folio tab (prototype #s-folio)
//
//   ┌──────────── cover ───────────── [share][activity][settings]
//   (S)                                  ← avatar overlaps the cover, pen badge → Account
//   Shanu
//   @shanu
//   [THE PATIENT BUILDER]
//   ◷ 3–5 years horizon   ⇄ 3 trades   ▦ Since Sep 2026
//   ───────────────────────────────────
//   $1,240.50                     24h 7d 30d All
//   +$32.10 30d                           ← follows your finger when scrubbing
//   ····· chart, full width, draws itself ·····
//   ($) Cash in wallet  $440          [+] [⋯]
//   Positions (3)            ( One-time • | Recurring )
//   $800 in positions
//   [All] [Stocks] [Pre-IPOs] [Index funds]
//   rows…
//   HELD AT 4a91…f2c7 · SELF-CUSTODY

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useNavigation, useScrollToTop } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { useAuth, type OnboardingProfile } from "../context";
import { useWallet } from "../context/WalletContext";
import { useIndexFunds, useStocks } from "../hooks";
import { useRecurringBuys } from "../hooks/useTrade";
import { useUserTransactions } from "../hooks/useUserRecords";
import { usePortfolioSeries } from "../hooks/usePortfolioSeries";
import { useCountUp } from "../hooks/useCountUp";
import { getOnboardingProfile } from "../lib";
import type { TabParamList } from "../navigation/RootTabs";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE, em } from "../theme";
import { timing } from "../theme/motion";
import { Chip, IconButton, PressScale, Rise } from "../components/ui";
import { GearIcon, HistoryIcon, ShareIcon } from "../components/Icons";
import { AssetAvatar } from "../components/AssetAvatar";
import { useSheet } from "../components/Sheet";
import { useSplashDone } from "../components/SplashIntro";
import { PortfolioChart } from "../components/folio/PortfolioChart";
import {
  ActivitySheet,
  DepositFlow,
  MoreSheet,
  shortAddr,
} from "../components/folio/FolioSheets";
import { dayChange, money, pct } from "../lib/format";
import { fundPositions, useFundLots } from "../lib/fundHoldings";
import { toFund } from "../lib/indexFunds";
import { dayDate } from "../lib/trade";
import { hSelect, hTap } from "../lib/haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import type { ChartPeriod } from "../hooks";

type Nav = BottomTabNavigationProp<TabParamList, "Portfolio">;

// prototype ranges → chart periods
const RANGES: { key: string; period: ChartPeriod; label: string }[] = [
  { key: "24h", period: "1D", label: "24h" },
  { key: "7d", period: "1W", label: "7d" },
  { key: "30d", period: "1M", label: "30d" },
  { key: "All", period: "All", label: "all time" },
];

type Cat = "all" | "USStock" | "PreIPO" | "index";
const CATS: [Cat, string][] = [
  ["all", "All"],
  ["USStock", "Stocks"],
  ["PreIPO", "Pre-IPOs"],
  ["index", "Index funds"],
];

export function PortfolioScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const splashDone = useSplashDone();
  const sheet = useSheet();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { user, idToken } = useAuth();
  const {
    wallet,
    walletAddress,
    tokens,
    usdcValue,
    tokensValue,
    usdValue,
    loading,
    refreshing,
    error,
    refresh,
  } = useWallet();
  const { recurringBuys, reload: reloadRecurring } = useRecurringBuys();
  const txs = useUserTransactions(idToken ?? undefined);
  const us = useStocks("us-stock");
  const pre = useStocks("pre-ipo");
  const idx = useIndexFunds();
  const fundLots = useFundLots();

  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  useEffect(() => {
    getOnboardingProfile().then(setProfile);
  }, []);

  // ---------- chart ----------
  const [range, setRange] = useState(RANGES[3]);
  const holdings = useMemo(
    () =>
      tokens.map((t) => ({
        mint: t.mint,
        balance: t.balance,
        price: Number(t.price),
      })),
    [tokens],
  );
  const { points } = usePortfolioSeries(holdings, usdcValue, range.period);
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);

  const liveTotal = useCountUp(usdValue);
  const shownValue =
    scrubIdx != null ? (points[scrubIdx]?.v ?? usdValue) : liveTotal;
  const startV = points[0]?.v ?? usdValue;
  const endV = scrubIdx != null ? (points[scrubIdx]?.v ?? usdValue) : usdValue;
  const delta = endV - startV;
  const deltaLabel =
    scrubIdx == null || scrubIdx === points.length - 1
      ? range.label
      : range.period === "1D"
        ? new Date(points[scrubIdx].t * 1000).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date(points[scrubIdx].t * 1000).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          });

  const cash = useCountUp(usdcValue);

  // ---------- positions ----------
  const [tab, setTab] = useState<"open" | "rec">("open");
  const [cat, setCat] = useState<Cat>("all");

  const moves = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const s of [...us.stocks, ...pre.stocks])
      m.set(s.tokenAddress, dayChange(s.price, s.marketOpenPrice));
    return m;
  }, [us.stocks, pre.stocks]);

  const positions = useMemo(
    () =>
      tokens
        .map((t) => ({
          ...t,
          value: t.balance * Number(t.price),
          change: moves.get(t.mint) ?? null,
        }))
        .sort((a, b) => b.value - a.value),
    [tokens, moves],
  );
  const shownPositions = positions.filter(
    (p) => cat === "all" || p.stockType === cat,
  );

  // Index funds: the wallet holds the stocks themselves; which of them came
  // from a fund buy is rebuilt from the on-device log (lib/fundHoldings).
  const funds = useMemo(
    () => fundPositions(fundLots, walletAddress, tokens),
    [fundLots, walletAddress, tokens],
  );
  const fundMoves = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const f of idx.funds) m.set(f.id, toFund(f).change);
    return m;
  }, [idx.funds]);

  const activeRec = recurringBuys.filter((r) => r.isActive);
  const due30 = activeRec.reduce(
    (t, r) =>
      t +
      (Number(r.usdcAmount) ||
        Number(r.stockAmount) * Number(r.stock.price) ||
        0),
    0,
  );
  const shownRec = [...recurringBuys]
    .sort((a, b) => Number(b.isActive) - Number(a.isActive))
    .filter((r) => cat === "all" || r.stock.stockType === cat);

  // ---------- identity ----------
  const name = (user?.name ?? "").trim() || "You";
  const initial = name.charAt(0).toUpperCase();
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "";
  const photo = (user as { photo?: string | null } | null)?.photo ?? null;
  const tradeCount = txs.data?.data?.length ?? 0;
  const firstTx = txs.data?.data?.length
    ? new Date(Math.min(...txs.data.data.map((t) => +new Date(t.createdAt))))
    : null;
  const horizon = profile?.horizonLabel ?? null;

  // ---------- navigation ----------
  const openAsset = (symbol: string, stockType: string) =>
    nav.navigate("Home", {
      screen: "StockDetail",
      params: {
        symbol,
        category: stockType === "PreIPO" ? "pre-ipo" : "us-stock",
      },
      initial: false,
    });
  const openFund = (id: string) =>
    nav.navigate("Home", {
      screen: "IndexFundDetail",
      params: { id },
      initial: false,
    });
  const toAccount = () => nav.navigate("Profile");
  const toOrders = () =>
    (nav as any).navigate("Profile", {
      screen: "RecurringBuys",
      initial: false,
    });

  const openActivity = () =>
    sheet.open(<ActivitySheet />, { label: "Activity" });
  const openMore = () =>
    sheet.open(
      <MoreSheet
        address={walletAddress}
        onActivity={() => sheet.update(<ActivitySheet />)}
        onOrders={() => {
          sheet.close();
          toOrders();
        }}
        onAccount={() => {
          sheet.close();
          toAccount();
        }}
      />,
      { label: "More" },
    );

  const rise = (i: number) => ({
    when: splashDone,
    delay: i * 55,
    duration: 460,
  });

  return (
    <View style={s.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              reloadRecurring();
              txs.refetch();
            }}
            tintColor={C.mint}
            colors={[C.mint]}
            progressBackgroundColor={C.raised}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* cover + tools */}
        <LinearGradient
          colors={["#151922", "#11141A"]}
          style={[s.cover, { height: 96 + insets.top }]}
        >
          <View style={[s.tools, { top: insets.top + 16 }]}>
            <IconButton
              label="Share your wallet address"
              onPress={() =>
                walletAddress && Share.share({ message: walletAddress })
              }
            >
              <ShareIcon />
            </IconButton>
            <IconButton label="Activity" onPress={openActivity}>
              <HistoryIcon />
            </IconButton>
            <IconButton label="Settings" onPress={toAccount}>
              <GearIcon />
            </IconButton>
          </View>
        </LinearGradient>

        <View style={s.page}>
          {/* identity */}
          <Rise {...rise(0)} style={s.idRow}>
            <PressScale
              scaleTo={0.95}
              onPress={() => {
                hTap();
                toAccount();
              }}
              style={s.ava}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              {photo ? (
                <Image source={{ uri: photo }} style={s.avaImg} />
              ) : (
                <Text style={s.avaText}>{initial}</Text>
              )}
              <View style={s.pen}>
                <Svg
                  width={12}
                  height={12}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke={C.ink1}
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M10.5 2.5l3 3L5 14H2v-3z" />
                </Svg>
              </View>
            </PressScale>
          </Rise>

          <Rise {...rise(1)} style={{ gap: 4, marginTop: 14 }}>
            <Text style={s.name} numberOfLines={1}>
              {name}
            </Text>
            {handle ? <Text style={s.handle}>{handle}</Text> : null}
          </Rise>

          {profile ? (
            <Rise
              {...rise(2)}
              style={{ marginTop: 14, alignSelf: "flex-start" }}
            >
              <Chip variant="mint" label={profile.title.toUpperCase()} />
            </Rise>
          ) : null}

          <Rise {...rise(3)} style={s.meta}>
            {horizon ? <Meta icon="clock" text={`${horizon} horizon`} /> : null}
            <Meta
              icon="swap"
              text={`${tradeCount} ${tradeCount === 1 ? "trade" : "trades"}`}
            />
            {firstTx ? (
              <Meta
                icon="cal"
                text={`Since ${firstTx.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
              />
            ) : null}
          </Rise>
          <View style={s.hr} />

          {/* hero number + ranges */}
          <Rise {...rise(4)} style={s.heroRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <HeroMoney value={loading ? 0 : shownValue} />
              <Text style={s.delta}>
                <Text style={{ color: delta >= 0 ? C.mint : C.loss }}>
                  {delta >= 0 ? "+" : "−"}
                  {money(Math.abs(delta))}
                </Text>{" "}
                <Text style={s.deltaLbl}>{deltaLabel}</Text>
              </Text>
            </View>
            <View style={s.rg} accessibilityRole="tablist">
              {RANGES.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => {
                    if (r.key === range.key) return;
                    hSelect();
                    setRange(r);
                  }}
                  style={[s.rgBtn, r.key === range.key && s.rgOn]}
                  hitSlop={{ top: 6, bottom: 6 }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: r.key === range.key }}
                >
                  <Text
                    style={[s.rgText, r.key === range.key && { color: C.ink1 }]}
                  >
                    {r.key}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Rise>

          <Rise {...rise(5)} style={{ marginTop: 14 }}>
            <PortfolioChart
              points={points}
              onScrub={setScrubIdx}
              replayKey={range.key}
            />
            <Text style={s.chartNote}>BASED ON WHAT YOU HOLD NOW</Text>
          </Rise>

          {error ? (
            <Text style={[TYPE.sub, { color: C.loss, marginTop: 10 }]}>
              {error}
            </Text>
          ) : null}

          {/* cash */}
          <Rise {...rise(6)} style={s.cashRow}>
            <View style={s.cashIco}>
              <Text style={s.cashIcoText}>$</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.cashLbl}>Cash in wallet</Text>
              <Text style={s.cash}>{loading ? "…" : money(cash)}</Text>
            </View>
            <SqButton
              label="Add USDC"
              onPress={() =>
                sheet.open(<DepositFlow address={walletAddress} />, {
                  label: "Deposit",
                })
              }
            >
              <Svg
                width={20}
                height={20}
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.ink1}
                strokeWidth={2}
                strokeLinecap="round"
              >
                <Path d="M10 4v12M4 10h12" />
              </Svg>
            </SqButton>
            <SqButton label="More" onPress={openMore}>
              <Svg width={20} height={20} viewBox="0 0 20 20" fill={C.ink1}>
                <Circle cx="4.5" cy="10" r="1.6" />
                <Circle cx="10" cy="10" r="1.6" />
                <Circle cx="15.5" cy="10" r="1.6" />
              </Svg>
            </SqButton>
          </Rise>

          {/* positions header */}
          <Rise {...rise(7)} style={s.posHead}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.posTitle}>
                {tab === "open" ? "Positions" : "Recurring"}{" "}
                <Text style={{ color: C.ink3 }}>
                  ({tab === "open" ? positions.length : recurringBuys.length})
                </Text>
              </Text>
              <Text style={s.posSub}>
                {tab === "open"
                  ? `${money(tokensValue)} in positions`
                  : `${money(due30)} due in 30 days`}
              </Text>
            </View>
            <View style={s.oc} accessibilityRole="tablist">
              {(["open", "rec"] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => {
                    if (k !== tab) hSelect();
                    setTab(k);
                  }}
                  style={[s.ocBtn, tab === k && s.ocOn]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === k }}
                >
                  <Text style={[s.ocText, tab === k && { color: C.mint }]}>
                    {k === "open" ? "One-time" : "Recurring"}
                  </Text>
                  {tab === k ? <View style={s.ocDot} /> : null}
                </Pressable>
              ))}
            </View>
          </Rise>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.fchipsWrap}
            contentContainerStyle={s.fchips}
          >
            {CATS.map(([k, t]) => (
              <Pressable
                key={k}
                onPress={() => {
                  if (k !== cat) hSelect();
                  setCat(k);
                }}
                style={[s.fchip, cat === k && s.fchipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: cat === k }}
              >
                <Text style={[s.fchipText, cat === k && { color: C.ink1 }]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* rows — keyed by tab + filter so they cascade in on every switch */}
          <Animated.View
            key={`${tab}-${cat}`}
            entering={FadeIn.duration(160)}
            style={{ marginTop: 8 }}
          >
            {tab === "open" && cat === "index" ? (
              funds.length === 0 ? (
                <Text style={s.empty}>
                  No index funds yet. Find one under Collections on Home.
                </Text>
              ) : (
                funds.map((f, i) => {
                  const move = fundMoves.get(f.fundId) ?? null;
                  return (
                    <Rise key={f.fundId} delay={i * 45} duration={400}>
                      <PressScale
                        scaleTo={0.985}
                        onPress={() => {
                          hTap();
                          openFund(f.fundId);
                        }}
                        style={s.posRow}
                        accessibilityRole="button"
                        accessibilityLabel={`${f.fundName} index fund, ${money(f.value)}`}
                      >
                        <AssetAvatar symbol={f.fundName} size={48} radius={14} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text
                            style={[TYPE.ttl, { fontSize: 16 }]}
                            numberOfLines={1}
                          >
                            {f.fundName}
                          </Text>
                          <Text style={s.qty} numberOfLines={1}>
                            {f.legs.map((l) => l.symbol).join(" · ")}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <Text style={s.val}>{money(f.value)}</Text>
                          {move != null ? (
                            <Text
                              style={[
                                s.chg,
                                { color: move >= 0 ? C.mint : C.loss },
                              ]}
                            >
                              <Text style={s.tri}>
                                {move >= 0 ? "▲ " : "▼ "}
                              </Text>
                              {Math.abs(move).toFixed(2)}%
                            </Text>
                          ) : f.ret != null ? (
                            <Text
                              style={[
                                s.chg,
                                { color: f.ret >= 0 ? C.mint : C.loss },
                              ]}
                            >
                              {pct(f.ret)}
                            </Text>
                          ) : null}
                        </View>
                      </PressScale>
                    </Rise>
                  );
                })
              )
            ) : tab === "open" ? (
              shownPositions.length === 0 ? (
                <Text style={s.empty}>
                  {cat === "all"
                    ? "Nothing here yet. Find something to buy on Home."
                    : "You hold nothing in this category yet."}
                </Text>
              ) : (
                shownPositions.map((p, i) => (
                  <Rise key={p.mint} delay={i * 45} duration={400}>
                    <PressScale
                      scaleTo={0.985}
                      onPress={() => {
                        hTap();
                        openAsset(p.symbol, p.stockType);
                      }}
                      style={s.posRow}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.symbol}, ${money(p.value)}`}
                    >
                      <AssetAvatar
                        symbol={p.symbol}
                        imageUrl={p.imageUrl}
                        size={48}
                        radius={999}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={[TYPE.ttl, { fontSize: 16 }]}
                          numberOfLines={1}
                        >
                          {p.symbol}
                        </Text>
                        <Text style={s.qty}>
                          {p.balance.toLocaleString("en-US", {
                            maximumFractionDigits: 4,
                          })}{" "}
                          {p.symbol}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={s.val}>{money(p.value)}</Text>
                        {p.change != null ? (
                          <Text
                            style={[
                              s.chg,
                              { color: p.change >= 0 ? C.mint : C.loss },
                            ]}
                          >
                            <Text style={s.tri}>
                              {p.change >= 0 ? "▲ " : "▼ "}
                            </Text>
                            {Math.abs(p.change).toFixed(2)}%
                          </Text>
                        ) : null}
                      </View>
                    </PressScale>
                  </Rise>
                ))
              )
            ) : cat === "index" ? (
              <Text style={s.empty}>
                Index funds are one-time buys for now. Recurring buys work on
                single stocks and pre-IPOs.
              </Text>
            ) : shownRec.length === 0 ? (
              <Text style={s.empty}>
                {recurringBuys.length
                  ? "No recurring buys in this category."
                  : "No recurring buys yet. Open any stock or pre-IPO and choose Recurring to buy it on a schedule."}
              </Text>
            ) : (
              <>
                {shownRec.map((r, i) => (
                  <Rise key={r.id} delay={i * 45} duration={400}>
                    <PressScale
                      scaleTo={0.985}
                      onPress={() => {
                        hTap();
                        openAsset(r.stock.symbol, r.stock.stockType);
                      }}
                      style={[s.posRow, !r.isActive && { opacity: 0.55 }]}
                      accessibilityRole="button"
                    >
                      <AssetAvatar
                        symbol={r.stock.symbol}
                        imageUrl={r.stock.imageUrl}
                        size={48}
                        radius={999}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={[TYPE.ttl, { fontSize: 16 }]}
                          numberOfLines={1}
                        >
                          {r.stock.symbol}
                        </Text>
                        <Text style={[TYPE.sub, { fontSize: 12.5 }]}>
                          Every month ·{" "}
                          {r.isActive
                            ? `next ${dayDate(new Date(r.buyDate))}`
                            : "cancelled"}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 5 }}>
                        <Text style={s.val}>
                          {r.usdcAmount
                            ? money(Number(r.usdcAmount))
                            : `${r.stockAmount} ${r.stock.symbol}`}
                        </Text>
                        <View style={s.recStat}>
                          {r.isActive ? <View style={s.recDot} /> : null}
                          <Text
                            style={[
                              s.recStatText,
                              r.isActive && { color: C.mint },
                            ]}
                          >
                            {r.isActive ? "ACTIVE" : "CANCELLED"}
                          </Text>
                        </View>
                      </View>
                    </PressScale>
                  </Rise>
                ))}
                <Pressable
                  onPress={toOrders}
                  style={s.manage}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={s.manageText}>Manage recurring buys ›</Text>
                </Pressable>
              </>
            )}
          </Animated.View>

          <Text style={s.foot}>
            HELD AT {shortAddr(walletAddress).toUpperCase()} · SELF-CUSTODY
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------- pieces ----------

/** $1,240<.50> — cents dimmed (prototype .heroNum .c) */
function HeroMoney({ value }: { value: number }) {
  const [d, c] = money(value).split(".");
  return (
    <Text style={s.hero} accessibilityLiveRegion="polite">
      {d}
      <Text style={{ color: "#4A515C" }}>.{c}</Text>
    </Text>
  );
}

function SqButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <PressScale
      scaleTo={0.93}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={s.sq}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </PressScale>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: "clock" | "swap" | "cal";
  text: string;
}) {
  return (
    <View style={s.metaItem}>
      <Svg
        width={15}
        height={15}
        viewBox="0 0 20 20"
        fill="none"
        stroke={C.ink4}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon === "clock" ? (
          <>
            <Circle cx="10" cy="10" r="7" />
            <Path d="M10 6v4.3l2.8 1.7" />
          </>
        ) : icon === "swap" ? (
          <Path d="M4 7h11l-3-3M16 13H5l3 3" />
        ) : (
          <>
            <Rect x="3" y="4.5" width="14" height="12" rx="2" />
            <Path d="M3 8.5h14M7 3v3M13 3v3" />
          </>
        )}
      </Svg>
      <Text style={s.metaText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  cover: { position: "relative" },
  tools: { position: "absolute", right: 16, flexDirection: "row", gap: 10 },
  page: { paddingHorizontal: 20 },

  idRow: { marginTop: -38, flexDirection: "row" },
  ava: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: C.mint,
    borderWidth: 4,
    borderColor: C.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  avaImg: { width: 76, height: 76, borderRadius: 999 },
  avaText: {
    fontFamily: FONT.sans800,
    fontSize: 30,
    letterSpacing: em(30, -0.04),
    color: C.onMint,
  },
  pen: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: C.raised,
    borderWidth: 3,
    borderColor: C.ground,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: FONT.sans800,
    fontSize: 28,
    letterSpacing: em(28, -0.04),
    color: C.ink1,
  },
  handle: { fontFamily: FONT.sans400, fontSize: 15, color: C.ink3 },

  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 16,
    rowGap: 6,
    marginTop: 14,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: FONT.sans400, fontSize: 12.5, color: C.ink4 },
  hr: {
    height: 1,
    backgroundColor: C.hair,
    marginTop: 20,
    marginHorizontal: -20,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    rowGap: 12,
    marginTop: 20,
    gap: 12,
  },
  hero: {
    fontFamily: FONT.sans800,
    fontSize: 40,
    letterSpacing: em(40, -0.045),
    lineHeight: 42,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  delta: { fontFamily: FONT.sans600, fontSize: 14.5 },
  deltaLbl: { fontFamily: FONT.sans500, color: C.ink4 },
  rg: { flexDirection: "row", gap: 2 },
  rgBtn: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 9,
    justifyContent: "center",
  },
  rgOn: { backgroundColor: C.raised },
  rgText: { fontFamily: FONT.sans700, fontSize: 12.5, color: C.ink4 },
  chartNote: {
    marginTop: 6,
    textAlign: "right",
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.16),
    color: C.ink4,
  },

  cashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 22,
  },
  cashIco: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cashIcoText: { fontFamily: FONT.sans700, fontSize: 22, color: C.ink1 },
  cashLbl: { fontFamily: FONT.sans400, fontSize: 14, color: C.ink3 },
  cash: {
    fontFamily: FONT.sans800,
    fontSize: 22,
    letterSpacing: em(22, -0.03),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  sq: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "#232933",
    alignItems: "center",
    justifyContent: "center",
  },

  posHead: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    gap: 12,
  },
  posTitle: {
    fontFamily: FONT.sans800,
    fontSize: 20,
    letterSpacing: em(20, -0.03),
    color: C.ink1,
  },
  posSub: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink4 },
  oc: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.stroke,
  },
  ocBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ocOn: { backgroundColor: C.raised },
  ocText: { fontFamily: FONT.sans700, fontSize: 13, color: C.ink4 },
  ocDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.mint },

  fchipsWrap: { marginTop: 14, marginHorizontal: -20 },
  fchips: { gap: 8, paddingHorizontal: 20 },
  fchip: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.stroke,
    justifyContent: "center",
  },
  fchipOn: { backgroundColor: C.raised, borderColor: "#313844" },
  fchipText: { fontFamily: FONT.sans600, fontSize: 14, color: C.ink3 },

  posRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qty: { fontFamily: FONT.mono400, fontSize: 12, color: C.ink3 },
  val: {
    fontFamily: FONT.sans700,
    fontSize: 16,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  chg: {
    fontFamily: FONT.mono400,
    fontSize: 12.5,
    fontVariant: ["tabular-nums"],
  },
  tri: { fontSize: 9 },
  recStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  recDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.mint },
  recStatText: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.14),
    color: C.ink4,
  },
  manage: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    marginTop: 6,
  },
  manageText: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },

  empty: {
    fontFamily: FONT.sans400,
    fontSize: 13.5,
    lineHeight: 21,
    color: C.ink3,
    paddingVertical: 18,
  },
  foot: {
    marginTop: 22,
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.16),
    color: C.ink4,
  },
});
