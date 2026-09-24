import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStocks } from "../hooks";
import type { HomeStackParamList } from "../navigation";
import { C, FONT, RADIUS } from "../theme";
import { OnboardingProfile, useAuth } from "../context";
import { Stock } from "../types";
import { getOnboardingProfile } from "../lib";
import { SafeScreen } from "../components";
import { useWallet } from "../context/WalletContext";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function HomeScreen() {
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { stocks, loading, error } = useStocks("us-stock");
  const { stocks: preIpoStocks, loading: preIpoLoading } = useStocks("pre-ipo");
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const { usdValue, loading: walletLoading, error: walletError } = useWallet();

  useEffect(() => {
    getOnboardingProfile().then(setProfile);
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";

  const popular = stocks.slice(0, 4);
  const picks = stocks.length > 4 ? stocks.slice(4, 7) : stocks.slice(0, 3);

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + balance */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{firstName}</Text>
          </View>
          <View style={s.balancePill}>
            <View
              style={[
                s.balanceDot,
                walletError ? { backgroundColor: C.clay } : null,
              ]}
            />
            {walletLoading ? (
              <ActivityIndicator size="small" color={C.bone} />
            ) : (
              <Text style={s.balanceText}>
                {walletError ? "—" : money(usdValue)}
              </Text>
            )}
          </View>
        </View>

        {/* Popular right now */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeading}>Popular right now</Text>
          <View style={s.sectionRule} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 14 }} color={C.bone} />
        ) : error ? (
          <Text style={s.errorText}>{error}</Text>
        ) : popular.length === 0 ? (
          <Text style={s.emptyText}>No assets available yet.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.popularRow}
          >
            {popular.map((item) => (
              <PopularCard
                key={item.tokenAddress}
                stock={item}
                navigation={navigation}
              />
            ))}
          </ScrollView>
        )}

        {/* Collections */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionHeading}>Collections</Text>
          <View style={s.sectionRule} />
        </View>

        <View style={s.collectionsGrid}>
          <Pressable
            onPress={() => navigation.navigate("Stocks")}
            style={s.collectionTile}
          >
            <View
              style={[
                s.collectionIcon,
                { borderColor: C.series.usStocks + "40" },
              ]}
            >
              <Ionicons
                name="bar-chart-outline"
                size={18}
                color={C.series.usStocks}
              />
            </View>
            <Text style={s.collectionName}>US Stocks</Text>
            <Text style={s.collectionNote}>The full listed catalogue</Text>
            <Text style={s.collectionCount}>
              {loading ? "…" : `${stocks.length} assets`}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("PreIPO")}
            style={s.collectionTile}
          >
            <View
              style={[
                s.collectionIcon,
                { borderColor: C.series.preIpo + "40" },
              ]}
            >
              <Ionicons
                name="rocket-outline"
                size={18}
                color={C.series.preIpo}
              />
            </View>
            <Text style={s.collectionName}>Pre-IPO</Text>
            <Text style={s.collectionNote}>Private names, tokenized</Text>
            <Text style={s.collectionCount}>
              {preIpoLoading ? "…" : `${preIpoStocks.length} assets`}
            </Text>
          </Pressable>
        </View>

        {/* Personalized picks, derived from onboarding */}
        {profile && picks.length > 0 && (
          <>
            <View style={s.picksHeader}>
              <Text style={s.picksEyebrow}>
                For {profile.title.replace(/^The /, "a ")}
              </Text>
              <Text style={s.sectionHeading}>{profile.tagline}</Text>
            </View>

            <View style={s.picksList}>
              {picks.map((item, i) => (
                <View
                  key={item.tokenAddress}
                  style={[
                    s.pickRow,
                    i === 0 && s.pickRowFirst,
                    i === picks.length - 1 && s.pickRowLast,
                  ]}
                >
                  <View style={s.pickBadge}>
                    <Text style={s.pickBadgeLabel}>
                      {item.symbol.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickName}>{item.name}</Text>
                    <Text style={s.pickSymbol}>{item.symbol}</Text>
                  </View>
                  <Text style={s.pickPrice}>{money(Number(item.price))}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

function PopularCard({
  stock,
  navigation,
}: {
  stock: Stock;
  navigation: NativeStackNavigationProp<HomeStackParamList>;
}) {
  return (
    <Pressable
      onPress={() =>
        navigation.navigate("StockDetail", {
          symbol: stock.symbol,
          category: "us-stock",
        })
      }
      style={s.popularCard}
    >
      <View style={s.popularTop}>
        <View style={s.popularBadge}>
          {stock.imageUrl ? (
            <Image
              source={{ uri: stock.imageUrl }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <Text
              style={{ fontFamily: FONT.mono400, fontSize: 13, color: C.bone }}
            >
              {stock?.symbol?.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <Text style={s.popularTicker}>{stock.symbol}</Text>
      </View>

      <Text style={s.popularName} numberOfLines={1}>
        {stock.name}
      </Text>

      <Text style={s.popularPrice}>{money(Number(stock.price))}</Text>

      <View style={s.popularFooter}>
        <Ionicons name="chevron-forward" size={14} color={C.inkMuted} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontFamily: FONT.display400, fontSize: 13, color: C.inkMuted },
  name: {
    marginTop: 2,
    fontFamily: FONT.display600,
    fontSize: 20,
    color: C.bone,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  balanceDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.jade },
  balanceText: { fontFamily: FONT.mono400, fontSize: 14, color: C.bone },
  sectionHeaderRow: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeading: {
    fontFamily: FONT.display600,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.inkMuted,
  },
  sectionRule: { flexGrow: 1, height: 1, backgroundColor: C.hairline },
  errorText: {
    marginTop: 14,
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.clay,
  },
  emptyText: {
    marginTop: 14,
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkMuted,
  },
  popularRow: { marginTop: 14, gap: 12, paddingRight: 4 },
  popularCard: {
    width: 150,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  popularTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  popularBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  popularTicker: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    letterSpacing: 0.5,
    color: C.inkSecondary,
  },
  popularName: {
    marginTop: 10,
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkMuted,
  },
  popularPrice: {
    marginTop: 8,
    fontFamily: FONT.mono500,
    fontSize: 19,
    color: C.bone,
  },
  popularFooter: { marginTop: 8, alignItems: "flex-end" },
  collectionsGrid: { marginTop: 14, flexDirection: "row", gap: 12 },
  collectionTile: {
    flex: 1,
    minHeight: 148,
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  collectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.raised,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionName: {
    marginTop: 14,
    fontFamily: FONT.display600,
    fontSize: 15,
    color: C.bone,
  },
  collectionNote: {
    marginTop: 4,
    fontFamily: FONT.display400,
    fontSize: 12,
    lineHeight: 17,
    color: C.inkMuted,
  },
  collectionCount: {
    marginTop: 12,
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkSecondary,
  },
  picksHeader: { marginTop: 28, gap: 8 },
  picksEyebrow: {
    fontFamily: FONT.display600,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: C.bone,
  },
  picksList: {
    marginTop: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  pickRowFirst: { borderTopWidth: 0 },
  pickRowLast: {},
  pickBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBadgeLabel: { fontFamily: FONT.mono500, fontSize: 12, color: C.bone },
  pickName: { fontFamily: FONT.display600, fontSize: 14, color: C.bone },
  pickSymbol: {
    marginTop: 2,
    fontFamily: FONT.mono400,
    fontSize: 11,
    color: C.inkMuted,
  },
  pickPrice: { fontFamily: FONT.mono400, fontSize: 14, color: C.bone },
});
