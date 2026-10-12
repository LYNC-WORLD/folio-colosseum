// src/screens/HomeScreen.tsx — prototype #s-home
//
//   [mark] Folio                          (S)
//   [ search ……………………… ]  Cancel          ← sticks to the top while scrolling
//   ● AVAILABLE ANYWHERE   USDC $440        ← balance counts up
//   POPULAR NOW     three cards
//   COLLECTIONS     US stocks / Pre-IPOs / Index funds
//   TRENDING        top movers today
//
// Tapping search swaps the page for RECENT + BROWSE BY THEME, then live
// results grouped by collection as you type.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import {
  CompositeNavigationProp,
  useNavigation,
  useScrollToTop,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useIndexFunds, useStocks, useWalletBalance } from "../hooks";
import { useCountUp } from "../hooks/useCountUp";
import { useAuth } from "../context";
import type { HomeStackParamList } from "../navigation/HomeStack"; // use the file where TabParamList actually lives
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE, em } from "../theme";
import {
  Badge,
  Chip,
  Mark,
  PressScale,
  Rise,
  Skeleton,
} from "../components/ui";
import { AssetRow } from "../components/AssetRow";
import { SearchBar } from "../components/SearchBar";
import { useSplashDone } from "../components/SplashIntro";
import {
  COLLECTIONS,
  THEMES,
  searchAssets,
  toAsset,
  type Asset,
} from "../lib/assets";
import { searchFunds, toFund, type Fund } from "../lib/indexFunds";
import { loadRecents, saveRecents, withRecent } from "../lib/recentSearches";
import { money, pct } from "../lib/format";
import { hTap } from "../lib/haptics";
import { Dimensions } from "react-native";
import { PerpMarket, usePerpMarkets } from "../data/perps";
import { PerpStrip } from "../components/PerpStrip";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { TabParamList } from "../navigation/types";

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;
type Mode = "home" | "recent" | "results";

