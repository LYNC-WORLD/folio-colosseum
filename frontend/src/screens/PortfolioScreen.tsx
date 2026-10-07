import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useNavigation, useScrollToTop } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth, type OnboardingProfile } from "../context";
import { useWallet } from "../context/WalletContext";
import { useLeaderboard } from "../context/LeaderboardContext";
import { useIndexFunds, useStocks } from "../hooks";
import { useRecurringBuys } from "../hooks/useTrade";
import { useUserTransactions } from "../hooks/useUserRecords";
import { usePortfolioSeries } from "../hooks/usePortfolioSeries";
import { useCountUp } from "../hooks/useCountUp";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { toast as perpToast } from "../data/perpsStore";
import { getOnboardingProfile } from "../lib";
import type { TabParamList } from "../navigation/RootTabs";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE, em } from "../theme";
import { Chip, IconButton, PressScale, Rise } from "../components/ui";
import { GearIcon, HistoryIcon, ShareIcon } from "../components/Icons";
import { AssetAvatar } from "../components/AssetAvatar";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { useSplashDone } from "../components/SplashIntro";
import { TransferSheet } from "../components/TransferSheet";
import { PerpToast } from "../components/perps/PerpToast";
import { PortfolioChart } from "../components/folio/PortfolioChart";
import { ShareSheet } from "../components/ShareSheet";
import { WithdrawFlow } from "../components/WithdrawFlow";
import {
  ActivitySheet,
  DepositFlow,
  shortAddr,
} from "../components/folio/FolioSheets";
import {
  PerpPositionList,
  PerpSummaryLine,
  PerpsHeader,
} from "../components/PerpsPortfolio";
import { useFollowing } from "../lib/follows";
import { dayChange, money, pct } from "../lib/format";
import { fundPositions, useFundLots } from "../lib/fundHoldings";
import { toFund } from "../lib/indexFunds";
import { dayDate } from "../lib/trade";
import { hSelect, hTap } from "../lib/haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import type { ChartPeriod } from "../hooks";
import { usePerpPositions, type PerpCategory } from "../hooks/usePerpPositions";
import { useAccount, useAllPositions } from "../hooks/perps";
import { useSpotToPerpDeposit } from "../hooks/useSpotToPerpDeposit";
import { toTrades, usePortfolioPnl } from "../hooks/usePortfolioPnl";
import { Address } from "../services/hyperliquid/types";

type Nav = BottomTabNavigationProp<TabParamList, "Portfolio">;

// prototype ranges → chart periods
const RANGES: { key: string; period: ChartPeriod; label: string }[] = [
  { key: "24h", period: "1D", label: "24h" },
  { key: "7d", period: "1W", label: "7d" },
  { key: "30d", period: "1M", label: "30d" },
  { key: "All", period: "All", label: "all time" },
];

type Tab = "open" | "rec" | "perp";
const TABS: [Tab, string][] = [
  ["open", "One-time"],
  ["rec", "Recurring"],
  ["perp", "Perps"],
];

type Cat = "all" | "USStock" | "PreIPO" | "index";
const CATS: [Cat, string][] = [
  ["all", "All"],
  ["USStock", "Stocks"],
  ["PreIPO", "Pre-IPOs"],
  ["index", "Index funds"],
];

