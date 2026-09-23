import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { C, RADIUS, FONT } from "../theme";
import {
  PREIPO_COMPANIES,
  type PreIpoCategory,
} from "../data/mockPreIpoCompanies";

const CATEGORIES: PreIpoCategory[] = [
  "AI",
  "Space",
  "Fintech",
  "Defence",
  "Data",
  "Gaming",
  "Software",
];

type SortMode = "discount" | "name";

function formatPrice(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function badgeInfo(pct: number | null) {
  if (pct === null) return { label: "at last round", color: C.inkMuted };
  if (pct < 0)
    return { label: `${Math.abs(pct).toFixed(1)}% discount`, color: C.jade };
  return { label: `${pct.toFixed(1)}% premium`, color: C.amber };
}

export function PreIpoScreen() {
  const navigation = useNavigation<any>();
  const [category, setCategory] = useState<PreIpoCategory | "All">("All");
  const [sort, setSort] = useState<SortMode>("discount");

  const rows = useMemo(() => {
    const filtered =
      category === "All"
        ? PREIPO_COMPANIES
        : PREIPO_COMPANIES.filter((c) => c.category === category);

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const av = a.vsLastRoundPct ?? 0;
      const bv = b.vsLastRoundPct ?? 0;
      return av - bv;
    });
  }, [category, sort]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topRow}>
          {navigation.canGoBack?.() ? (
            <Pressable style={s.iconBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={C.bone} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={{ flexGrow: 1 }} />
          <Pressable
            style={s.sortBtn}
            onPress={() =>
              setSort((m) => (m === "discount" ? "name" : "discount"))
            }
          >
            <Text style={s.sortLabel}>
              Sort · {sort === "discount" ? "Discount" : "Name"}
            </Text>
          </Pressable>
        </View>

        <Text style={s.h1}>Pre-IPO</Text>
        <Text style={s.sub}>
          {PREIPO_COMPANIES.length} private companies. You hold a token that
          tracks the last primary round, routed to whichever venue is cheapest.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          <Pressable
            onPress={() => setCategory("All")}
            style={[s.filterPill, category === "All" && s.filterPillActive]}
          >
            <Text
              style={[s.filterLabel, category === "All" && s.filterLabelActive]}
            >
              All {PREIPO_COMPANIES.length}
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const on = cat === category;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[s.filterPill, on && s.filterPillActive]}
              >
                <Text style={[s.filterLabel, on && s.filterLabelActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.columnHeaderRow}>
          <Text style={s.columnHeading}>Company</Text>
          <Text style={s.columnHeading}>Price / vs last round</Text>
        </View>

        <View style={s.list}>
          {rows.map((r, i) => {
            const badge = badgeInfo(r.vsLastRoundPct);
            return (
              <Pressable
                key={r.symbol}
                onPress={() =>
                  navigation.navigate("StockDetail", { symbol: r.symbol })
                }
                style={[
                  s.row,
                  i === 0 && s.rowFirst,
                  i === rows.length - 1 && s.rowLast,
                ]}
              >
                <View style={s.badge}>
                  <Text style={s.badgeLabel}>{r.initial}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rowName}>{r.name}</Text>
                  <Text style={s.rowSector} numberOfLines={1}>
                    {r.category} · last round {r.lastRound}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.rowPrice}>{formatPrice(r.price)}</Text>
                  <View
                    style={[
                      s.badgePill,
                      {
                        borderColor: badge.color + "44",
                        backgroundColor: badge.color + "14",
                      },
                    ]}
                  >
                    <Text style={[s.badgePillLabel, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
          {rows.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>
                No companies in this category yet.
              </Text>
            </View>
          )}
        </View>

        <View style={s.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={C.inkMuted}
            style={{ marginTop: 1 }}
          />
          <Text style={s.infoText}>
            A <Text style={s.infoStrong}>discount</Text> means the token trades
            below the company's last primary round; a premium means above.
            Private marks update on new rounds, not daily.
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
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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

  filterRow: { marginTop: 18, gap: 8, paddingRight: 4 },
  filterPill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: { backgroundColor: C.bone, borderColor: C.bone },
  filterLabel: {
    fontFamily: FONT.display500,
    fontSize: 13,
    color: C.inkSecondary,
  },
  filterLabelActive: { color: C.buttonInk },

  columnHeaderRow: {
    marginTop: 18,
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

  list: {
    marginTop: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  rowFirst: { borderTopWidth: 0 },
  rowLast: {},
  badge: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: { fontFamily: FONT.mono400, fontSize: 13, color: C.bone },
  rowName: { fontFamily: FONT.display600, fontSize: 15, color: C.bone },
  rowSector: {
    marginTop: 3,
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkMuted,
  },
  rowPrice: { fontFamily: FONT.mono400, fontSize: 15, color: C.bone },
  badgePill: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  badgePillLabel: { fontFamily: FONT.display400, fontSize: 11 },

  emptyBox: { padding: 24, alignItems: "center", backgroundColor: C.card },
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
