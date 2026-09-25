// Transactions — every buy and sale, grouped by month, in the prototype's row style.
import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../context";
import { useUserTransactions } from "../hooks/useUserRecords";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE } from "../theme";
import { Button, Rise, Skeleton } from "../components/ui";
import { BackLink } from "../components/BackLink";
import { AssetAvatar } from "../components/AssetAvatar";
import { money } from "../lib/format";
import { units } from "../lib/trade";
import { isSell, txUsd } from "../lib/transactions";
import type { UserTransaction } from "../services/user";

export function TransactionsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const { idToken } = useAuth();
  const q = useUserTransactions(idToken ?? undefined);

  const groups = useMemo(() => {
    const list = [...(q.data?.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const out: [string, UserTransaction[]][] = [];
    for (const tx of list) {
      const key = new Date(tx.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase();
      const g = out.find(([k]) => k === key);
      if (g) g[1].push(tx);
      else out.push([key, [tx]]);
    }
    return out;
  }, [q.data]);

  let row = 0;

  return (
    <View style={s.safe}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={C.mint} colors={[C.mint]} progressBackgroundColor={C.raised} />
        }
      >
        <BackLink onPress={() => nav.goBack()} />
        <View style={{ gap: 8 }}>
          <Rise duration={460}>
            <Text style={TYPE.lbl}>ACTIVITY</Text>
          </Rise>
          <Rise duration={460} delay={55}>
            <Text style={TYPE.h1} accessibilityRole="header">
              Transactions
            </Text>
          </Rise>
        </View>

        {q.isPending ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={46} radius={12} />
            ))}
          </View>
        ) : q.isError ? (
          <View style={s.wash}>
            <Text style={[TYPE.sub, { color: C.loss }]}>Couldn't load your transactions.</Text>
            <Button variant="quiet" size="sm" title="Try again" onPress={() => q.refetch()} style={{ alignSelf: "flex-start", width: 140 }} />
          </View>
        ) : groups.length === 0 ? (
          <View style={[s.wash, { gap: 8 }]}>
            <Text style={TYPE.ttl}>Nothing yet</Text>
            <Text style={[TYPE.sub, { fontSize: 13 }]}>Your buys and sales will show up here.</Text>
          </View>
        ) : (
          groups.map(([month, txs]) => (
            <View key={month} style={{ gap: 2 }}>
              <Text style={[TYPE.lbl, { marginBottom: 4 }]}>{month}</Text>
              {txs.map((tx, i) => {
                const sold = isSell(tx);
                const delay = 110 + Math.min(row++, 12) * 40;
                return (
                  <Rise key={tx.id} delay={delay} duration={400}>
                    <View style={[s.row, i < txs.length - 1 && s.hair]}>
                      <AssetAvatar symbol={tx.stock?.symbol ?? "?"} imageUrl={tx.stock?.imageUrl} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={TYPE.ttl} numberOfLines={1}>
                          {sold ? "Sold" : "Bought"} {tx.stock?.symbol ?? "—"}
                        </Text>
                        <Text style={TYPE.sub} numberOfLines={1}>
                          {units(Number(tx.amount))} at {money(Number(tx.price))} ·{" "}
                          {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </Text>
                      </View>
                      <Text style={[s.fig, { color: sold ? C.mint : "#D6DAE0" }]}>
                        {sold ? "+" : "−"}
                        {money(txUsd(tx))}
                      </Text>
                    </View>
                  </Rise>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20, gap: 22 },
  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16, gap: 10 },
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  fig: { fontFamily: FONT.mono400, fontSize: 13, fontVariant: ["tabular-nums"] },
});
