// src/screens/CollectionScreen.tsx — prototype #s-collection
// One screen for both collections; StocksScreen and PreIpoScreen render it.
//
//   ‹ Home
//   COLLECTION
//   Pre-IPOs                              ┐ rise in, 55ms apart
//   Private companies, priced off …       ┘
//   [All 8] [AI] [Space] [Fintech]      Sort · Price high–low
//   ┌ card ─────────────────────────────┐
//   │ SPA  SpaceX             LOCKED    │
//   │ PRICE   VS LAST ROUND  LAST ROUND │
//   └───────────────────────────────────┘

import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useStocks } from "../hooks";
import type { StockCategory } from "../services";
import type { HomeStackParamList } from "../navigation/HomeStack";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Badge, Chip, PressScale, Rise, Skeleton } from "../components/ui";
import { AssetAvatar } from "../components/AssetAvatar";
import { COLLECTIONS, toAsset, type Asset } from "../lib/assets";
import { money, pct } from "../lib/format";
import { hSelect, hTap } from "../lib/haptics";
import { PRE_IPO_LOCKED } from "../lib/trade";

type SortMode = "priceDesc" | "priceAsc" | "name";
const SORT_LABEL: Record<SortMode, string> = {
  priceDesc: "Price high–low",
  priceAsc: "Price low–high",
  name: "Name",
};
const NEXT_SORT: Record<SortMode, SortMode> = {
  priceDesc: "priceAsc",
  priceAsc: "name",
  name: "priceDesc",
};

const NOTE: Record<StockCategory, string> = {
  "us-stock":
    "Every share settles on-chain and is bought with stablecoins. Prices refresh automatically about once a minute.",
  "pre-ipo":
    "Private marks update on new rounds, not daily. You hold a token that tracks the last primary round.",
};

