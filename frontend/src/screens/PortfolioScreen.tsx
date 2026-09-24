import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, RADIUS, FONT } from "../theme";
import { SafeScreen } from "../components";
import { useWallet } from "../context/WalletContext";
import { useRecurringBuys, useCancelRecurringBuy } from "../hooks/useTrade";
import type { RecurringBuy } from "../types";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { TabParamList } from "../navigation";

const RANGES = ["Today", "1M", "1Y", "All"] as const;
type Range = (typeof RANGES)[number];

const STOCK_TYPE_LABEL: Record<string, string> = {
  USStock: "US stocks",
  PreIPO: "Pre-IPO",
};

const STOCK_TYPE_COLOR: Record<string, string> = {
  USStock: C.series.usStocks,
  PreIPO: C.series.preIpo,
};

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatBuyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PortfolioScreen() {
  const [range, setRange] = useState<Range>("All");
  const { usdc, tokens, usdValue, loading, error, refresh } = useWallet();
  const {
    recurringBuys,
    loading: recurringLoading,
    error: recurringError,
    reload: reloadRecurring,
  } = useRecurringBuys();
  const cancelRecurring = useCancelRecurringBuy();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const holdings = tokens.map((t) => ({
    key: t.balance,
    imageUrl: t.imageUrl,
    initial: t.symbol.charAt(0),
    name: t.name,
    units: `${t.balance} ${t.symbol}`,
    symbol: t.symbol,
    value: formatUsd(t.balance * Number(t.price)),
  }));
  const navigation = useNavigation<NavigationProp<TabParamList>>();

  const allocation = useMemo(() => {
    const totals = new Map<string, number>();
    let grandTotal = 0;

    for (const t of tokens) {
      const value = t.balance * Number(t.price);
      totals.set(t.stockType, (totals.get(t.stockType) ?? 0) + value);
      grandTotal += value;
    }

    return Array.from(totals.entries())
      .map(([type, value]) => ({
        type,
        label: STOCK_TYPE_LABEL[type] ?? type,
        color: STOCK_TYPE_COLOR[type] ?? C.inkMuted,
        value,
        pct: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [tokens]);

  // Active buys first so a cancelled entry doesn't push live ones down.
  const sortedRecurring = useMemo(
    () =>
      [...recurringBuys].sort(
        (a, b) => Number(b.isActive) - Number(a.isActive),
      ),
    [recurringBuys],
  );

  const activeCount = recurringBuys.filter((r) => r.isActive).length;

  // Map a recurring buy's stockAddress back to its token metadata (symbol,
  // name, image) so the list can show something nicer than a raw address.
  function tokenFor(stockAddress: string) {
    return tokens.find((t) => t.tokenAccount === stockAddress);
  }

  function amountLabel(item: RecurringBuy) {
    if (item.usdcAmount) return `${formatUsd(Number(item.usdcAmount))} USDC`;
    if (item.stockAmount) {
      return `${item.stockAmount} ${item.stock.symbol}`.trim();
    }
    return "—";
  }

  const handleCancel = (item: RecurringBuy) => {
    const label = item.stock.symbol;
    Alert.alert(
      "Cancel recurring buy",
      `Stop the recurring buy for ${label}? This can't be undone.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel buy",
          style: "destructive",
          onPress: () => {
            setCancelingId(item.id);
            cancelRecurring.mutate(item.id, {
              onError: () => {
                Alert.alert("Something went wrong", "Please try again.");
              },
              onSettled: () => {
                setCancelingId(null);
              },
            });
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <ActivityIndicator color={C.bone} />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          <Text style={s.h1}>Portfolio</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Portfolio settings"
            style={s.iconBtn}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={C.inkSecondary}
            />
          </Pressable>
        </View>

        <Text style={s.totalLabel}>Total value</Text>
        <Text style={s.totalValue}>{formatUsd(usdValue)}</Text>

        {error && (
          <View style={s.errorRow}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => refresh()}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Allocation */}
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Allocation</Text>
            <View style={s.sectionRule} />
            <Text style={s.sectionAside}>
              {allocation.length}{" "}
              {allocation.length === 1 ? "collection" : "collections"}
            </Text>
          </View>

          {allocation.length === 0 ? (
            <Text style={s.emptyText}>No holdings yet</Text>
          ) : (
            <>
              <View style={s.allocBar}>
                {allocation.map((a) => (
                  <View
                    key={a.type}
                    style={{
                      flexGrow: a.pct || 0.0001,
                      backgroundColor: a.color,
                      borderRadius: 4,
                    }}
                  />
                ))}
              </View>

              <View style={s.allocGrid}>
                {allocation.map((a) => (
                  <View key={a.type} style={s.allocItem}>
                    <View style={[s.allocDot, { backgroundColor: a.color }]} />
                    <View style={{ minWidth: 0 }}>
                      <Text style={s.allocLabel} numberOfLines={1}>
                        {a.label}
                      </Text>
                      <Text style={s.allocValue}>
                        {formatUsd(a.value)} ·{" "}
                        {a.pct.toFixed(a.pct < 1 && a.pct > 0 ? 1 : 0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Holdings */}
        <View style={[s.sectionHeaderRow, s.holdingsHeaderGap]}>
          <Text style={s.sectionHeading}>Holdings</Text>
          <View style={s.sectionRule} />
          <Text style={s.sectionAside}>{holdings.length} positions</Text>
        </View>

        {holdings.length === 0 ? (
          <Text style={s.emptyText}>No holdings yet</Text>
        ) : (
          <View style={s.holdingsList}>
            {holdings.map((h, i) => (
              <Pressable
                key={h.key}
                onPress={() => {
                  navigation.navigate("Home", {
                    screen: "StockDetail",
                    params: {
                      symbol: h.symbol,
                      category: "us-stock",
                    },
                  });
                }}
                style={[
                  s.holdingRow,
                  i === 0 && s.rowFirst,
                  i === holdings.length - 1 && s.rowLast,
                ]}
              >
                <View style={s.holdingBadge}>
                  {h.imageUrl ? (
                    <Image
                      source={{ uri: h.imageUrl }}
                      style={s.holdingImage}
                    />
                  ) : (
                    <Text style={s.holdingBadgeLabel}>{h.initial}</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.holdingName}>{h.name}</Text>
                  <Text style={s.holdingUnits}>{h.units}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.holdingValue}>{h.value}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Recurring buys */}
        <View style={[s.sectionHeaderRow, s.holdingsHeaderGap]}>
          <Text style={s.sectionHeading}>Recurring buys</Text>
          <View style={s.sectionRule} />
          <Text style={s.sectionAside}>{activeCount} active</Text>
        </View>

        {recurringLoading ? (
          <View style={s.recurringLoadingRow}>
            <ActivityIndicator color={C.bone} size="small" />
          </View>
        ) : recurringError ? (
          <View style={s.errorRow}>
            <Text style={s.errorText}>{recurringError}</Text>
            <Pressable onPress={() => reloadRecurring()}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : sortedRecurring.length === 0 ? (
          <Text style={s.emptyText}>No recurring buys set up</Text>
        ) : (
          <View style={s.holdingsList}>
            <View style={s.holdingsList}>
              {sortedRecurring.map((item, i) => {
                const isCanceling = cancelingId === item.id;
                const typeLabel =
                  STOCK_TYPE_LABEL[item.stock.stockType] ??
                  item.stock.stockType;

                return (
                  <View
                    key={item.id}
                    style={[
                      s.recurringRow,
                      i === 0 && s.rowFirst,
                      i === sortedRecurring.length - 1 && s.rowLast,
                      !item.isActive && s.recurringRowInactive,
                    ]}
                  >
                    <View style={s.holdingBadge}>
                      {item.stock.imageUrl ? (
                        <Image
                          source={{ uri: item.stock.imageUrl }}
                          style={s.holdingImage}
                        />
                      ) : (
                        <Text style={s.holdingBadgeLabel}>
                          {item.stock.symbol.charAt(0)}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={s.recurringNameRow}>
                        <Text style={s.holdingName} numberOfLines={1}>
                          {item.stock.name}
                        </Text>
                        <View style={s.typeTag}>
                          <Text style={s.typeTagText}>{typeLabel}</Text>
                        </View>
                      </View>
                      <Text style={s.holdingUnits}>
                        {amountLabel(item)} · {formatBuyDate(item.buyDate)}
                      </Text>
                    </View>

                    {item.isActive ? (
                      <Pressable
                        onPress={() => handleCancel(item)}
                        disabled={isCanceling}
                        style={[
                          s.cancelBtn,
                          isCanceling && s.cancelBtnDisabled,
                        ]}
                        hitSlop={8}
                      >
                        {isCanceling ? (
                          <ActivityIndicator color={C.clay} size="small" />
                        ) : (
                          <Text style={s.cancelBtnText}>Cancel</Text>
                        )}
                      </Pressable>
                    ) : (
                      <View style={s.cancelledPill}>
                        <Ionicons
                          name="close-circle-outline"
                          size={12}
                          color={C.inkMuted}
                        />
                        <Text style={s.cancelledPillText}>Cancelled</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  topRow: { flexDirection: "row", alignItems: "center" },
  h1: {
    flex: 1,
    fontFamily: FONT.display800,
    fontSize: 30,
    letterSpacing: -1.4,
    color: C.bone,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  totalLabel: {
    marginTop: 12,
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkMuted,
  },
  totalValue: {
    marginTop: 6,
    fontFamily: FONT.display800,
    fontSize: 46,
    letterSpacing: -2.2,
    color: C.bone,
  },

  errorRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: { fontFamily: FONT.display400, fontSize: 13, color: C.clay },
  retryText: { fontFamily: FONT.display600, fontSize: 13, color: C.bone },

  gainRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  gainPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: "#10201A",
    borderWidth: 1,
    borderColor: "#1B3A2C",
  },
  gainText: { fontFamily: FONT.mono400, fontSize: 13, color: C.jade },
  gainNote: { fontFamily: FONT.display400, fontSize: 13, color: C.inkMuted },

  rangeRow: { marginTop: 18, flexDirection: "row", gap: 8 },
  rangePill: {
    flex: 1,
    height: 38,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rangePillActive: { backgroundColor: C.raised, borderColor: "#453D37" },
  rangeLabel: { fontFamily: FONT.display400, fontSize: 13, color: C.inkMuted },
  rangeLabelActive: { color: C.bone },

  card: {
    marginTop: 20,
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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

  allocBar: { marginTop: 14, flexDirection: "row", gap: 3, height: 14 },
  allocGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 10,
  },
  allocItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  allocDot: { width: 10, height: 10, borderRadius: 3 },
  allocLabel: {
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkSecondary,
  },
  allocValue: {
    marginTop: 2,
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.bone,
  },

  emptyText: {
    marginTop: 12,
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkMuted,
  },

  holdingsList: {
    marginTop: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  holdingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  rowFirst: { borderTopWidth: 0 },
  rowLast: {},
  holdingBadge: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  holdingBadgeLabel: { fontFamily: FONT.mono400, fontSize: 13, color: C.bone },
  holdingName: { fontFamily: FONT.display600, fontSize: 14, color: C.bone },
  recurringNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  typeTagText: {
    fontFamily: FONT.display600,
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: C.inkMuted,
  },
  holdingUnits: {
    marginTop: 3,
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkMuted,
  },
  holdingValue: { fontFamily: FONT.mono400, fontSize: 14, color: C.bone },

  holdingsHeaderGap: { marginTop: 24 },
  holdingImage: { width: 24, height: 24, borderRadius: 6 },

  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  recurringRowInactive: { opacity: 0.55 },
  recurringLoadingRow: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#3A2320",
    backgroundColor: "#1F1412",
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { fontFamily: FONT.display600, fontSize: 12, color: C.clay },
  cancelledPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.raised,
    minWidth: 64,
    justifyContent: "center",
  },
  cancelledPillText: {
    fontFamily: FONT.display500,
    fontSize: 11,
    color: C.inkMuted,
  },
});