// Perps have no Pre-IPO market; commodities (gold, oil…) are perp-only.
type PerpCat = "all" | PerpCategory;
const PERP_CATS: [PerpCat, string][] = [
  ["all", "All"],
  ["stocks", "Stocks"],
  ["index", "Index funds"],
  ["commodities", "Commodities"],
];

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function PortfolioScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const splashDone = useSplashDone();
  const sheet = useSheet();
  const toast = useToast();
  const following = useFollowing();
  const perp = usePerpPositions();
  const walletBal = useWalletBalance();
  const bal = {
    perp: walletBal.perpAvailable,
    spot: walletBal.wallet?.usdc.balance ?? 0,
  };
  const {
    deposit,
    phase: depositPhase,
    amount: depositAmount,
    error: depositError,
    reset: resetDeposit,
  } = useSpotToPerpDeposit();
  const [xfer, setXfer] = useState(false);
  const [xferDir, setXferDir] = useState<"in" | "out">("in");

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { user, idToken } = useAuth();

  const allPos = useAllPositions(idToken);
  const perpMargin = allPos.data.reduce((t, p) => t + p.margin, 0);
  const perpPnl = allPos.data.reduce((t, p) => t + p.pnl, 0);
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

  // ---------- perp account + PnL ----------
  // TODO: set this to the Hyperliquid address you trade perps with (e.g. from usePerpsSession).
  // While it is null, the leaderboard /me numbers are used instead.
  const perpAddress: Address | null = null;
  const acct = useAccount(perpAddress);
  const { me } = useLeaderboard();

  const perpEquity = perpAddress
    ? acct.accountValue
    : me
      ? num(me.accountValue)
      : perp.equity;
  const perpNetDeposits =
    me && Number.isFinite(Number(me.netDepositsUsdc))
      ? Number(me.netDepositsUsdc)
      : null;
  const perpPositionsPnl = perpAddress
    ? acct.positions.reduce((t, p) => t + p.pnl, 0)
    : perp.pnl;

  const trades = useMemo(() => toTrades(txs.data?.data), [txs.data]);
  const pnl = usePortfolioPnl({
    tokens,
    trades,
    fundLots,
    walletAddress,
    perp: {
      accountValue: perpEquity,
      netDeposits: perpNetDeposits,
      positionsPnl: perpPositionsPnl,
    },
  });

  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  useEffect(() => {
    getOnboardingProfile().then(setProfile);
  }, []);

  // ---------- chart ----------
  const [range, setRange] = useState(RANGES[3]);
  const holdings = useMemo(
    () =>
      tokens
        .map((t) => {
          const price = Number(t.price);
          const balance = Number(t.balance);

          return {
            mint: t.mint,
            balance,
            price,
          };
        })
        .filter(
          (t) =>
            Number.isFinite(t.balance) &&
            Number.isFinite(t.price) &&
            t.price >= 0,
        ),
    [tokens],
  );

  const { points } = usePortfolioSeries(holdings, usdcValue, range.period);
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);

  // Total value = wallet + perp equity (same rule as the prototype's total).
  // The chart series is wallet-only, so perp equity is added on top as a flat offset.
  const liveTotal = useCountUp(usdValue + perpEquity);
  const shownValue =
    scrubIdx != null
      ? (points[scrubIdx]?.v ?? usdValue) + perpEquity
      : liveTotal;
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

  // All-time (not scrubbing) shows real total PnL: spot + realized + perps.
  // Shorter ranges keep the wallet-only chart delta (there is no perp history series).
  const allTime = range.key === "All" && scrubIdx == null;
  const heroDelta = allTime ? pnl.total : delta;
  const heroLabel = allTime
    ? `all-time P&L${pnl.untracked > 0 ? " · partial" : ""}`
    : deltaLabel;
  const heroPct = allTime && pnl.totalPct != null ? pnl.totalPct : null;

  const cash = useCountUp(usdcValue);

  // ---------- positions ----------
  const [tab, setTab] = useState<Tab>("open");
  const [cat, setCat] = useState<Cat>("all");
  const [perpCat, setPerpCat] = useState<PerpCat>("all");

  const moves = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const s of [...us.stocks, ...pre.stocks])
      m.set(s.tokenAddress, dayChange(s.price, s.marketOpenPrice));
    return m;
  }, [us.stocks, pre.stocks]);

  useEffect(() => {
    if (depositPhase === "done") {
      perpToast(`Moved ${money(depositAmount)} to perp`, "TRANSFER CONFIRMED");
      refresh(); // this screen's own cash/positions numbers, not just TradeScreen's
      resetDeposit();
    } else if (depositPhase === "error" && depositError) {
      perpToast("Transfer issue", depositError.toUpperCase());
      resetDeposit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositPhase]);

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

  // chips + active value depend on the tab (Perps has its own set)
  const chipList: [string, string][] = tab === "perp" ? PERP_CATS : CATS;
  const activeChip = tab === "perp" ? perpCat : cat;
  const pickChip = (k: string) => {
    if (k === activeChip) return;
    hSelect();
    if (tab === "perp") setPerpCat(k as PerpCat);
    else setCat(k as Cat);
  };

  // ---------- identity ----------
  const name = (user?.name ?? "").trim() || "You";
  const initial = name.charAt(0).toUpperCase();
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "";
  const photo = (user as { photo?: string | null } | null)?.photo ?? null;
  const tradeCount = txs.data?.data?.length ?? 0;
  // "US stocks · Pre-IPOs" (what the investor profile says they own)
  const owns = profile?.owns?.length ? profile.owns.join(" · ") : null;

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
  // Trade lives in HomeStack
  // const openTrade = (symbol?: string) =>
  //   nav.navigate("Home", {
  //     screen: "Trade",
  //     params: symbol ? { symbol } : undefined,
  //     initial: false,
  //   });
  const toAccount = () => nav.navigate("Profile");
  const toOrders = () =>
    (nav as any).navigate("Profile", {
      screen: "RecurringBuys",
      initial: false,
    });

  const openActivity = () =>
    sheet.open(<ActivitySheet />, { label: "Activity" });
  const openTransfer = () => {
    hTap();
    setXferDir("in");
    setXfer(true);
  };
  const openTransferOut = () => {
    // perp -> spot (used by Withdraw: "move it to spot first")
    sheet.close();
    setXferDir("out");
    setXfer(true);
  };
  const copyAddress = async () => {
    if (!walletAddress) return;
    sheet.close(); // close first: a toast fired under an open sheet stays hidden
    try {
      await Clipboard.setStringAsync(walletAddress);
      toast("Address copied", "SELF-CUSTODY WALLET");
    } catch {
      toast("Copy did not work", "SELECT IT BY HAND");
    }
  };
  const openWithdraw = () =>
    sheet.update(
      <WithdrawFlow
        spot={bal.spot}
        perp={bal.perp}
        onMoveToSpot={openTransferOut}
        onDone={() => {
          sheet.close();
          refresh();
        }}
      />,
    );

  const openShare = () =>
    sheet.open(
      <ShareSheet
        handle={handle || "@you"}
        initial={initial}
        chip={profile?.title ?? ""}
        refCode={(handle || "you").replace("@", "").toUpperCase()}
        holdings={holdings}
        usdcValue={usdcValue}
        positions={positions.map((p) => ({
          symbol: p.symbol,
          imageUrl: p.imageUrl,
          value: p.value,
          change: p.change,
        }))}
        perp={{ positions: perp.positions, pnl: pnl.perpPnl }}
      />,
      { label: "Share" },
    );

  const openMore = () =>
    sheet.open(
      <CashMenu
        spot={bal.spot}
        perp={bal.perp}
        address={walletAddress}
        onMove={() => {
          sheet.close();
          openTransfer();
        }}
        onWithdraw={openWithdraw}
        onCopy={copyAddress}
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
              acct.refresh();
            }}
            tintColor={C.mint}
            colors={[C.mint]}
            progressBackgroundColor={C.raised}
            progressViewOffset={insets.top}
          />
        }
      >
        <View style={[s.page, { paddingTop: insets.top + 12 }]}>
          {/* header: avatar · name · three round buttons */}
          <Rise {...rise(0)} style={s.head}>
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
            </PressScale>
            <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>
                {name}
              </Text>
              {handle ? <Text style={s.handle}>{handle}</Text> : null}
            </View>
            <View style={s.tools}>
              <IconButton label="Share your profile" onPress={openShare}>
                <ShareIcon />
              </IconButton>
              <IconButton label="Activity" onPress={openActivity}>
                <HistoryIcon />
              </IconButton>
              <IconButton label="Settings" onPress={toAccount}>
                <GearIcon />
              </IconButton>
            </View>
          </Rise>

          {/* chip · following · followers · owns · trades */}
          <Rise {...rise(1)} style={s.meta}>
            {profile ? (
              <Chip variant="mint" label={profile.title.toUpperCase()} />
            ) : null}
            <Text style={s.stat}>
              <Text style={s.statB}>{following.size}</Text> following
            </Text>
            <Text style={s.stat}>
              <Text style={s.statB}>0</Text> followers
            </Text>
            {owns ? <Meta icon="grid" text={owns} /> : null}
            <Meta
              icon="swap"
              text={`${tradeCount} ${tradeCount === 1 ? "trade" : "trades"}`}
            />
          </Rise>
          <View style={s.hr} />

          {/* hero number + ranges */}
          <Rise {...rise(4)} style={s.heroRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <HeroMoney value={loading ? 0 : shownValue} />
              <Text style={s.delta}>
                <Text style={{ color: heroDelta >= 0 ? C.mint : C.loss }}>
                  {heroDelta >= 0 ? "+" : "−"}
                  {money(Math.abs(heroDelta))}
                  {heroPct != null
                    ? ` (${heroPct >= 0 ? "+" : "−"}${Math.abs(heroPct).toFixed(1)}%)`
                    : ""}
                </Text>{" "}
                <Text style={s.deltaLbl}>{heroLabel}</Text>
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
            <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
              {/* label + Deposit + more */}
              <View style={s.cashTop}>
                <Text style={s.cashLbl} numberOfLines={1}>
                  Cash in wallet
                </Text>
                <PressScale
                  scaleTo={0.95}
                  onPress={() => {
                    hTap();
                    sheet.open(<DepositFlow address={walletAddress} />, {
                      label: "Deposit",
                    });
                  }}
                  style={s.dep}
                  accessibilityRole="button"
                  accessibilityLabel="Deposit"
                >
                  <Svg
                    width={15}
                    height={15}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke={C.onMint}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  >
                    <Path d="M10 4v12M4 10h12" />
                  </Svg>
                  <Text style={s.depText}>Deposit</Text>
                </PressScale>
                <SqButton label="More" onPress={openMore}>
                  <Svg width={18} height={18} viewBox="0 0 20 20" fill={C.ink1}>
                    <Circle cx="4.5" cy="10" r="1.6" />
                    <Circle cx="10" cy="10" r="1.6" />
                    <Circle cx="15.5" cy="10" r="1.6" />
                  </Svg>
                </SqButton>
              </View>

              {/* balance + refresh */}
              <View style={s.cashBal}>
                <Text style={s.cash} numberOfLines={1}>
                  {loading ? "…" : money(cash)}
                </Text>
                <PressScale
                  scaleTo={0.9}
                  onPress={() => {
                    hTap();
                    refresh();
                  }}
                  disabled={refreshing}
                  style={[s.rf, refreshing && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh balances"
                >
                  <Svg
                    width={16}
                    height={16}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke={C.ink3}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M16.2 8.2A6.5 6.5 0 0 0 4.4 6.5" />
                    <Path d="M4 3.5v3.3h3.3" />
                    <Path d="M3.8 11.8a6.5 6.5 0 0 0 11.8 1.7" />
                    <Path d="M16 16.5v-3.3h-3.3" />
                  </Svg>
                </PressScale>
              </View>

              <PerpSummaryLine
                equity={perpEquity}
                pnl={pnl.perpPnl}
                count={perp.positions.length}
              />
              {/* perp account balance + Transfer (opens the drawer) */}
              <PressScale
                scaleTo={0.97}
                onPress={openTransfer}
                style={s.perpLine}
                accessibilityRole="button"
                accessibilityLabel={`Perp account ${money(bal.perp)}. Transfer`}
              >
                <Text style={s.perpTxt}>Perp account {money(bal.perp)}</Text>
                <Text style={s.perpGo}>Transfer ›</Text>
              </PressScale>
            </View>
          </Rise>

          {/* positions header */}
          <Rise {...rise(7)} style={s.posHead}>
            <View style={s.posHeadText}>
              {tab === "perp" ? (
                <PerpsHeader
                  count={perp.positions.length}
                  margin={perp.margin}
                  pnl={pnl.perpPnl}
                />
              ) : (
                <View style={{ gap: 3 }}>
                  <Text style={s.posTitle}>
                    {tab === "open" ? "Positions" : "Recurring"}{" "}
                    <Text style={{ color: C.ink3 }}>
                      (
                      {tab === "open" ? positions.length : recurringBuys.length}
                      )
                    </Text>
                  </Text>
                  <Text style={s.posSub}>
                    {tab === "open"
                      ? `${money(tokensValue)} in positions`
                      : `${money(due30)} due in 30 days`}
                  </Text>
                </View>
              )}
            </View>
            <View style={s.oc} accessibilityRole="tablist">
              {TABS.map(([k, label]) => (
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
                    {label}
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
            {chipList.map(([k, t]) => (
              <Pressable
                key={k}
                onPress={() => pickChip(k)}
                style={[s.fchip, activeChip === k && s.fchipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: activeChip === k }}
              >
                <Text
                  style={[s.fchipText, activeChip === k && { color: C.ink1 }]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* rows — keyed by tab + filter so they cascade in on every switch */}
          <Animated.View
            key={`${tab}-${activeChip}`}
            entering={FadeIn.duration(160)}
            style={{ marginTop: 8 }}
          >
            {tab === "perp" ? (
              allPos.loading ? (
                <ActivityIndicator
                  color={C.ink3}
                  style={{ paddingVertical: 24 }}
                />
              ) : allPos.error && !allPos.data.length ? (
                <Pressable onPress={allPos.refetch} accessibilityRole="button">
                  <Text style={s.empty}>
                    Couldn't load perp positions. Tap to retry.
                  </Text>
                </Pressable>
              ) : (
                <PerpPositionList
                  positions={allPos.data}
                  category={perpCat}
                  onOpen={() => {}}
                  onOpenTrade={() => {}}
                />
              )
            ) : tab === "open" && cat === "index" ? (
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
                        <AssetAvatar
                          symbol={f.fundName}
                          size={48}
                          radius={14}
                        />
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
                shownPositions.map((p, i) => {
                  const tp = pnl.byMint.get(p.mint); // undefined = no cost history
                  return (
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
                          {tp ? (
                            <Text
                              style={[
                                s.chg,
                                { color: tp.pnl >= 0 ? C.mint : C.loss },
                              ]}
                            >
                              {tp.pnl >= 0 ? "+" : "−"}
                              {money(Math.abs(tp.pnl))}
                              {tp.pct != null ? ` · ${pct(tp.pct)}` : ""}
                            </Text>
                          ) : null}
                        </View>
                      </PressScale>
                    </Rise>
                  );
                })
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

      {/* TransferSheet fires its success toast through perpsStore, so PerpToast must be mounted here */}
      <PerpToast />

      {xfer ? (
        <TransferSheet
          dir={xferDir}
          onDeposit={deposit}
          onClose={() => setXfer(false)}
          onMoved={() => {
            setXfer(false);
            refresh(); // re-pull wallet balances after money moves
          }}
        />
      ) : null}
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

function Meta({ icon, text }: { icon: "grid" | "swap"; text: string }) {
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
        {icon === "grid" ? (
          <>
            <Rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.2" />
            <Rect x="11" y="3.5" width="5.5" height="5.5" rx="1.2" />
            <Rect x="3.5" y="11" width="5.5" height="5.5" rx="1.2" />
            <Rect x="11" y="11" width="5.5" height="5.5" rx="1.2" />
          </>
        ) : (
          <Path d="M4 7h11l-3-3M16 13H5l3 3" />
        )}
      </Svg>
      <Text style={s.metaText}>{text}</Text>
    </View>
  );
}

/** The ⋯ drawer: CASH — Move money · Withdraw · Copy address · Activity · Standing orders · Account */
function CashMenu({
  spot,
  perp,
  address,
  onMove,
  onWithdraw,
  onCopy,
  onActivity,
  onOrders,
  onAccount,
}: {
  spot: number;
  perp: number;
  address?: string | null;
  onMove: () => void;
  onWithdraw: () => void;
  onCopy: () => void;
  onActivity: () => void;
  onOrders: () => void;
  onAccount: () => void;
}) {
  const rows: [string, string, string, () => void][] = [
    [
      "move",
      "Move money",
      `Spot ${money(spot)} · Perp account ${money(perp)}`,
      onMove,
    ],
    ["wd", "Withdraw", "To a crypto wallet or your bank", onWithdraw],
    [
      "addr",
      "Copy wallet address",
      `${shortAddr(address!)} · self-custody`,
      onCopy,
    ],
    ["act", "Activity", "Every buy, sale and order", onActivity],
    ["rec", "Standing orders", "Recurring buys you have set up", onOrders],
    ["acc", "Account", "Profile, notifications, sign out", onAccount],
  ];
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.menuLbl}>CASH</Text>
      <View>
        {rows.map(([k, title, sub, fn], i) => (
          <PressScale
            key={k}
            scaleTo={0.985}
            onPress={() => {
              hTap();
              fn();
            }}
            style={[s.menuRow, i < rows.length - 1 && s.menuHair]}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${sub}`}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.menuTtl}>{title}</Text>
              <Text style={s.menuSub}>{sub}</Text>
            </View>
            <Text style={s.menuChev}>›</Text>
          </PressScale>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20 },

  head: { flexDirection: "row", alignItems: "center", gap: 14 },
  tools: { flexDirection: "row", gap: 6 },
  ava: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avaImg: { width: 64, height: 64, borderRadius: 999 },
  avaText: {
    fontFamily: FONT.sans800,
    fontSize: 26,
    letterSpacing: em(26, -0.04),
    color: C.onMint,
  },
  name: {
    fontFamily: FONT.sans800,
    fontSize: 21,
    letterSpacing: em(21, -0.035),
    color: C.ink1,
  },
  handle: { fontFamily: FONT.sans400, fontSize: 13, color: C.ink3 },

  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 16,
    rowGap: 10,
    marginTop: 16,
  },
  stat: { fontFamily: FONT.sans400, fontSize: 15, color: C.ink3 },
  statB: { fontFamily: FONT.sans800, color: C.ink1 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontFamily: FONT.sans400, fontSize: 14, color: C.ink3 },

  menuLbl: {
    fontFamily: FONT.mono400,
    fontSize: 11,
    letterSpacing: em(11, 0.28),
    color: C.mint,
    marginBottom: 6,
  },
  menuRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  menuHair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  menuTtl: { fontFamily: FONT.sans800, fontSize: 17, color: C.ink1 },
  menuSub: { fontFamily: FONT.sans400, fontSize: 14, color: C.ink3 },
  menuChev: { fontSize: 17, color: C.ink4 },
  hr: {
    height: 1,
    backgroundColor: C.hair,
    marginTop: 18,
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
  cashTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cashBal: { flexDirection: "row", alignItems: "center", gap: 6 },
  cashLbl: { flex: 1, fontFamily: FONT.sans400, fontSize: 14, color: C.ink3 },
  dep: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.mint,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  depText: { fontFamily: FONT.sans700, fontSize: 15, color: C.onMint },
  rf: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cash: {
    flex: 1,
    fontFamily: FONT.sans800,
    fontSize: 26,
    letterSpacing: em(22, -0.03),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  perpLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "flex-start",
    minHeight: 30,
  },
  perpTxt: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  perpGo: { fontFamily: FONT.sans700, fontSize: 12.5, color: C.mint },
  sq: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "#232933",
    alignItems: "center",
    justifyContent: "center",
  },

  // wraps so the three-way switch drops under the title on narrow phones
  posHead: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 30,
    columnGap: 12,
    rowGap: 12,
  },
  posHeadText: { flexGrow: 1, flexShrink: 1, minWidth: 130 },
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
    paddingVertical: 6,
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
