import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { C, RADIUS, FONT } from "../theme";
import { useStocks } from "../hooks";
import { AssetRow } from "../components";
import { StocksStackParamList } from "../navigation/types";

type SortMode = "priceDesc" | "priceAsc" | "name";
const SORT_LABEL: Record<SortMode, string> = {
  priceDesc: "Price high\u2013low",
  priceAsc: "Price low\u2013high",
  name: "Name",
};
const NEXT_SORT: Record<SortMode, SortMode> = {
  priceDesc: "priceAsc",
  priceAsc: "name",
  name: "priceDesc",
};

export function StocksScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<StocksStackParamList, "Stocks">>();
  const { stocks, loading, refreshing, error, refresh, reload } =
    useStocks("us-stock");
  const [sort, setSort] = useState<SortMode>("priceDesc");

  const rows = useMemo(() => {
    return [...stocks].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const diff = Number(a.price) - Number(b.price);
      return sort === "priceAsc" ? diff : -diff;
    });
  }, [stocks, sort]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            tintColor={C.bone}
          />
        }
      >
        <View style={s.topRow}>
          <Text style={s.h1}>Stocks</Text>
          <View style={{ flexGrow: 1 }} />
          <Pressable
            style={s.sortBtn}
            onPress={() => setSort((m) => NEXT_SORT[m])}
          >
            <Text style={s.sortLabel}>Sort · {SORT_LABEL[sort]}</Text>
          </Pressable>
        </View>
        <Text style={s.sub}>
          {loading ? "\u2026" : stocks.length} US-listed companies. Bought and
          settled on-chain with stablecoins, held in a wallet only you control.
        </Text>

        <View style={s.columnHeaderRow}>
          <Text style={s.columnHeading}>Company</Text>
          <Text style={s.columnHeading}>Price</Text>
        </View>

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <Pressable onPress={() => reload()}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={C.bone} />
        ) : !error && rows.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No stocks available</Text>
          </View>
        ) : (
          <View style={s.list}>
            {rows.map((item, i) => (
              <View
                key={item.tokenAddress}
                style={i > 0 ? s.rowDivider : undefined}
              >
                <AssetRow
                  symbol={item.symbol}
                  name={item.name}
                  price={Number(item.price)}
                  imageUrl={item.imageUrl}
                  onPress={() =>
                    navigation.navigate("StockDetail", {
                      symbol: item.symbol,
                      category: "us-stock",
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}

        <View style={s.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={C.inkMuted}
            style={{ marginTop: 1 }}
          />
          <Text style={s.infoText}>
            Every share settles <Text style={s.infoStrong}>on-chain</Text> and
            is bought with stablecoins. Prices refresh automatically about once
            a minute.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  topRow: { flexDirection: "row", alignItems: "center" },
  sortBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  sortLabel: {
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkSecondary,
  },
  h1: {
    marginTop: 8,
    fontFamily: FONT.display800,
    fontSize: 40,
    lineHeight: 38,
    letterSpacing: -2,
    color: C.bone,
  },
  sub: {
    marginTop: 10,
    fontFamily: FONT.display400,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSecondary,
  },
  columnHeaderRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  columnHeading: {
    flex: 1,
    fontFamily: FONT.display600,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.inkMuted,
  },
  errorBox: { marginTop: 12, gap: 4 },
  errorText: { fontFamily: FONT.display400, fontSize: 13, color: C.clay },
  retryText: { fontFamily: FONT.display600, fontSize: 13, color: C.bone },
  list: {
    marginTop: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.hairline },
  emptyBox: {
    marginTop: 10,
    padding: 24,
    alignItems: "center",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.card,
  },
  emptyText: { fontFamily: FONT.display400, fontSize: 13, color: C.inkMuted },
  infoCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: RADIUS.sm,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    flexDirection: "row",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: FONT.display400,
    fontSize: 12,
    lineHeight: 18,
    color: C.inkMuted,
  },
  infoStrong: { fontFamily: FONT.display600, color: C.bone },
});
