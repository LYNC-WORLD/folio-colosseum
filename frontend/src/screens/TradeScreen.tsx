import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
  useNavigation,
  useRoute,
  useScrollToTop,
} from "@react-navigation/native";

import { TAB_BAR_HEIGHT, useTabBarSpace } from "../navigation/TabBar";
import { hTap } from "../lib/haptics";
import {
  MarketPickerSheet,
  MarketStatusSheet,
  UnlockSheet,
} from "../components/PerpSheets";
import { AMBER, Btn, Kv, ON_MINT, ON_SHORT, Tag } from "../components/PerpUi";
import { perpLabel } from "../data/perps";
import { OrderBook } from "../components/perps/OrderBook";
import { PerpToast } from "../components/perps/PerpToast";
import { LivePositionSheet } from "../components/perps/LivePositionSheet";
import { StyleSheet } from "react-native";
import { C, FONT } from "../theme";
import {
  TAKER,
  fmtPx,
  fundLeft,
  marketOf,
  mktOpen,
  sMoney,
  sPct,
  sideTxt,
  toast,
} from "../data/perpsStore";
import { ChartStage } from "../components/Perpchart";
import { OrderTicketSheet } from "../components/Orderticketsheet";
import {
  livePnl,
  liveRoe,
  useAccount,
  useLiveMarket,
  useMarkets,
  usePerpsOnboarding,
  usePerpsSession,
  useSocketStatus,
  useTradeActions,
} from "../hooks/perps";
import { errMsg } from "../services/hyperliquid/format";

type PTab = "pos" | "ord" | "book" | "info";
type SheetState =
  | null
  | { t: "market" }
  | { t: "status" }
  | { t: "unlock"; side: 1 | -1 }
  | { t: "ticket"; side: 1 | -1 }
  | { t: "position"; id: string };

const DEFAULT_LEV = 10;
const tone = (n: number) => (n >= 0 ? C.mint : C.loss);

/** Mock metadata (name, category, logo) if this symbol exists in data/perps; never throws. */
function metaOf(sym: string) {
  try {
    return marketOf(sym) ?? null;
  } catch {
    return null;
  }
}
const labelOf = (sym: string) => {
  const m = metaOf(sym);
  try {
    return m ? perpLabel(m) : sym;
  } catch {
    return sym;
  }
};
const logoTxt = (sym: string) => sym.replace(/[^A-Z0-9]/g, "").slice(0, 3);

