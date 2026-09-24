import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { StocksStackParamList } from "../navigation/types";
import { useStockDetail } from "../hooks/useStockDetail";
import { MOCK_DETAIL } from "../data/mockStockDetail";
import { C, RADIUS, FONT } from "../theme";
import {
  PriceChart,
  BuySheet,
  type ChartChange,
  RecurringBuySheet,
} from "../components";
import { SellSheet } from "../components/SellSheet";

function formatPrice(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function StockDetail() {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<StocksStackParamList, "StockDetail">>();
  const { stock, loading, error, reload } = useStockDetail(params.symbol);

  const [change, setChange] = useState<ChartChange | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

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

  return (
    <View style={[s.safe]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.icon}>
            {stock.imageUrl ? (
              <Image source={{ uri: stock.imageUrl }} style={s.bannerIcon} />
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

        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="trending-up" size={16} color={C.jade} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerLabel}>{MOCK_DETAIL.banner.label}</Text>
            <Text style={s.bannerSub}>{MOCK_DETAIL.banner.sublabel}</Text>
          </View>
        </View>

        {/* Stats below aren't in the API yet — static placeholders */}
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
          <Text style={s.sectionHeading}>Who is buying</Text>
          <View style={s.sectionRule} />
          <Text style={s.sectionAside}>wallets you follow</Text>
        </View>
        <View style={s.buyersBox}>
          {MOCK_DETAIL.buyers.map((b, i) => (
            <View
              key={b.handle}
              style={[
                s.buyerRow,
                i === 0 && s.buyerRowFirst,
                i === MOCK_DETAIL.buyers.length - 1 && s.buyerRowLast,
              ]}
            >
              <View style={s.buyerAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.buyerHandle}>{b.handle}</Text>
                <Text style={s.buyerDetail}>{b.detail}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.buyerPnl}>{b.pnl}</Text>
                <Text style={s.buyerPnlLabel}>90d PnL</Text>
              </View>
            </View>
          ))}
        </View>
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

        <Pressable
          style={s.recurringBuyBtn}
          onPress={() => setRecurringOpen(true)}
        >
          <Text style={s.buyText}>Recurring Buy {stock.symbol}</Text>
        </Pressable>
      </View>

      {buyOpen && (
        <BuySheet
          visible={buyOpen}
          onClose={() => setBuyOpen(false)}
          stock={stock}
        />
      )}

      {sellOpen && (
        <SellSheet
          visible={sellOpen}
          onClose={() => setSellOpen(false)}
          stock={stock}
        />
      )}

      {recurringOpen && (
        <RecurringBuySheet
          visible={recurringOpen}
          onClose={() => setRecurringOpen(false)}
          stock={stock}
        />
      )}
    </View>
  );
}

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  errorText: { color: C.clay, fontSize: 14, fontFamily: FONT.display400 },
  retryText: { color: C.bone, fontWeight: "600", fontFamily: FONT.display600 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 4 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 0,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.hairline,
  },
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

  chartBox: {
    height: 200,
    marginTop: 18,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  chartTooltip: {
    position: "absolute",
    top: 14,
    backgroundColor: C.raised,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#453D37",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chartTooltipDate: {
    color: C.inkMuted,
    fontSize: 11,
    fontFamily: FONT.display400,
  },
  chartTooltipPrice: {
    color: C.bone,
    fontSize: 14,
    marginTop: 2,
    fontFamily: FONT.mono500,
  },
  chartPlaceholder: {
    color: C.inkMuted,
    fontSize: 13,
    fontFamily: FONT.display400,
  },

  periodTabs: { flexDirection: "row", gap: 8, marginTop: 14 },
  periodPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  periodPillActive: { backgroundColor: C.raised, borderColor: "#453D37" },
  periodText: { color: C.inkMuted, fontSize: 12, fontFamily: FONT.display500 },
  periodTextActive: { color: C.bone },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#10201A",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerLabel: { color: C.bone, fontSize: 14, fontFamily: FONT.display600 },
  bannerSub: {
    color: C.inkMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT.display400,
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
  sectionAside: {
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkMuted,
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
  buyerPnl: { color: C.jade, fontSize: 13, fontFamily: FONT.mono500 },
  buyerPnlLabel: {
    color: C.inkMuted,
    fontSize: 11,
    marginTop: 3,
    fontFamily: FONT.display400,
  },

  // ---- footer: the part you asked about ----
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#120F0E",
    borderTopWidth: 1,
    borderTopColor: "#1F1B19",
  },

  footerRow: {
    flexDirection: "row",
    gap: 10,
  },

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
  buyEst: {
    color: C.buttonInk,
    fontSize: 12,
    fontFamily: FONT.mono400,
    opacity: 0.65,
  },
});
