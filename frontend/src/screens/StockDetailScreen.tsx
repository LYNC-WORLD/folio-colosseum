import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import { useStockDetail } from "../hooks/useStockDetail";
import { MOCK_DETAIL } from "../data/mockStockDetail";
import { StocksStackParamList } from "../navigation/types";

function formatPrice(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default function StockDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<StocksStackParamList, "StockDetail">>();
  const { stock, loading, error, reload } = useStockDetail(params.symbol);

  const [period, setPeriod] =
    useState<(typeof MOCK_DETAIL.periods)[number]>("1Y");
  const [amount] = useState(250); // static default buy amount for now

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator />
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
  const positive = MOCK_DETAIL.changePct >= 0;
  const estUnits = amount / price;

  return (
    <View
      style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={s.topBar}>
        <Pressable style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={C.ink} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={s.iconBtn}>
          <Ionicons name="bookmark-outline" size={18} color={C.ink} />
        </Pressable>
        <Pressable style={s.iconBtn}>
          <Ionicons name="share-outline" size={18} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.icon}>
            <Text style={s.iconText}>{stock.symbol.charAt(0)}</Text>
          </View>
          <View>
            <Text style={s.name}>{stock.name}</Text>
            <Text style={s.subLabel}>{stock.symbol} · Pre-IPO</Text>
          </View>
        </View>

        <Text style={s.price}>{formatPrice(price)}</Text>
        {/* Change figures aren't returned by the API yet — static placeholder */}
        <View style={s.changeRow}>
          <Text
            style={[s.changeText, { color: positive ? C.success : C.error }]}
          >
            {positive ? "+" : ""}
            {formatPrice(MOCK_DETAIL.changeAbs)} · {positive ? "+" : ""}
            {MOCK_DETAIL.changePct}%
          </Text>
          <Text style={s.periodLabel}> {MOCK_DETAIL.periodLabel}</Text>
        </View>

        {/* No historical price endpoint yet — static chart placeholder */}
        <View style={s.chartBox}>
          <View style={s.chartTooltip}>
            <Text style={s.chartTooltipDate}>
              {MOCK_DETAIL.chartPoint.date}
            </Text>
            <Text style={s.chartTooltipPrice}>
              {formatPrice(MOCK_DETAIL.chartPoint.price)}
            </Text>
          </View>
          <Text style={s.chartPlaceholder}>Chart data coming soon</Text>
        </View>

        <View style={s.periodTabs}>
          {MOCK_DETAIL.periods.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[s.periodPill, period === p && s.periodPillActive]}
            >
              <Text style={[s.periodText, period === p && s.periodTextActive]}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="trending-up" size={16} color={C.success} />
          </View>
          <View>
            <Text style={s.bannerLabel}>{MOCK_DETAIL.banner.label}</Text>
            <Text style={s.bannerSub}>{MOCK_DETAIL.banner.sublabel}</Text>
          </View>
        </View>

        {/* Stats below aren't in the API yet — static placeholders */}
        <View style={s.statsGrid}>
          {MOCK_DETAIL.stats.map((stat) => (
            <View key={stat.label} style={s.statCell}>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={s.buyersHeader}>
          <Text style={s.buyersTitle}>Who is buying</Text>
          <Text style={s.buyersLink}>wallets you follow</Text>
        </View>
        <View style={s.buyersBox}>
          {MOCK_DETAIL.buyers.map((b, i) => (
            <View
              key={b.handle}
              style={[
                s.buyerRow,
                i < MOCK_DETAIL.buyers.length - 1 && s.buyerRowBorder,
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
        <Pressable style={s.sellBtn}>
          <Text style={s.sellText}>Sell</Text>
        </Pressable>
        <Pressable style={s.buyBtn}>
          <Text style={s.buyText}>
            Buy {formatPrice(amount)} ≈ {estUnits.toFixed(3)} {stock.symbol}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  errorText: { color: C.error, fontSize: 14 },
  retryText: { color: C.accent, fontWeight: "600" },

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
    borderColor: C.ring,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.ring,
  },
  iconText: { color: C.ink, fontSize: 22, fontWeight: "700" },
  name: { color: C.ink, fontSize: 20, fontWeight: "700" },
  subLabel: { color: C.muted, fontSize: 13, marginTop: 2 },

  price: { color: C.ink, fontSize: 42, fontWeight: "700", marginTop: 20 },
  changeRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  changeText: { fontSize: 15, fontWeight: "600" },
  periodLabel: { color: C.muted, fontSize: 14 },

  chartBox: {
    height: 220,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.ring,
    alignItems: "center",
    justifyContent: "center",
  },
  chartTooltip: {
    position: "absolute",
    top: 16,
    backgroundColor: C.ink,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chartTooltipDate: { color: C.buttonInk, fontSize: 11 },
  chartTooltipPrice: { color: C.buttonInk, fontSize: 15, fontWeight: "700" },
  chartPlaceholder: { color: C.muted, fontSize: 13 },

  periodTabs: { flexDirection: "row", gap: 8, marginTop: 16 },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.ring,
  },
  periodPillActive: { backgroundColor: C.ink, borderColor: C.ink },
  periodText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  periodTextActive: { color: C.buttonInk },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.ring,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(52,199,89,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerLabel: { color: C.ink, fontSize: 14, fontWeight: "700" },
  bannerSub: { color: C.muted, fontSize: 12, marginTop: 2 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.ring,
    borderRadius: 14,
    overflow: "hidden",
  },
  statCell: { width: "50%", padding: 16, gap: 4 },
  statLabel: { color: C.muted, fontSize: 12 },
  statValue: { color: C.ink, fontSize: 17, fontWeight: "700" },

  buyersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  buyersTitle: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buyersLink: { color: C.muted, fontSize: 12 },
  buyersBox: {
    borderWidth: 1,
    borderColor: C.ring,
    borderRadius: 14,
    backgroundColor: C.card,
  },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  buyerRowBorder: { borderBottomWidth: 1, borderBottomColor: C.ring },
  buyerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.ring,
  },
  buyerHandle: { color: C.ink, fontSize: 14, fontWeight: "600" },
  buyerDetail: { color: C.muted, fontSize: 12, marginTop: 2 },
  buyerPnl: { color: C.success, fontSize: 14, fontWeight: "700" },
  buyerPnlLabel: { color: C.muted, fontSize: 11, marginTop: 2 },

  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: C.ring,
  },
  sellBtn: {
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.ring,
    alignItems: "center",
    justifyContent: "center",
  },
  sellText: { color: C.ink, fontSize: 15, fontWeight: "700" },
  buyBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buyText: { color: C.buttonInk, fontSize: 15, fontWeight: "700" },
});
