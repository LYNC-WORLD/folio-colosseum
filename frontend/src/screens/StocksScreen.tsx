// src/screens/StocksScreen.tsx
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import AssetRow from "../components/AssetRow";
import { MOCK_STOCKS } from "../data/mockStocks";
import { useAuth } from "../context/AuthContext";

const FILTERS = ["All", "Trending", "Gainers", "Losers"] as const;
type Filter = (typeof FILTERS)[number];

export default function StocksScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("All");

  const balance = (user as any)?.balance ?? 0;
  const dayChangePct = (user as any)?.dayChangePct ?? 0;

  const stocks =
    filter === "Gainers"
      ? MOCK_STOCKS.filter((s) => s.changePct >= 0)
      : filter === "Losers"
        ? MOCK_STOCKS.filter((s) => s.changePct < 0)
        : MOCK_STOCKS;

  return (
    <View
      style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <FlatList
        data={stocks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.balanceRow}>
              <View>
                <Text style={s.balanceLabel}>Your Balance</Text>
                <Text style={s.balanceValue}>
                  {balance.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                  })}
                </Text>
                <Text
                  style={[
                    s.balanceChange,
                    { color: dayChangePct >= 0 ? C.success : C.error },
                  ]}
                >
                  {dayChangePct === 0
                    ? "--"
                    : `${dayChangePct >= 0 ? "▲" : "▼"} ${Math.abs(dayChangePct).toFixed(2)}% today`}
                </Text>
              </View>
              <Pressable style={s.depositBtn}>
                <Ionicons name="add" size={18} color={C.buttonInk} />
                <Text style={s.depositText}>Deposit</Text>
              </Pressable>
            </View>

            <View style={s.filters}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[s.pill, filter === f && s.pillActive]}
                >
                  <Text style={[s.pillText, filter === f && s.pillTextActive]}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionTitle}>Available Stocks</Text>
          </>
        }
        renderItem={({ item }) => (
          <AssetRow
            symbol={item.symbol}
            name={item.name}
            price={item.price}
            changePct={item.changePct}
            marketCap={item.marketCap}
            color={item.color}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  balanceLabel: { color: C.muted, fontSize: 13, fontWeight: "600" },
  balanceValue: {
    color: C.ink,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  balanceChange: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  depositBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  depositText: { color: C.buttonInk, fontSize: 14, fontWeight: "700" },
  filters: { flexDirection: "row", gap: 8, marginBottom: 20 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.ring,
  },
  pillActive: { backgroundColor: C.ink, borderColor: C.ink },
  pillText: { color: C.muted, fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: C.buttonInk },
  sectionTitle: {
    color: C.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  separator: { height: 1, backgroundColor: C.ring, marginLeft: 52 },
});
