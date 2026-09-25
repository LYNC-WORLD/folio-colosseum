import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { C } from "../theme";
import { SafeScreen } from "../components";
import { useAuth } from "../context";
import { useUserTransactions } from "../hooks/useUserRecords";

function formatAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return String(value);
  }

  return num.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TransactionItem({ item }: { item: any }) {
  const isBuy = item.type === "BUY";

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.left}>
          {item.stock?.imageUrl ? (
            <Image source={{ uri: item.stock.imageUrl }} style={s.image} />
          ) : null}

          <View style={s.assetInfo}>
            <Text style={s.symbol}>{item.stock?.symbol ?? "Unknown"}</Text>

            <Text style={s.subtitle}>
              {item.stock?.name ?? "Unknown stock"}
            </Text>
          </View>
        </View>

        <View style={s.right}>
          <Text
            style={[
              s.type,
              {
                color: isBuy ? C.success : C.error,
              },
            ]}
          >
            {item.type}
          </Text>

          <Text style={s.amount}>{formatAmount(item.amount)}</Text>
        </View>
      </View>

      <View style={s.bottomRow}>
        <Text style={s.date}>{formatDate(item.createdAt)}</Text>

        <Text style={s.price}>${formatAmount(item.price)}</Text>
      </View>
    </View>
  );
}

export function TransactionsScreen() {
  const { idToken } = useAuth();

  const transactionsQuery = useUserTransactions(idToken!);

  const data = transactionsQuery.data?.data ?? [];

  if (transactionsQuery.isLoading) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <ActivityIndicator color={C.ink} />
          <Text style={s.subtitle}>Loading...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (transactionsQuery.isError) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={s.error}>Failed to load transactions.</Text>

          <Pressable onPress={() => transactionsQuery.refetch()}>
            <Text style={s.retry}>Tap to retry</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={s.container}>
        <Text style={s.title}>Transactions</Text>

        <FlatList
          data={data}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={({ item }) => <TransactionItem item={item} />}
          contentContainerStyle={s.list}
          refreshing={transactionsQuery.isFetching}
          onRefresh={transactionsQuery.refetch}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.subtitle}>No transactions found.</Text>
            </View>
          }
        />
      </View>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  title: {
    color: C.ink,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 20,
  },

  list: {
    gap: 12,
    paddingBottom: 32,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  assetInfo: {
    flex: 1,
    gap: 4,
  },

  right: {
    alignItems: "flex-end",
    gap: 4,
  },

  image: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  symbol: {
    color: C.ink,
    fontSize: 16,
    fontWeight: "700",
  },

  subtitle: {
    color: C.muted,
    fontSize: 13,
  },

  type: {
    fontSize: 12,
    fontWeight: "700",
  },

  amount: {
    color: C.ink,
    fontSize: 16,
    fontWeight: "600",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  date: {
    color: C.muted,
    fontSize: 12,
  },

  price: {
    color: C.muted,
    fontSize: 12,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },

  error: {
    color: C.error,
    textAlign: "center",
  },

  retry: {
    color: C.ink,
    textDecorationLine: "underline",
  },
});
