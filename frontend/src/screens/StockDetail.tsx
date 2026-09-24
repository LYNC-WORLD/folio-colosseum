import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StocksStackParamList } from "../navigation/types";
import { useStockDetail } from "../hooks/useStockDetail";
import { useCancelRecurringBuy } from "../hooks/useTrade";
import { MOCK_DETAIL } from "../data/mockStockDetail";
import { C, RADIUS, FONT } from "../theme";
import {
  PriceChart,
  BuySheet,
  RecurringBuySheet,
  type ChartChange,
} from "../components";
import { SellSheet } from "../components/SellSheet";

function formatPrice(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUnits(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function maskUserId(id: string) {
  // DIDs like "did:privy:xxxxxxxxxxxxxxxxxxxxxxxxx" — show a short readable tail
  const tail = id.split(":").pop() ?? id;
  return tail.length > 10 ? `${tail.slice(0, 4)}…${tail.slice(-4)}` : tail;
}

export function StockDetail() {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<StocksStackParamList, "StockDetail">>();
  const {
    stock,
    investment,
    recurringBuy,
    latestBuys,
    loading,
    error,
    reload,
  } = useStockDetail(params.category, params.symbol);

  const [change, setChange] = useState<ChartChange | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const cancelRecurring = useCancelRecurringBuy();

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.bone} />
      </View>
    );
  }

  if (error || !stock) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={s.errorText}>{error ?? "Stock not found"}</Text>
        <Pressable onPress={() => reload()}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const price = Number(stock.price);
  const changeAbs = change?.changeAbs ?? 0;
  const positive = changeAbs >= 0;

  const activeRecurring = recurringBuy?.hasRecurringBuy
    ? recurringBuy.data.find((r) => r.isActive)
    : undefined;

  const holding = investment?.hasInvestment ? investment.data[0] : undefined;

  const handleConfirmCancel = async () => {
    if (!activeRecurring) return;
    try {
      await cancelRecurring.mutateAsync(activeRecurring.id);
      setCancelConfirmOpen(false);
    } catch {
      // error surfaces via cancelRecurring.error below the confirm buttons
    }
  };

  return (
    <View style={[s.safe]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.icon}>
            {stock.imageUrl ? (
              <Image source={{ uri: stock.imageUrl }} style={s.iconImage} />
            ) : (
              <Text style={s.iconText}>{stock.symbol.charAt(0)}</Text>
            )}
          </View>
          <View>
            <Text style={s.name}>{stock.name}</Text>
            <Text style={s.subLabel}>{stock.symbol} · Pre-IPO</Text>
          </View>
        </View>

        <Text style={s.price}>{formatPrice(price)}</Text>
        {/* Change figures aren't returned by the API yet — static placeholder */}
        <View style={s.changeRow}>
          <Text style={[s.changeText, { color: positive ? C.jade : C.clay }]}>
            {positive ? "+" : ""}
            {formatPrice(MOCK_DETAIL.changeAbs)} · {positive ? "+" : ""}
            {MOCK_DETAIL.changePct}%
          </Text>
          <Text style={s.periodLabel}> {MOCK_DETAIL.periodLabel}</Text>
        </View>

        <PriceChart mint={stock.tokenAddress} onChange={setChange} />

        {/* Your investment */}
        {holding && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>Your investment</Text>
            </View>
            <View style={s.cardRow}>
              <View>
                <Text style={s.cardLabel}>You own</Text>
                <Text style={s.cardValue}>
                  {formatUnits(holding.stockAmount)} {stock.symbol}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.cardLabel}>Invested</Text>
                <Text style={s.cardValue}>
                  {formatUsd(holding.investmesntAmount)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recurring buy */}
        {/* Recurring buy */}
        {activeRecurring && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardTitleRow}>
                <View style={s.liveDot} />
                <Text style={s.cardTitle}>Recurring buy</Text>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setCancelConfirmOpen(true)}
                style={s.cardCloseBtn}
              >
                <Ionicons name="close" size={16} color={C.inkMuted} />
              </Pressable>
            </View>

            <View style={s.recurringAmountRow}>
              <Text style={s.recurringAmount}>
                {activeRecurring.usdcAmount
                  ? formatUsd(Number(activeRecurring.usdcAmount))
                  : `${activeRecurring.stockAmount} ${stock.symbol}`}
              </Text>
              <View style={s.cadencePill}>
                <Ionicons name="repeat" size={11} color={C.inkMuted} />
                <Text style={s.cadenceText}>Monthly</Text>
              </View>
            </View>

            <View style={s.cardRow}>
              <View style={s.nextBuyRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={C.inkMuted}
                />
                <Text style={s.nextBuyText}>
                  Next buy {formatDate(activeRecurring.buyDate)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats — still static, no source yet */}
        <View style={s.statsGrid}>
          {chunkPairs(MOCK_DETAIL.stats).map((row, rowIndex, rows) => (
            <View
              key={rowIndex}
              style={[
                s.statsRow,
                rowIndex < rows.length - 1 && s.statsRowDivider,
              ]}
            >
              {row.map((stat, i) => (
                <View
                  key={stat.label}
                  style={[s.statCell, i < row.length - 1 && s.statCellDivider]}
                >
                  <Text style={s.statLabel}>{stat.label}</Text>
                  <Text style={s.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeading}>Recent activity</Text>
          <View style={s.sectionRule} />
        </View>
        {latestBuys.length === 0 ? (
          <Text style={[s.emptyText]}>No recent trades yet</Text>
        ) : (
          <View style={s.buyersBox}>
            {latestBuys.map((b, i) => (
              <View
                key={b.id}
                style={[
                  s.buyerRow,
                  i === 0 && s.buyerRowFirst,
                  i === latestBuys.length - 1 && s.buyerRowLast,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.buyerHandle}>{maskUserId(b.userId)}</Text>
                  <Text style={s.buyerDetail}>
                    {b.tradeType === "BUY" ? "Bought" : "Sold"}{" "}
                    {formatUsd(b.investmentAmount)} · {timeAgo(b.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      s.buyerPnl,
                      { color: b.tradeType === "BUY" ? C.jade : C.clay },
                    ]}
                  >
                    {formatPrice(b.stockPrice)}
                  </Text>
                  <Text style={s.buyerPnlLabel}>at trade</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        <View style={s.footerRow}>
          <Pressable style={s.sellBtn} onPress={() => setSellOpen(true)}>
            <Text style={s.sellText}>Sell</Text>
          </Pressable>

          <Pressable style={s.buyBtn} onPress={() => setBuyOpen(true)}>
            <Text style={s.buyText}>Buy {stock.symbol}</Text>
          </Pressable>
        </View>

        {!activeRecurring && (
          <Pressable
            style={s.recurringBuyBtn}
            onPress={() => setRecurringOpen(true)}
          >
            <Text style={s.buyText}>Recurring Buy {stock.symbol}</Text>
          </Pressable>
        )}
      </View>

      {buyOpen && (
        <BuySheet
          visible={buyOpen}
          onClose={() => setBuyOpen(false)}
          stock={stock}
        />
      )}

      <SellSheet
        visible={sellOpen}
        onClose={() => setSellOpen(false)}
        stock={stock}
      />

      {recurringOpen && (
        <RecurringBuySheet
          visible={recurringOpen}
          onClose={() => setRecurringOpen(false)}
          stock={stock}
        />
      )}

      <Modal
        visible={cancelConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelConfirmOpen(false)}
      >
        <View style={s.confirmRoot}>
          <Pressable
            style={StyleSheetAbsoluteFill}
            onPress={() => setCancelConfirmOpen(false)}
          />
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Cancel recurring buy?</Text>
            <Text style={s.confirmBody}>
              Your recurring buy of {stock.symbol} will stop. You can always set
              up a new one later.
            </Text>

            {cancelRecurring.error instanceof Error && (
              <Text style={s.confirmError}>
                {cancelRecurring.error.message}
              </Text>
            )}

            <View style={s.confirmRow}>
              <Pressable
                style={s.confirmKeepBtn}
                onPress={() => setCancelConfirmOpen(false)}
                disabled={cancelRecurring.isPending}
              >
                <Text style={s.confirmKeepText}>Keep it</Text>
              </Pressable>
              <Pressable
                style={s.confirmCancelBtn}
                onPress={handleConfirmCancel}
                disabled={cancelRecurring.isPending}
              >
                {cancelRecurring.isPending ? (
                  <ActivityIndicator color={C.buttonInk} />
                ) : (
                  <Text style={s.confirmCancelText}>Cancel it</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  errorText: { color: C.clay, fontSize: 14, fontFamily: FONT.display400 },
  retryText: { color: C.bone, fontWeight: "600", fontFamily: FONT.display600 },

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 4 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 0 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  iconImage: { width: "100%", height: "100%" },
  iconText: { color: C.bone, fontSize: 17, fontFamily: FONT.mono500 },
  name: { color: C.bone, fontSize: 18, fontFamily: FONT.display600 },
  subLabel: {
    color: C.inkMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT.mono400,
    letterSpacing: 0.4,
  },

  price: {
    color: C.bone,
    fontSize: 44,
    marginTop: 18,
    fontFamily: FONT.display800,
    letterSpacing: -2.2,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
    gap: 8,
  },
  changeText: { fontSize: 14, fontFamily: FONT.mono500 },
  periodLabel: { color: C.inkMuted, fontSize: 13, fontFamily: FONT.display400 },

  card: {
    marginTop: 18,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.jade,
  },
  cardTitle: { color: C.bone, fontSize: 13, fontFamily: FONT.display600 },
  cardCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  recurringAmountRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recurringAmount: {
    color: C.bone,
    fontSize: 20,
    fontFamily: FONT.mono500,
    letterSpacing: -0.4,
  },
  cadencePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  cadenceText: {
    color: C.inkMuted,
    fontSize: 11,
    fontFamily: FONT.display500,
  },
  nextBuyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextBuyText: {
    color: C.inkMuted,
    fontSize: 12,
    fontFamily: FONT.mono400,
  },
  cardLabel: { color: C.inkMuted, fontSize: 11, fontFamily: FONT.display400 },
  cardValue: {
    marginTop: 3,
    color: C.bone,
    fontSize: 15,
    fontFamily: FONT.mono500,
  },

  statsGrid: {
    marginTop: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  statsRow: { flexDirection: "row" },
  statsRowDivider: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  statCell: { flex: 1, padding: 14, gap: 4, backgroundColor: C.card },
  statCellDivider: { borderRightWidth: 1, borderRightColor: C.hairline },
  statLabel: { color: C.inkMuted, fontSize: 12, fontFamily: FONT.display400 },
  statValue: { color: C.bone, fontSize: 15, fontFamily: FONT.mono500 },

  sectionHeaderRow: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeading: {
    fontFamily: FONT.display600,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.inkMuted,
  },
  sectionRule: { flexGrow: 1, height: 1, backgroundColor: C.hairline },
  emptyText: {
    color: C.inkMuted,
    fontSize: 13,
    fontFamily: FONT.display400,
    textAlign: "center",
  },

  buyersBox: {
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: RADIUS.md,
    overflow: "hidden",
  },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  buyerRowFirst: { borderTopWidth: 0 },
  buyerRowLast: {},
  buyerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  buyerHandle: { color: C.bone, fontSize: 13, fontFamily: FONT.mono400 },
  buyerDetail: {
    color: C.inkMuted,
    fontSize: 12,
    marginTop: 3,
    fontFamily: FONT.display400,
  },
  buyerPnl: { fontSize: 13, fontFamily: FONT.mono500 },
  buyerPnlLabel: {
    color: C.inkMuted,
    fontSize: 11,
    marginTop: 3,
    fontFamily: FONT.display400,
  },

  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#120F0E",
    borderTopWidth: 1,
    borderTopColor: "#1F1B19",
  },
  footerRow: { flexDirection: "row", gap: 10 },
  recurringBuyBtn: {
    width: "100%",
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: C.bone,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sellBtn: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  sellText: { color: C.bone, fontSize: 15, fontFamily: FONT.display500 },
  buyBtn: {
    flex: 1,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: C.bone,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buyText: { color: C.buttonInk, fontSize: 16, fontFamily: FONT.display600 },

  // Cancel confirm popup
  confirmRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 32,
  },
  confirmBox: {
    width: "100%",
    padding: 20,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    gap: 12,
  },
  confirmTitle: { color: C.bone, fontSize: 16, fontFamily: FONT.display600 },
  confirmBody: {
    color: C.inkMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONT.display400,
  },
  confirmError: { color: C.clay, fontSize: 12, fontFamily: FONT.display400 },
  confirmRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  confirmKeepBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmKeepText: { color: C.bone, fontSize: 14, fontFamily: FONT.display600 },
  confirmCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: C.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    color: C.buttonInk,
    fontSize: 14,
    fontFamily: FONT.display600,
  },
});
