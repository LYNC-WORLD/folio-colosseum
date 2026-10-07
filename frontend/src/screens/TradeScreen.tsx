import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, SvgUri } from "react-native-svg";
import {
  useNavigation,
  useRoute,
  useScrollToTop,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { TAB_BAR_HEIGHT, useTabBarSpace } from "../navigation/TabBar";
import { hTap } from "../lib/haptics";
import {
  MarketPickerSheet,
  MarketStatusSheet,
  UnlockSheet,
  QUIZ_SEEN_KEY,
} from "../components/PerpSheets";
import { AMBER, Btn, Kv, ON_MINT, ON_SHORT, Tag } from "../components/PerpUi";
import { perpLabel } from "../data/perps";
import { OrderBook } from "../components/perps/OrderBook";
import { PerpToast } from "../components/perps/PerpToast";
import { LivePositionSheet } from "../components/perps/LivePositionSheet";
import { DockBalance } from "../components/perps/Dockbalance";
import { TransferSheet } from "../components/TransferSheet";
import { ChartStage } from "../components/Perpchart";
import { OrderTicketSheet } from "../components/Orderticketsheet";
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
import {
  livePnl,
  liveRoe,
  useAccount,
  useLiveMarket,
  useMarkets,
  usePerpsSession,
  useSocketStatus,
  useTradeActions,
} from "../hooks/perps";
import {
  useOrdersBySymbol,
  usePositionsBySymbol,
  type SymOrder,
  type SymPosition,
} from "../hooks/perps/useSymbolTrading";
import { tradeService, unwrap } from "../services/perps/tradeService";
import { useBalances } from "../hooks/useBalances";
import { errMsg } from "../services/hyperliquid/format";
import { DEFAULT_PERP_MARKETS } from "../data/perpMarketsDefault";

type PTab = "pos" | "ord" | "book" | "info";
type TransferOpts = { dir?: "in" | "out"; amt?: number; then?: () => void };
type SheetState =
  | null
  | { t: "market" }
  | { t: "status" }
  | { t: "unlock"; side: 1 | -1 }
  | { t: "ticket"; side: 1 | -1 }
  | { t: "position"; id: string }
  | { t: "transfer"; dir: "in" | "out"; amt?: number; then?: () => void };

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
  const posQ = usePositionsBySymbol(sym, session.idToken);
  const ordQ = useOrdersBySymbol(sym, session.idToken);
  const refreshTrading = () => {
    posQ.refetch();
    ordQ.refetch();
  };
  const actions = useTradeActions(session.idToken);
  const socket = useSocketStatus();
  const bal = useBalances();

  // ---- first-trade quiz flag (replaces the wallet-based onboarding check)
  const [quizSeen, setQuizSeen] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(QUIZ_SEEN_KEY)
      .then((v) => setQuizSeen(v === "1"))
      .catch(() => {});
  }, []);

  const [tab, setTab] = useState<PTab>("pos");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [locked, setLocked] = useState(false); // freezes scroll while the chart crosshair is held
  const [chartY, setChartY] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000); // funding countdown
    return () => clearInterval(i);
  }, []);

  const openTransfer = (o?: TransferOpts) =>
    setSheet({
      t: "transfer",
      dir: o?.dir ?? "in",
      amt: o?.amt,
      then: o?.then,
    });

  const meta = metaOf(sym);
  const label = labelOf(sym);
  const category: string = "stocks";
  const name: string = sym;
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

  // No wallet / session gate: quiz the first time, ticket every time after.
  const openTicket = (side: 1 | -1) => {
    if (!listed)
      return toast(
        "Not tradable",
        `${label.toUpperCase()} ISN'T LISTED ON HYPERLIQUID`,
      );
    setSheet(quizSeen ? { t: "ticket", side } : { t: "unlock", side });
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

  const positions = posQ.data;
  const sheetPos =
    sheet?.t === "position"
      ? posQ.data.find((p) => p.id === sheet.id)
      : undefined;

  const [cancelling, setCancelling] = useState<number | null>(null);
  const cancel = async (o: SymOrder) => {
    setCancelling(o.oid);
    try {
      await unwrap(
        tradeService.cancelOrder(
          { coin: o.coin, oid: o.oid },
          session.idToken ?? "",
        ),
      );
      toast(
        "Order cancelled",
        `${labelOf(o.sym).toUpperCase()} · ${fmtPx(o.px)}`,
      );
      ordQ.refetch();
    } catch (e) {
      toast("Couldn't cancel", errMsg(e).toUpperCase());
    } finally {
      setCancelling(null);
    }
  };
  const levLabel = listed
    ? Math.min(DEFAULT_LEV, live.maxLeverage)
    : DEFAULT_LEV;

  const selectedMarket = DEFAULT_PERP_MARKETS.find(
    (market) => market.marketSymbol === label,
  );

  return (
    <SafeAreaView style={tradeStyles.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!locked}
        showsVerticalScrollIndicator={false}
        // extra room: the dock is now two rows (balance + Long/Short)
        contentContainerStyle={{ paddingTop: 18, paddingBottom: bottom + 120 }}
      >
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
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                backgroundColor: "#262C36",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {selectedMarket?.imageUrl ? (
                <SvgUri uri={selectedMarket.imageUrl} width={42} height={42} />
              ) : null}
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
              positions={posQ.data}
              orders={ordQ.data}
            />
          </View>
        ) : null}

        {/* panel tabs */}
        <View style={tradeStyles.tabs}>
          {(
            [
              ["pos", "Positions", posQ.data.length],
              ["ord", "Orders", ordQ.data.length],
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
            posQ.loading ? (
              <View style={tradeStyles.empty}>
                <ActivityIndicator color={C.ink3} />
              </View>
            ) : posQ.error && !positions.length ? (
              <View style={tradeStyles.empty}>
                <Text style={tradeStyles.ttl}>Couldn't load positions</Text>
                <Text style={tradeStyles.emptyT}>{posQ.error}</Text>
                <Btn
                  kind="ghost"
                  small
                  label="Try again"
                  onPress={posQ.refetch}
                />
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
            ordQ.loading ? (
              <View style={tradeStyles.empty}>
                <ActivityIndicator color={C.ink3} />
              </View>
            ) : ordQ.error && !ordQ.data.length ? (
              <View style={tradeStyles.empty}>
                <Text style={tradeStyles.ttl}>Couldn't load orders</Text>
                <Text style={tradeStyles.emptyT}>{ordQ.error}</Text>
                <Btn
                  kind="ghost"
                  small
                  label="Try again"
                  onPress={ordQ.refetch}
                />
              </View>
            ) : ordQ.data.length ? (
              ordQ.data.map((o) => (
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
                    disabled={cancelling === o.oid}
                    style={[
                      tradeStyles.cancel,
                      cancelling === o.oid && { opacity: 0.5 },
                    ]}
                    accessibilityRole="button"
                  >
                    {cancelling === o.oid ? (
                      <ActivityIndicator size="small" color={C.loss} />
                    ) : (
                      <Text style={tradeStyles.cancelT}>Cancel</Text>
                    )}
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

      {/* dock: perp balance + transfer, then Long / Short */}
      <LinearGradient
        pointerEvents="box-none"
        colors={["rgba(10,11,14,0)", C.ground]}
        locations={[0, 0.2]}
        style={[tradeStyles.dock, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}
      >
        <View style={tradeStyles.dockInner}>
          <DockBalance perp={bal.perp} onTransfer={() => openTransfer()} />
          <View style={tradeStyles.dockRow}>
            <Btn
              kind="long"
              style={{ flex: 1, opacity: listed ? 1 : 0.4 }}
              onPress={() => openTicket(1)}
            >
              <Text style={[tradeStyles.dockT, { color: ON_MINT }]}>
                Long <Text style={tradeStyles.lv}>{levLabel}x</Text>
              </Text>
            </Btn>
            <Btn
              kind="short"
              style={{ flex: 1, opacity: listed ? 1 : 0.4 }}
              onPress={() => openTicket(-1)}
            >
              <Text style={[tradeStyles.dockT, { color: ON_SHORT }]}>
                Short <Text style={tradeStyles.lv}>{levLabel}x</Text>
              </Text>
            </Btn>
          </View>
        </View>
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
          onDone={() => {
            const side = sheet.side;
            setQuizSeen(true);
            // close the quiz first, then open the Long/Short ticket once it has dismissed
            setSheet(null);
            setTimeout(() => setSheet({ t: "ticket", side }), 380);
          }}
        />
      ) : null}
      {sheet?.t === "ticket" ? (
        <OrderTicketSheet
          sym={sym}
          initialSide={sheet.side}
          perpBal={bal.perp}
          spotBal={bal.spot}
          onTransfer={(amt?: number) => {
            const side = sheet.side;
            openTransfer({
              dir: "in",
              amt,
              then: () => setSheet({ t: "ticket", side }),
            });
          }}
          onClose={() => {
            setSheet(null);
            refreshTrading();
          }}
          onChart={toChart}
        />
      ) : null}
      {sheet?.t === "transfer" ? (
        <TransferSheet
          dir={sheet.dir}
          amt={sheet.amt}
          onClose={() => setSheet(null)}
          onMoved={() => {
            const then = sheet.then;
            setSheet(null);
            if (then) setTimeout(then, 380);
          }}
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
          onMoveToSpot={() =>
            openTransfer({
              dir: "out",
              amt: Math.floor(bal.perp * 100) / 100,
            })
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
  // dock = gradient shell; dockInner stacks the balance row above the Long/Short row
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
  },
  dockInner: { flexDirection: "column", gap: 8, alignSelf: "stretch" },
  dockRow: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
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
