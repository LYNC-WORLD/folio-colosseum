// Standing orders — prototype #s-recurring
//
//   ‹ Back
//   RECURRING
//   Standing orders
//   ┌ NEXT 30 DAYS ───────────────┐
//   │ $120                        │  counts up
//   │ Pulled from your USDC …     │
//   └─────────────────────────────┘
//   ACTIVE
//   [ NVDA            $100.00 ]
//   [ MONTHLY · NEXT FRI 12 OCT  ● ACTIVE ]
//   [ Cancel recurring buy ]
//   ENDED (dimmed)
//   [ New recurring buy ]

import { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useRecurringBuys } from "../hooks/useTrade";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { useTabBarSpace } from "../navigation/TabBar";
import { useCountUp } from "../hooks/useCountUp";
import { C, FONT, TYPE, em } from "../theme";
import { Button, PressScale, Rise, Skeleton } from "../components/ui";
import { BackLink } from "../components/BackLink";
import { AssetAvatar } from "../components/AssetAvatar";
import { AssetPickerSheet } from "../components/AssetPickerSheet";
import { CancelRecurringFlow } from "../components/trade/CancelRecurringFlow";
import { useSheet } from "../components/Sheet";
import { money, money0 } from "../lib/format";
import { dayDate } from "../lib/trade";
import { hTap } from "../lib/haptics";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "RecurringBuys">;

