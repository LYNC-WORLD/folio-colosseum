import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme/colors";
import AssetRow from "../components/AssetRow";
import { useStocks } from "../hooks/useStocks";
import { StocksStackParamList } from "../navigation/types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWalletBalance } from "../hooks/useWalletBalance";

export default function StocksScreen() {
  const insets = useSafeAreaInsets();
  const { stocks, loading, refreshing, error, refresh, reload } = useStocks();
  const { usdValue } = useWalletBalance();

  const balance = usdValue;
  const dayChangePct = 0;

  const navigation =
    useNavigation<NativeStackNavigationProp<StocksStackParamList, "Stocks">>();

  return (
    <View
      style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <FlatList
        data={stocks}
        keyExtractor={(item) => item.tokenAddress}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
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

            <Text style={s.sectionTitle}>Available Stocks</Text>

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
                <Pressable onPress={() => reload()}>
                  <Text style={s.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <AssetRow
            symbol={item.symbol}
            name={item.name}
            price={Number(item.price)}
            imageUrl={item.imageUrl}
            onPress={() =>
              navigation.navigate("StockDetail", { symbol: item.symbol })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : !error ? (
            <Text style={s.emptyText}>No stocks available</Text>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
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
  sectionTitle: {
    color: C.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  separator: { height: 1, backgroundColor: C.ring, marginLeft: 52 },
  errorBox: { paddingVertical: 12, gap: 4 },
  errorText: { color: C.error, fontSize: 13 },
  retryText: { color: C.accent, fontSize: 13, fontWeight: "600" },
  emptyText: { color: C.muted, textAlign: "center", marginTop: 24 },
});