export function CollectionScreen({ category }: { category: StockCategory }) {
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const coll = COLLECTIONS[category];
  const { stocks, loading, refreshing, error, refresh, reload } =
    useStocks(category);

  const assets = useMemo(
    () => stocks.map((s) => toAsset(s, category)),
    [stocks, category],
  );
  const tags = useMemo(
    () =>
      Array.from(
        new Set(assets.map((a) => a.preIpo?.category).filter(Boolean)),
      ) as string[],
    [assets],
  );

  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<SortMode>("priceDesc");

  const list = useMemo(() => {
    const filtered =
      tag === "all" ? assets : assets.filter((a) => a.preIpo?.category === tag);
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return sort === "priceAsc" ? a.price - b.price : b.price - a.price;
    });
  }, [assets, tag, sort]);

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refresh()}
            tintColor={C.mint}
            colors={[C.mint]}
            progressBackgroundColor={C.raised}
          />
        }
      >
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Ionicons name="chevron-back" size={16} color={C.mint} />
          <Text style={s.backText}>Home</Text>
        </Pressable>

        <View style={s.header}>
          <Rise duration={460}>
            <Text style={TYPE.lbl}>COLLECTION</Text>
          </Rise>
          <Rise duration={460} delay={55}>
            <Text style={[TYPE.h1, h1Size(38)]} accessibilityRole="header">
              {coll.title}
            </Text>
          </Rise>
          <Rise duration={460} delay={110}>
            <Text style={TYPE.body}>{coll.blurb}</Text>
          </Rise>
        </View>

        <Rise duration={460} delay={165} style={s.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
            style={{ flex: 1 }}
          >
            <Chip
              label={`All ${loading ? "…" : assets.length}`}
              on={tag === "all"}
              onPress={() => setTag("all")}
            />
            {tags.map((t) => (
              <Chip
                key={t}
                label={t}
                on={tag === t}
                onPress={() => setTag(t)}
              />
            ))}
          </ScrollView>
          <Pressable
            onPress={() => {
              hSelect();
              setSort((m) => NEXT_SORT[m]);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${SORT_LABEL[sort]}. Tap to change.`}
          >
            <Text style={s.sort}>{SORT_LABEL[sort]} ↕</Text>
          </Pressable>
        </Rise>

        {error ? (
          <View style={s.errorRow}>
            <Text style={[TYPE.sub, { color: C.loss, flex: 1 }]}>{error}</Text>
            <Chip label="Retry" onPress={() => reload()} />
          </View>
        ) : null}

        <View style={s.list}>
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={122} radius={16} />
            ))
          ) : list.length === 0 ? (
            <Text style={[TYPE.sub, s.none]}>Nothing in this filter yet.</Text>
          ) : (
            list.map((a, i) => (
              // keyed with the filter + sort so the list re-cascades when they change
              <Rise
                key={`${tag}-${sort}-${a.symbol}`}
                delay={220 + Math.min(i, 8) * 40}
                duration={420}
              >
                <CollectionCard
                  a={a}
                  onPress={() =>
                    nav.navigate("StockDetail", {
                      symbol: a.symbol,
                      category: a.category,
                    })
                  }
                />
              </Rise>
            ))
          )}
        </View>

        <View style={s.note}>
          <Text style={s.noteDot}>●</Text>
          <Text style={s.noteText}>{NOTE[category]}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CollectionCard({ a, onPress }: { a: Asset; onPress: () => void }) {
  const isPre = a.kind === "Pre-IPO";
  const round = a.preIpo?.vsLastRoundPct;

  const stats: [string, string, string?][] = isPre
    ? [
        ["PRICE", money(a.price)],
        [
          "VS LAST ROUND",
          round == null ? "—" : pct(round),
          round == null ? undefined : round < 0 ? C.mint : C.loss,
        ],
        ["LAST ROUND", a.preIpo?.lastRound ?? "—"],
      ]
    : [
        ["PRICE", money(a.price)],
        ["OPEN", a.open != null ? money(a.open) : "—"],
        [
          "TODAY",
          a.change != null ? pct(a.change) : "—",
          a.change == null ? undefined : a.change >= 0 ? C.mint : C.loss,
        ],
      ];

  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={s.card}
      accessibilityRole="button"
      accessibilityLabel={`${a.name}, ${money(a.price)}`}
    >
      <View style={s.cardTop}>
        <AssetAvatar
          symbol={a.symbol}
          imageUrl={a.imageUrl}
          size={40}
          radius={12}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.cardName} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={TYPE.sub} numberOfLines={1}>
            {isPre && a.preIpo
              ? `${a.preIpo.category} · Pre-IPO`
              : `${a.symbol} · ${a.kind}`}
          </Text>
        </View>
      </View>

      <View style={s.stats}>
        {stats.map(([k, v, color]) => (
          <View key={k} style={s.stat}>
            <Text style={s.statKey}>{k}</Text>
            <Text
              style={[s.statVal, color ? { color } : null]}
              numberOfLines={1}
            >
              {v}
            </Text>
          </View>
        ))}
      </View>
    </PressScale>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 40, gap: 20 },

  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    minHeight: 44,
    marginLeft: -4,
    marginBottom: -12,
  },
  backText: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },

  header: { gap: 8 },

  filterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  chips: { gap: 8, paddingRight: 8 },
  sort: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.mint },

  list: { gap: 10 },
  none: { fontSize: 13.5, lineHeight: 21, paddingVertical: 14 },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, gap: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardName: {
    fontFamily: FONT.sans800,
    fontSize: 17,
    letterSpacing: em(17, -0.04),
    color: C.ink1,
  },
  fig: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },

  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, gap: 4 },
  statKey: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.14),
    color: C.ink4,
  },
  statVal: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  note: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.sunk,
    borderRadius: 18,
    padding: 16,
  },
  noteDot: { color: C.mint, fontSize: 13, lineHeight: 17 },
  noteText: {
    flex: 1,
    fontFamily: FONT.sans400,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink2,
  },
});