export function RecurringBuysScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const sheet = useSheet();
  const { recurringBuys, loading, error, reload } = useRecurringBuys();

  const active = useMemo(() => recurringBuys.filter((r) => r.isActive), [recurringBuys]);
  const ended = useMemo(() => recurringBuys.filter((r) => !r.isActive), [recurringBuys]);

  // monthly orders → each runs once in the next 30 days
  const next30 = active.reduce((t, r) => t + (Number(r.usdcAmount) || Number(r.stockAmount) * Number(r.stock.price) || 0), 0);
  const shownTotal = useCountUp(next30);

  const amountOf = (r: (typeof recurringBuys)[number]) =>
    r.usdcAmount ? money(Number(r.usdcAmount)) : `${r.stockAmount} ${r.stock.symbol}`;

  const openStock = (symbol: string, stockType: string) =>
    (nav.getParent() as any)?.navigate("Home", {
      screen: "StockDetail",
      params: { symbol, category: stockType === "PreIPO" ? "pre-ipo" : "us-stock" },
      initial: false,
    });

  const startNew = () =>
    sheet.open(
      <AssetPickerSheet
        taken={new Set(active.map((r) => r.stockAddress))}
        onPick={({ stock, category }) => {
          sheet.close();
          setTimeout(
            () =>
              nav.navigate("RecurringNew", {
                symbol: stock.symbol,
                name: stock.name,
                tokenAddress: stock.tokenAddress,
                price: Number(stock.price),
                category,
              }),
            260,
          );
        }}
      />,
      { label: "Choose an asset" },
    );

  return (
    <View style={s.safe}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => reload()} tintColor={C.mint} colors={[C.mint]} progressBackgroundColor={C.raised} />
        }
      >
        <BackLink onPress={() => nav.goBack()} />

        <View style={{ gap: 8 }}>
          <Rise duration={460}>
            <Text style={TYPE.lbl}>RECURRING</Text>
          </Rise>
          <Rise duration={460} delay={55}>
            <Text style={TYPE.h1} accessibilityRole="header">
              Standing orders
            </Text>
          </Rise>
        </View>

        <Rise duration={460} delay={110}>
          <View style={s.wash}>
            <Text style={TYPE.lbl}>NEXT 30 DAYS</Text>
            <Text style={s.total}>{loading ? "…" : money0(shownTotal)}</Text>
            <Text style={s.washNote}>Pulled from your USDC balance. Cancel any time.</Text>
          </View>
        </Rise>

        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} height={150} radius={16} />
            ))}
          </View>
        ) : error ? (
          <View style={s.wash}>
            <Text style={[TYPE.sub, { color: C.loss }]}>Couldn't load your standing orders.</Text>
            <Button variant="quiet" size="sm" title="Try again" onPress={() => reload()} style={{ alignSelf: "flex-start", width: 140 }} />
          </View>
        ) : active.length === 0 && ended.length === 0 ? (
          <Rise delay={165}>
            <View style={[s.wash, { gap: 8 }]}>
              <Text style={TYPE.ttl}>No standing orders</Text>
              <Text style={[TYPE.sub, { fontSize: 13, lineHeight: 20 }]}>
                Start one below, or open any stock or pre-IPO and choose Recurring to buy it on a schedule.
              </Text>
            </View>
          </Rise>
        ) : (
          <View style={{ gap: 10 }}>
            {active.length ? <Text style={TYPE.lbl}>ACTIVE</Text> : null}
            {active.map((r, i) => (
              <Rise key={r.id} delay={165 + i * 55} duration={420}>
                <View style={s.card}>
                  <PressScale
                    scaleTo={0.985}
                    onPress={() => {
                      hTap();
                      openStock(r.stock.symbol, r.stock.stockType);
                    }}
                    style={s.cardTop}
                    accessibilityRole="button"
                  >
                    <AssetAvatar symbol={r.stock.symbol} imageUrl={r.stock.imageUrl} size={40} radius={12} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={s.sym}>{r.stock.symbol}</Text>
                      <Text style={TYPE.sub} numberOfLines={1}>
                        {r.stock.name}
                      </Text>
                    </View>
                    <Text style={s.amt}>{amountOf(r)}</Text>
                  </PressScale>

                  <View style={s.metaRow}>
                    <Text style={s.meta}>MONTHLY · NEXT {dayDate(new Date(r.buyDate)).toUpperCase()}</Text>
                    <View style={s.status}>
                      <View style={s.dot} />
                      <Text style={[s.meta, { color: C.mint }]}>ACTIVE</Text>
                    </View>
                  </View>

                  <View style={s.cancelRow}>
                    <PressScale
                      scaleTo={0.97}
                      onPress={() =>
                        sheet.open(
                          <CancelRecurringFlow
                            recurringId={r.id}
                            symbol={r.stock.symbol}
                            label={`${amountOf(r)} every month`}
                            onCancelled={() => reload()}
                          />,
                          { label: "Cancel recurring buy" },
                        )
                      }
                      style={s.linkDanger}
                      accessibilityRole="button"
                    >
                      <Text style={s.linkDangerText}>Cancel recurring buy</Text>
                    </PressScale>
                  </View>
                </View>
              </Rise>
            ))}

            {ended.length ? <Text style={[TYPE.lbl, { color: C.ink4, marginTop: 14 }]}>ENDED</Text> : null}
            {ended.map((r) => (
              <View key={r.id} style={s.endedRow}>
                <AssetAvatar symbol={r.stock.symbol} imageUrl={r.stock.imageUrl} size={34} radius={10} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[TYPE.ttl, { color: C.ink2 }]}>{r.stock.symbol}</Text>
                  <Text style={TYPE.sub}>{amountOf(r)} every month · cancelled</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Rise delay={220}>
          <Button title="New recurring buy" onPress={startNew} />
        </Rise>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20, gap: 20 },

  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16, gap: 10 },
  total: { fontFamily: FONT.mono400, fontSize: 26, letterSpacing: em(26, -0.03), color: C.ink1, fontVariant: ["tabular-nums"] },
  washNote: { fontFamily: FONT.sans400, fontSize: 12.5, color: C.ink2 },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  sym: { fontFamily: FONT.sans800, fontSize: 17, letterSpacing: em(17, -0.04), color: C.ink1 },
  amt: { fontFamily: FONT.mono400, fontSize: 18, letterSpacing: em(18, -0.02), color: C.ink1, fontVariant: ["tabular-nums"] },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  meta: { flex: 0, fontFamily: FONT.mono400, fontSize: 9.5, letterSpacing: em(9.5, 0.14), color: C.ink4 },
  status: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: C.mint },
  cancelRow: { paddingTop: 4, borderTopWidth: 1, borderTopColor: C.hair },
  linkDanger: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center" },
  linkDangerText: { fontFamily: FONT.sans600, fontSize: 13.5, color: C.loss },

  endedRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, opacity: 0.6, borderBottomWidth: 1, borderBottomColor: C.hair },
});