const GRID_GAP = 10;
const GRID_PADDING = 20; // matches s.body paddingHorizontal
const CARD_WIDTH =
  (Dimensions.get("window").width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const splashDone = useSplashDone();
  const bottom = useTabBarSpace();

  const perps = usePerpMarkets(["NVDA", "ORCL", "TSLA"]);

  const openPerp = (m: PerpMarket) => {
    nav.getParent<BottomTabNavigationProp<TabParamList>>()?.navigate("Trade", {
      symbol: m.symbol,
    });
  };

  // console.log(
  //   "route names:",
  //   nav.getState().routeNames,
  //   "parent:",
  //   nav.getParent()?.getState().routeNames,
  //   "grandparent:",
  //   nav.getParent()?.getParent()?.getState().routeNames,
  // );

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const us = useStocks("us-stock");
  const pre = useStocks("pre-ipo");
  const idx = useIndexFunds();
  const {
    wallet,
    loading: walletLoading,
    error: walletError,
  } = useWalletBalance();
  const usdc = wallet ? wallet.usdc.balance * Number(wallet.usdc.price) : 0;
  const shownUsdc = useCountUp(usdc);

  const stocks = useMemo(
    () => us.stocks.map((s) => toAsset(s, "us-stock")),
    [us.stocks],
  );
  const preIpos = useMemo(
    () => pre.stocks.map((s) => toAsset(s, "pre-ipo")),
    [pre.stocks],
  );
  const all = useMemo(() => [...stocks, ...preIpos], [stocks, preIpos]);
  const funds = useMemo(() => idx.funds.map(toFund), [idx.funds]);

  // ---------- search ----------
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  useEffect(() => {
    loadRecents().then(setRecents);
  }, []);

  const hits = useMemo(() => searchAssets(all, query), [all, query]);
  const fundHits = useMemo(() => searchFunds(funds, query), [funds, query]);
  const mode: Mode =
    !searching && !query ? "home" : !query.trim() ? "recent" : "results";

  const remember = (q: string) => {
    const next = withRecent(recents, q);
    setRecents(next);
    saveRecents(next);
  };
  const exitSearch = () => {
    setSearching(false);
    setQuery("");
    inputRef.current?.blur();
  };
  const fill = (q: string) => {
    setQuery(q);
    setSearching(true);
    inputRef.current?.focus();
  };
  const openAsset = (a: Asset) => {
    if (query.trim()) remember(query);
    nav.navigate("StockDetail", { symbol: a.symbol, category: a.category });
    // prototype resets search when you come back to Home; do it once the push has covered it
    if (searching) setTimeout(exitSearch, 450);
  };
  const openFund = (f: Fund) => {
    if (query.trim()) remember(query);
    nav.navigate("IndexFundDetail", { id: f.id });
    if (searching) setTimeout(exitSearch, 450);
  };

  // ---------- home content ----------
  const popular = [stocks[0], stocks[1], preIpos[0]].filter(Boolean) as Asset[];
  const trending = useMemo(() => {
    const withMove = stocks.filter((a) => a.change != null);
    if (withMove.length >= 3)
      return [...withMove].sort((a, b) => b.change! - a.change!).slice(0, 3);
    return stocks.slice(2, 5);
  }, [stocks]);

  const firstInitial = (user?.name ?? "").trim().charAt(0).toUpperCase() || "·";
  const loading = us.loading || pre.loading;
  const refreshing = us.refreshing || pre.refreshing || idx.refreshing;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.page, { paddingBottom: bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              us.refresh();
              pre.refresh();
              idx.refresh();
            }}
            tintColor={C.mint}
            colors={[C.mint]}
            progressBackgroundColor={C.raised}
          />
        }
      >
        <View style={s.brand}>
          <Mark height={32} />
          <Text style={s.word}>folio</Text>
          <Pressable
            onPress={() => {
              hTap();
              nav.getParent()?.navigate("Profile" as never);
            }}
            style={s.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel="Your account"
          >
            <View style={s.avatar}>
              <Text style={s.avatarText}>{firstInitial}</Text>
            </View>
          </Pressable>
        </View>

        <View style={s.sticky}>
          <SearchBar
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            active={searching}
            onFocus={() => setSearching(true)}
            onCancel={exitSearch}
            onClear={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            onSubmit={() =>
              hits[0]
                ? openAsset(hits[0])
                : fundHits[0] && openFund(fundHits[0])
            }
          />
          <LinearGradient
            pointerEvents="none"
            colors={[C.ground, "rgba(10,11,14,0)"]}
            style={s.stickyFade}
          />
        </View>

        {/* 2 — body: one of three modes, crossfading */}
        <Animated.View
          key={mode}
          entering={FadeIn.duration(220)}
          style={s.body}
        >
          {mode === "home" ? (
            <>
              <Rise when={splashDone} duration={460}>
                <View style={s.chips}>
                  {walletLoading ? (
                    <Skeleton width={150} height={34} radius={999} />
                  ) : (
                    <PressScale
                      scaleTo={0.96}
                      onPress={() => {
                        hTap();
                        nav
                          .getParent<BottomTabNavigationProp<TabParamList>>()
                          ?.navigate("Portfolio");
                      }}
                      style={s.balChip}
                      accessibilityRole="button"
                      accessibilityLabel={`USDC wallet, ${walletError ? "unavailable" : money(usdc)}. Open Folio`}
                    >
                      <Text style={s.balText}>
                        USDC WALLET{" "}
                        <Text style={s.balAmt}>
                          {walletError ? "—" : money(shownUsdc)}
                        </Text>
                      </Text>
                    </PressScale>
                  )}
                </View>
              </Rise>

              <Rise
                when={splashDone}
                delay={55}
                duration={460}
                style={s.section}
              >
                <Text style={TYPE.lbl}>POPULAR NOW</Text>
                <View style={s.popGrid}>
                  {loading && !popular.length
                    ? [0, 1, 2].map((i) => (
                        <Skeleton
                          key={i}
                          height={100}
                          radius={16}
                          style={s.popCell}
                        />
                      ))
                    : popular.map((a) => (
                        <PopularCard
                          key={a.symbol + a.category}
                          a={a}
                          onPress={() => openAsset(a)}
                        />
                      ))}
                </View>
                {us.error ? (
                  <ErrorLine text={us.error} onRetry={us.reload} />
                ) : null}
              </Rise>

              <Rise
                when={splashDone}
                delay={110}
                duration={460}
                style={s.section}
              >
                <View style={s.recentHead}>
                  <Text style={[TYPE.lbl, { flex: 1 }]}>
                    PERPS · LONG OR SHORT
                  </Text>
                  <Pressable
                    onPress={() => nav.navigate("PerpMarkets")}
                    hitSlop={10}
                    accessibilityRole="button"
                  >
                    <Text style={s.clearAll}>All markets ›</Text>
                  </Pressable>
                </View>
                <PerpStrip markets={perps.markets} onPress={openPerp} />
              </Rise>

              <Rise
                when={splashDone}
                delay={110}
                duration={460}
                style={s.section}
              >
                <Text style={TYPE.lbl}>COLLECTIONS</Text>
                <View style={s.collList}>
                  <CollectionRow
                    icon="stocks"
                    title={COLLECTIONS["us-stock"].title}
                    sub={`${COLLECTIONS["us-stock"].blurb.split(".")[0]} · ${us.loading ? "…" : stocks.length + " " + COLLECTIONS["us-stock"].countWord}`}
                    onPress={() => nav.navigate("Stocks")}
                  />
                  <CollectionRow
                    icon="preipo"
                    title={COLLECTIONS["pre-ipo"].title}
                    sub={`${COLLECTIONS["pre-ipo"].blurb.split(".")[0]} · ${pre.loading ? "…" : preIpos.length + " " + COLLECTIONS["pre-ipo"].countWord}`}
                    badge="NEW"
                    onPress={() => nav.navigate("PreIPO")}
                  />
                  <CollectionRow
                    icon="index"
                    title={COLLECTIONS["index-fund"].title}
                    sub={`${COLLECTIONS["index-fund"].blurb.split(".")[0]} · ${idx.loading ? "…" : funds.length + " " + COLLECTIONS["index-fund"].countWord}`}
                    onPress={() => nav.navigate("IndexFunds")}
                  />
                </View>
              </Rise>

              <Rise
                when={splashDone}
                delay={165}
                duration={460}
                style={s.section}
              >
                <Text style={TYPE.lbl}>TRENDING</Text>
                <View>
                  {loading && !trending.length
                    ? [0, 1, 2].map((i) => (
                        <Skeleton
                          key={i}
                          height={22}
                          style={{ marginVertical: 16 }}
                        />
                      ))
                    : trending.map((a, i) => (
                        <TrendRow
                          key={a.symbol}
                          a={a}
                          last={i === trending.length - 1}
                          onPress={() => openAsset(a)}
                        />
                      ))}
                </View>
              </Rise>
            </>
          ) : mode === "recent" ? (
            <View style={s.section}>
              <View style={s.recentHead}>
                <Text style={[TYPE.lbl, { flex: 1 }]}>RECENT</Text>
                {recents.length ? (
                  <Pressable
                    onPress={() => {
                      setRecents([]);
                      saveRecents([]);
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                  >
                    <Text style={s.clearAll}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
              {recents.length ? (
                <View style={s.chipWrap}>
                  {recents.map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      icon={<ClockIcon />}
                      onPress={() => fill(r)}
                    />
                  ))}
                </View>
              ) : (
                <Text style={TYPE.sub}>
                  Nothing yet. Search a ticker, a company or a theme.
                </Text>
              )}
              <Text style={[TYPE.lbl, { marginTop: 8 }]}>BROWSE BY THEME</Text>
              <View style={s.chipWrap}>
                {Object.keys(THEMES).map((t) => (
                  <Chip key={t} label={t} onPress={() => fill(t)} />
                ))}
              </View>
            </View>
          ) : (
            <Results
              query={query}
              hits={hits}
              fundHits={fundHits}
              loading={loading}
              onOpen={openAsset}
              onOpenFund={openFund}
              onFill={fill}
              suggestions={all}
            />
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
function truncateName(name: string) {
  return name.length > 10 ? `${name.slice(0, 10)}...` : name;
}

// ---------- pieces ----------

function PopularCard({ a, onPress }: { a: Asset; onPress: () => void }) {
  return (
    <PressScale
      scaleTo={0.96}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={[s.popCard, s.popCell]}
      accessibilityRole="button"
      accessibilityLabel={`${a.name}${a.change != null ? `, ${pct(a.change)} today` : ""}`}
    >
      <View style={{ width: "100%" }}>
        <Text style={s.popLabel} numberOfLines={1} ellipsizeMode="tail">
          {a.kind === "Pre-IPO" ? "PRE-IPO" : a.symbol}
        </Text>
        <Text style={s.popName} numberOfLines={1} ellipsizeMode="tail">
          {a.name}
        </Text>
        {a.change != null ? (
          <Text
            style={[s.fig, { color: a.change >= 0 ? C.mint : C.loss }]}
            numberOfLines={1}
          >
            {pct(a.change)}
          </Text>
        ) : (
          <Text style={[s.fig, { color: C.ink2 }]} numberOfLines={1}>
            {money(a.price)}
          </Text>
        )}
      </View>
    </PressScale>
  );
}

const COLL_ICONS: Record<string, string> = {
  stocks: "M3 16V9M8.3 16V4M13.7 16v-5M19 16V7",
  preipo: "M5 15 15 5M15 5H8M15 5v7",
  index:
    "M4.7 3.5h3.1a1.2 1.2 0 0 1 1.2 1.2v3.1a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2V4.7a1.2 1.2 0 0 1 1.2-1.2Z M12.2 3.5h3.1a1.2 1.2 0 0 1 1.2 1.2v3.1a1.2 1.2 0 0 1-1.2 1.2H12.2a1.2 1.2 0 0 1-1.2-1.2V4.7a1.2 1.2 0 0 1 1.2-1.2Z M4.7 11h3.1a1.2 1.2 0 0 1 1.2 1.2v3.1a1.2 1.2 0 0 1-1.2 1.2H4.7a1.2 1.2 0 0 1-1.2-1.2V12.2a1.2 1.2 0 0 1 1.2-1.2Z M12.2 11h3.1a1.2 1.2 0 0 1 1.2 1.2v3.1a1.2 1.2 0 0 1-1.2 1.2H12.2a1.2 1.2 0 0 1-1.2-1.2V12.2a1.2 1.2 0 0 1 1.2-1.2Z",
};

function CollectionRow({
  icon,
  title,
  sub,
  badge,
  onPress,
}: {
  icon: keyof typeof COLL_ICONS;
  title: string;
  sub: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={s.collRow}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={s.collIcon}>
        <Svg
          width={17}
          height={17}
          viewBox="0 0 20 20"
          fill="none"
          stroke={C.mint}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d={COLL_ICONS[icon]} />
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={TYPE.ttl}>{title}</Text>
        <Text style={TYPE.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {badge ? (
        <Badge label={badge} variant="solid" />
      ) : (
        <Text style={s.chev}>›</Text>
      )}
    </PressScale>
  );
}

function TrendRow({
  a,
  last,
  onPress,
}: {
  a: Asset;
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
      style={[s.trendRow, !last && s.hair]}
      accessibilityRole="button"
    >
      <Text style={[TYPE.ttl, s.trendName]} numberOfLines={1}>
        {a.symbol === a.name
          ? `${a.name} · ${a.kind}`
          : `${a.symbol} · ${a.name}`}
      </Text>
      {a.change != null ? (
        <Text style={[s.fig, { color: a.change >= 0 ? C.mint : C.loss }]}>
          {pct(a.change)}
        </Text>
      ) : (
        <Text style={[s.fig, { color: C.ink2 }]}>{money(a.price)}</Text>
      )}
    </PressScale>
  );
}

function Results({
  query,
  hits,
  fundHits,
  loading,
  onOpen,
  onOpenFund,
  onFill,
  suggestions,
}: {
  query: string;
  hits: Asset[];
  fundHits: Fund[];
  loading: boolean;
  onOpen: (a: Asset) => void;
  onOpenFund: (f: Fund) => void;
  onFill: (q: string) => void;
  suggestions: Asset[];
}) {
  if (loading && !hits.length && !fundHits.length) {
    return (
      <View style={{ gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={46} radius={12} />
        ))}
      </View>
    );
  }

  if (!hits.length && !fundHits.length) {
    const ideas = [
      suggestions.find((a) => a.kind === "Stock")?.symbol,
      suggestions.find((a) => a.kind === "Pre-IPO")?.name,
      "AI",
    ].filter(Boolean) as string[];
    return (
      <Rise duration={380} style={s.empty}>
        <Text style={[TYPE.h2, { fontSize: 20 }]}>
          No match for “{query.trim()}”
        </Text>
        <Text style={TYPE.body}>
          Try a ticker, a company name, or a theme like AI.
        </Text>
        <View style={s.chipWrap}>
          {ideas.map((t) => (
            <Chip key={t} label={t} onPress={() => onFill(t)} />
          ))}
        </View>
      </Rise>
    );
  }

  // group by collection, keep ranking order inside each group
  const groups: [string, Asset[]][] = [];
  for (const a of hits) {
    const title = COLLECTIONS[a.category].title;
    const g = groups.find(([t]) => t === title);
    if (g) g[1].push(a);
    else groups.push([title, [a]]);
  }

  let i = 0;
  return (
    <View>
      {groups.map(([title, list], gi) => (
        <View key={title} style={gi ? { marginTop: 20 } : undefined}>
          <Text style={[TYPE.lbl, { marginBottom: 4 }]}>
            {title.toUpperCase()} · {list.length}
          </Text>
          {list.map((a, j) => {
            const delay = Math.min(i++, 10) * 40;
            return (
              // keyed by query so rows re-cascade as you type
              <Rise
                key={`${query}-${a.category}-${a.symbol}`}
                delay={delay}
                duration={400}
              >
                <AssetRow
                  symbol={a.symbol}
                  name={a.name}
                  price={a.price}
                  imageUrl={a.imageUrl}
                  change={a.change}
                  kind={a.kind}
                  last={j === list.length - 1}
                  onPress={() => onOpen(a)}
                />
              </Rise>
            );
          })}
        </View>
      ))}
      {fundHits.length ? (
        <View style={groups.length ? { marginTop: 20 } : undefined}>
          <Text style={[TYPE.lbl, { marginBottom: 4 }]}>
            INDEX FUNDS · {fundHits.length}
          </Text>
          {fundHits.map((f, j) => (
            <Rise
              key={`${query}-fund-${f.id}`}
              delay={Math.min(i++, 10) * 40}
              duration={400}
            >
              <AssetRow
                symbol={f.name}
                name={f.name}
                price={f.price}
                imageUrl=""
                change={f.change}
                kind={`Index fund · ${f.holdings.length} stocks`}
                last={j === fundHits.length - 1}
                onPress={() => onOpenFund(f)}
              />
            </Rise>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ErrorLine({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <View style={s.errorRow}>
      <Text style={[TYPE.sub, { color: C.loss, flex: 1 }]} numberOfLines={2}>
        {text}
      </Text>
      <Chip label="Retry" onPress={onRetry} />
    </View>
  );
}

function ClockIcon() {
  return (
    <Svg
      width={12}
      height={12}
      viewBox="0 0 20 20"
      fill="none"
      stroke={C.ink2}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="10" cy="10" r="7" />
      <Path d="M10 6v4.3l2.8 1.7" />
    </Svg>
  );
}

const s = StyleSheet.create({
  balChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  balText: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: em(10, 0.1),
    color: C.ink2,
  },
  balAmt: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    letterSpacing: 0,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 18 },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  word: {
    flex: 1,
    fontFamily: FONT.sans800,
    fontSize: 19,
    letterSpacing: em(19, -0.035),
    color: C.ink1,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    marginRight: -6,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#232833",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONT.sans800, fontSize: 13, color: "#D6DAE0" },

  sticky: { backgroundColor: C.ground, paddingHorizontal: 20, paddingTop: 8 },
  stickyFade: { height: 18, marginHorizontal: -20 },

  body: { paddingHorizontal: 20, gap: 24 },
  section: { gap: 12 },

  chips: { flexDirection: "row", gap: 8, alignItems: "center" },
  // balChip: {
  //   height: 34,
  //   paddingHorizontal: 14,
  //   borderRadius: 999,
  //   backgroundColor: C.surface,
  //   justifyContent: "center",
  // },
  // balText: {
  //   fontFamily: FONT.mono400,
  //   fontSize: 10,
  //   letterSpacing: em(10, 0.1),
  //   color: C.ink2,
  //   fontVariant: ["tabular-nums"],
  // },

  popGrid: {
    flexDirection: "row",
    gap: 10,
  },
  popCell: {
    width: CARD_WIDTH, // fixed, not flex — guarantees equal + no wrap
  },
  popCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  popLabel: { fontFamily: FONT.mono400, fontSize: 11, color: C.ink3 },
  popName: {
    fontFamily: FONT.sans800,
    fontSize: 16,
    letterSpacing: em(16, -0.03),
    color: C.ink1,
  },
  fig: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },

  collList: { gap: 8 },
  collRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  collIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#20252F",
    alignItems: "center",
    justifyContent: "center",
  },
  chev: { fontSize: 17, color: C.ink4 },

  trendRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trendName: { flex: 1, fontFamily: FONT.sans600 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },

  recentHead: { flexDirection: "row", alignItems: "center" },
  clearAll: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.mint },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  empty: { gap: 14, paddingVertical: 22, alignItems: "flex-start" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