export function TradeScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const paramSym = (route.params as { symbol?: string } | undefined)?.symbol;
  const [sym, setSym] = useState(paramSym ?? "NVDA");
  useEffect(() => {
    if (paramSym) setSym(paramSym);
  }, [paramSym]);

  // ---- live data
  const session = usePerpsSession();
  const markets = useMarkets();
  const live = useLiveMarket(sym);
  const acct = useAccount(session.address);
  const actions = useTradeActions(session.idToken);
  const onboarding = usePerpsOnboarding(session);
  const socket = useSocketStatus();

  const [tab, setTab] = useState<PTab>("pos");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [locked, setLocked] = useState(false); // freezes scroll while the chart crosshair is held
  const [chartY, setChartY] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000); // funding countdown
    return () => clearInterval(i);
  }, []);

  const meta = metaOf(sym);
  const label = labelOf(sym);
  const category: string = meta?.category ?? "stocks";
  const name: string = meta?.name ?? sym;
  const open = meta ? mktOpen(meta) : true;
  const listed = !!live.market;
  const notListed = !markets.loading && !markets.error && !listed;

  // price flash on each tick
  const [flash, setFlash] = useState<null | "up" | "dn">(null);
  useEffect(() => {
    if (!live.mark || live.mark === live.prevMark) return;
    setFlash(live.mark > live.prevMark ? "up" : "dn");
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [live.mark]); // eslint-disable-line

  const markOf = (coin: string, fallback: number) =>
    coin === live.coin ? live.mark : (markets.byCoin[coin]?.mid ?? fallback);

  const openTicket = (side: 1 | -1) => {
    if (!listed)
      return toast(
        "Not tradable",
        `${label.toUpperCase()} ISN'T LISTED ON HYPERLIQUID`,
      );
    if (!session.address || !session.idToken)
      return toast("Sign in to trade", "CONNECT YOUR WALLET FIRST");
    setSheet(onboarding.ready ? { t: "ticket", side } : { t: "unlock", side });
  };
  const toChart = () =>
    scrollRef.current?.scrollTo({
      y: Math.max(0, chartY - 60),
      animated: true,
    });
  const goSpot = () => {
    if (category === "stocks")
      (nav as any).navigate("Home", {
        screen: "StockDetail",
        params: { symbol: meta?.symbol ?? sym, category: "us-stock" },
      });
    else
      toast(
        "No spot page yet",
        label.toUpperCase() + " IS PERP-ONLY IN THIS BUILD",
      );
  };

  const fr = live.fundingPct;
  const stats: [string, string, "up" | "down" | null][] = [
    ["MARK", fmtPx(live.mark), null],
    ["ORACLE", fmtPx(live.oracle), null],
    [
      "FUNDING / 1H",
      `${fr >= 0 ? "+" : "−"}${Math.abs(fr).toFixed(4)}%`,
      fr >= 0 ? "up" : "down",
    ],
    ["NEXT FUNDING", fundLeft(), null],
    ["24H VOLUME", `$${(live.vol24Usd / 1e6).toFixed(1)}M`, null],
    ["OPEN INTEREST", `$${(live.oiUsd / 1e6).toFixed(1)}M`, null],
  ];

  const positions = acct.positions
    .slice()
    .sort((a, b) => Number(b.sym === sym) - Number(a.sym === sym));
  const sheetPos =
    sheet?.t === "position"
      ? acct.positions.find((p) => p.id === sheet.id)
      : undefined;

  const cancel = (o: (typeof acct.orders)[number]) =>
    actions
      .cancelOrder(o)
      .then(() =>
        toast(
          "Order cancelled",
          `${labelOf(o.sym).toUpperCase()} · ${fmtPx(o.px)}`,
        ),
      )
      .catch((e) => toast("Couldn't cancel", errMsg(e).toUpperCase()));

  return (
    <SafeAreaView style={tradeStyles.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!locked}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: bottom + 84 }}
      >
        {/* header */}
        <View style={tradeStyles.head}>
          <Pressable
            style={tradeStyles.mktBtn}
            onPress={() => {
              hTap();
              setSheet({ t: "market" });
            }}
            accessibilityRole="button"
            accessibilityLabel="Change market"
          >
            <View style={tradeStyles.logo}>
              <Text style={tradeStyles.logoT}>
                {logoTxt(meta?.symbol ?? sym)}
              </Text>
            </View>
            <View style={{ gap: 3, flexShrink: 1 }}>
              <View style={tradeStyles.rowC}>
                <Text style={tradeStyles.sym}>{label}</Text>
                <Tag label="PERP" />
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke={C.ink3}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="m4 6 4 4 4-4" />
                </Svg>
              </View>
              <Text style={tradeStyles.sub} numberOfLines={1}>
                {name}
                {listed ? ` · up to ${live.maxLeverage}x` : ""}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={tradeStyles.spot}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => {
              hTap();
              goSpot();
            }}
            accessibilityRole="button"
          >
            <Text style={tradeStyles.spotT}>Spot ›</Text>
          </Pressable>
        </View>

        {/* price */}
        {markets.error && !listed ? (
          <View style={[tradeStyles.empty, { paddingHorizontal: 20 }]}>
            <Text style={tradeStyles.ttl}>Prices aren't loading</Text>
            <Text style={tradeStyles.emptyT}>{markets.error}</Text>
            <Btn
              kind="ghost"
              small
              label="Try again"
              onPress={() => markets.refresh()}
            />
          </View>
        ) : notListed ? (
          <View style={[tradeStyles.empty, { paddingHorizontal: 20 }]}>
            <Text style={tradeStyles.ttl}>
              {label} isn't on Hyperliquid yet
            </Text>
            <Text style={tradeStyles.emptyT}>
              Pick another market from the list above.
            </Text>
          </View>
        ) : !live.ready ? (
          <View style={[tradeStyles.px, { height: 38 }]}>
            <ActivityIndicator color={C.ink3} />
          </View>
        ) : (
          <View style={tradeStyles.px}>
            <Text
              style={[
                tradeStyles.big,
                flash && { color: flash === "up" ? C.mint : C.loss },
                socket !== "open" && { opacity: 0.5 },
              ]}
            >
              {fmtPx(live.mark)}
            </Text>
            <Text style={[tradeStyles.chg, { color: tone(live.change24) }]}>
              {sPct(live.change24)}
            </Text>
            <Text style={tradeStyles.h24}>
              {socket === "open" ? "24H" : "RECONNECTING"}
            </Text>
          </View>
        )}

        {/* stats strip */}
        {listed ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tradeStyles.stats}
            style={{ marginTop: 14 }}
          >
            {stats.map(([k, v, t]) => (
              <View key={k} style={{ gap: 5 }}>
                <Text style={tradeStyles.statK}>{k}</Text>
                <Text
                  style={[
                    tradeStyles.statV,
                    t === "up" && { color: C.mint },
                    t === "down" && { color: C.loss },
                  ]}
                >
                  {v}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* market status */}
        {meta ? (
          <Pressable
            style={tradeStyles.status}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              hTap();
              setSheet({ t: "status" });
            }}
            accessibilityRole="button"
          >
            <View
              style={[
                tradeStyles.dot,
                {
                  backgroundColor: open ? C.mint : AMBER,
                  shadowColor: open ? C.mint : AMBER,
                },
              ]}
            />
            <Text style={tradeStyles.statusT}>
              {category === "commodities"
                ? String(meta.short ?? sym).toUpperCase() + " MARKET"
                : "US MARKET"}{" "}
              {open
                ? "OPEN · TRACKS THE LIVE PRICE"
                : "CLOSED · PERP TRADES 24/7"}
            </Text>
          </Pressable>
        ) : null}

        {/* chart */}
        {listed ? (
          <View
            onLayout={(e) => setChartY(e.nativeEvent.layout.y)}
            style={{ marginTop: 16 }}
          >
            <ChartStage
              sym={sym}
              onScrollLock={setLocked}
              positions={acct.positions}
              orders={acct.orders}
            />
          </View>
        ) : null}

        {/* panel tabs */}
        <View style={tradeStyles.tabs}>
          {(
            [
              ["pos", "Positions", acct.positions.length],
              ["ord", "Orders", acct.orders.length],
              ["book", "Order book"],
              ["info", "Contract"],
            ] as [PTab, string, number?][]
          ).map(([k, t, n]) => (
            <Pressable
              key={k}
              onPress={() => {
                hTap();
                setTab(k);
              }}
              style={tradeStyles.tabB}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
            >
              <Text style={[tradeStyles.tabT, tab === k && { color: C.ink1 }]}>
                {t}
                {n ? <Text style={tradeStyles.tabN}> {n}</Text> : null}
              </Text>
              {tab === k ? <View style={tradeStyles.tabLine} /> : null}
            </Pressable>
          ))}
        </View>

        <View style={tradeStyles.panel}>
          {tab === "pos" ? (
            !session.address ? (
              <View style={tradeStyles.empty}>
                <Text style={tradeStyles.ttl}>Connect your wallet</Text>
                <Text style={tradeStyles.emptyT}>
                  Your positions show here once you're signed in.
                </Text>
              </View>
            ) : acct.loading ? (
              <View style={tradeStyles.empty}>
                <ActivityIndicator color={C.ink3} />
              </View>
            ) : positions.length ? (
              positions.map((p) => {
                const mark = markOf(p.coin, p.entry),
                  pnl = livePnl(p, mark),
                  roe = liveRoe(p, mark);
                return (
                  <Pressable
                    key={p.id}
                    style={tradeStyles.pRow}
                    onPress={() => {
                      hTap();
                      setSheet({ t: "position", id: p.id });
                    }}
                    accessibilityRole="button"
                  >
                    <View style={tradeStyles.logo}>
                      <Text style={tradeStyles.logoT}>{logoTxt(p.sym)}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                      <View style={[tradeStyles.rowC, { gap: 8 }]}>
                        <Text style={tradeStyles.ttl}>{labelOf(p.sym)}</Text>
                        <Tag
                          label={`${sideTxt(p.side)} ${p.lev}x`}
                          tone={p.side > 0 ? "long" : "short"}
                        />
                      </View>
                      <Text style={tradeStyles.entry} numberOfLines={1}>
                        {fmtPx(p.entry)} → {fmtPx(mark)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={[tradeStyles.pnl, { color: tone(pnl) }]}>
                        {sMoney(pnl)}
                      </Text>
                      <Text style={[tradeStyles.roe, { color: tone(roe) }]}>
                        {sPct(roe)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={tradeStyles.empty}>
                <Text style={tradeStyles.ttl}>No open positions</Text>
                <Text style={tradeStyles.emptyT}>
                  Tap Long if you think {label} goes up, Short if you think it
                  goes down. You can start from $10.
                </Text>
              </View>
            )
          ) : null}

          {tab === "ord" ? (
            acct.orders.length ? (
              acct.orders.map((o) => (
                <View key={o.id} style={tradeStyles.pRow}>
                  <View style={tradeStyles.logo}>
                    <Text style={tradeStyles.logoT}>{logoTxt(o.sym)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                    <View style={[tradeStyles.rowC, { gap: 8 }]}>
                      <Text style={tradeStyles.ttl}>{labelOf(o.sym)}</Text>
                      <Tag
                        label={`${o.kind.toUpperCase()} ${sideTxt(o.side)}`}
                        tone={o.side > 0 ? "long" : "short"}
                      />
                    </View>
                    <Text style={tradeStyles.entry} numberOfLines={1}>
                      at {fmtPx(o.px)} · {fmtPx(o.px * o.size)} size
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      hTap();
                      cancel(o);
                    }}
                    disabled={actions.busy}
                    style={[
                      tradeStyles.cancel,
                      actions.busy && { opacity: 0.5 },
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={tradeStyles.cancelT}>Cancel</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={tradeStyles.empty}>
                <Text style={tradeStyles.ttl}>No open orders</Text>
                <Text style={tradeStyles.emptyT}>
                  Choose Limit or Stop in the ticket to trade at a price you
                  set. Orders show on the chart.
                </Text>
              </View>
            )
          ) : null}

          {tab === "book" ? (
            listed ? (
              <OrderBook sym={sym} label={label} />
            ) : null
          ) : null}

          {tab === "info" && listed ? (
            <View>
              {(
                [
                  ["UNDERLYING", category === "index" ? name + " index" : name],
                  ["VENUE", "Hyperliquid · " + live.coin],
                  ["MAX LEVERAGE", live.maxLeverage + "x"],
                  [
                    "FUNDING",
                    `Every hour · ${fr >= 0 ? "+" : "−"}${Math.abs(fr).toFixed(4)}%`,
                  ],
                  // Hyperliquid maintenance margin = half the initial margin at max leverage
                  [
                    "MAINTENANCE MARGIN",
                    (100 / (2 * live.maxLeverage)).toFixed(2) + "%",
                  ],
                  ["FEES", "~" + (TAKER * 100).toFixed(3) + "% taker"],
                  ["MARGIN", "USDC · isolated per position"],
                  ["HOURS", "24/7"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <Kv key={k} k={k} v={v} />
              ))}
              <Text style={tradeStyles.foot}>LIVE FROM HYPERLIQUID</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* long / short dock */}
      <LinearGradient
        pointerEvents="box-none"
        colors={["rgba(10,11,14,0)", C.ground]}
        locations={[0, 0.3]}
        style={[tradeStyles.dock, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}
      >
        <Btn
          kind="long"
          style={{ flex: 1, opacity: listed ? 1 : 0.4 }}
          onPress={() => openTicket(1)}
        >
          <Text style={[tradeStyles.dockT, { color: ON_MINT }]}>
            Long{" "}
            <Text style={tradeStyles.lv}>
              {listed ? Math.min(DEFAULT_LEV, live.maxLeverage) : DEFAULT_LEV}x
            </Text>
          </Text>
        </Btn>
        <Btn
          kind="short"
          style={{ flex: 1, opacity: listed ? 1 : 0.4 }}
          onPress={() => openTicket(-1)}
        >
          <Text style={[tradeStyles.dockT, { color: ON_SHORT }]}>
            Short{" "}
            <Text style={tradeStyles.lv}>
              {listed ? Math.min(DEFAULT_LEV, live.maxLeverage) : DEFAULT_LEV}x
            </Text>
          </Text>
        </Btn>
      </LinearGradient>

      {/* toast */}
      <PerpToast />

      {/* sheets */}
      {sheet?.t === "market" ? (
        <MarketPickerSheet
          current={sym}
          onClose={() => setSheet(null)}
          onPick={(x: string) => {
            setSym(x);
            setSheet(null);
          }}
        />
      ) : null}
      {sheet?.t === "status" ? (
        <MarketStatusSheet sym={sym} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.t === "unlock" ? (
        <UnlockSheet
          onClose={() => setSheet(null)}
          onDone={async () => {
            const side = sheet.side;
            try {
              await onboarding.unlock(); // asks the wallet for 1–2 signatures
              setSheet({ t: "ticket", side });
            } catch (e) {
              toast("Wallet approval needed", errMsg(e).toUpperCase());
              setSheet(null);
            }
          }}
        />
      ) : null}
      {sheet?.t === "ticket" ? (
        <OrderTicketSheet
          sym={sym}
          initialSide={sheet.side}
          onClose={() => setSheet(null)}
          onChart={toChart}
        />
      ) : null}
      {sheetPos ? (
        <LivePositionSheet
          position={sheetPos}
          mark={markOf(sheetPos.coin, sheetPos.entry)}
          label={labelOf(sheetPos.sym)}
          onClose={() => setSheet(null)}
          onClosePosition={(f) =>
            actions.closePosition(
              sheetPos,
              markOf(sheetPos.coin, sheetPos.entry),
              f,
            )
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

export const tradeStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  rowC: { flexDirection: "row", alignItems: "center", gap: 8 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  mktBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 48,
    minWidth: 0,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#262C36",
    alignItems: "center",
    justifyContent: "center",
  },
  logoT: { fontFamily: FONT.mono400, fontSize: 10.5, color: C.ink2 },
  sym: {
    fontFamily: FONT.sans800,
    fontSize: 21,
    letterSpacing: -0.7,
    color: C.ink1,
  },
  sub: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.ink3 },
  spot: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2A303A",
    justifyContent: "center",
  },
  spotT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink2 },
  px: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 20,
    flexWrap: "wrap",
  },
  big: {
    fontFamily: FONT.sans800,
    fontSize: 34,
    letterSpacing: -1.5,
    lineHeight: 38,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  chg: {
    fontFamily: FONT.mono400,
    fontSize: 13.5,
    fontVariant: ["tabular-nums"],
  },
  h24: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: 1.4,
    color: C.ink4,
  },
  stats: { gap: 18, paddingHorizontal: 20, paddingBottom: 2 },
  statK: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: C.ink4,
  },
  statV: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: "#D6DAE0",
    fontVariant: ["tabular-nums"],
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 14,
    marginLeft: 20,
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  statusT: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: C.ink2,
  },
  tabs: {
    flexDirection: "row",
    gap: 18,
    marginTop: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  tabB: { height: 46, justifyContent: "center" },
  tabT: { fontFamily: FONT.sans800, fontSize: 14, color: C.ink4 },
  tabN: { fontFamily: FONT.mono400, fontSize: 11, color: C.ink4 },
  tabLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.mint,
  },
  panel: { paddingHorizontal: 20, minHeight: 120 },
  pRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  ttl: {
    fontFamily: FONT.sans800,
    fontSize: 15.5,
    letterSpacing: -0.3,
    color: C.ink1,
  },
  entry: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  pnl: {
    fontFamily: FONT.sans800,
    fontSize: 15.5,
    fontVariant: ["tabular-nums"],
  },
  roe: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  empty: { gap: 8, paddingVertical: 20 },
  emptyT: {
    fontFamily: FONT.sans600,
    fontSize: 13,
    lineHeight: 20,
    color: C.ink3,
  },
  cancel: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.loss,
    justifyContent: "center",
  },
  cancelT: { fontFamily: FONT.sans800, fontSize: 13, color: C.loss },
  ratio: {
    flexDirection: "row",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  foot: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.3,
    color: C.ink4,
  },
  bHd: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: C.ink4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  bRow: {
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  bBar: { position: "absolute", top: 3, bottom: 3, borderRadius: 3 },
  bTxt: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  dockT: { fontFamily: FONT.sans800, fontSize: 15.5, letterSpacing: -0.2 },
  lv: { fontFamily: FONT.mono400, fontSize: 11, opacity: 0.7 },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: "#262C36",
    zIndex: 50,
    elevation: 12,
  },
  toastT: {
    fontFamily: FONT.sans800,
    fontSize: 13,
    letterSpacing: -0.2,
    color: C.ink1,
  },
  toastS: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: C.mint,
  },
});
