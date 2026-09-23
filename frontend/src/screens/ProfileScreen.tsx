import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { C } from "../theme/colors";
import StatCard from "../components/StatCard";
import { TabParamList } from "../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWalletBalance } from "../hooks/useWalletBalance";

const PERIODS = ["24h", "7d", "30d", "All"] as const;
type Period = (typeof PERIODS)[number];

function truncateAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { wallet, usdValue } = useWalletBalance();

  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [period, setPeriod] = useState<Period>("24h");
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const walletAddress =
    wallet?.walletAddress ?? "0x0000000000000000000000000000000000dEaD";
  const balance = usdValue;

  // console.log("ProfileScreen: walletAddress", walletAddress);
  // console.log("ProfileScreen: usdValue", usdValue);

  const totalInvested = (user as any).totalInvested ?? 0;
  const totalPnl = (user as any).totalPnl ?? 0;
  const totalTrades = (user as any).totalTrades ?? 0;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable style={s.iconBtn} onPress={handleCopy}>
            <Ionicons
              name={copied ? "checkmark" : "wallet-outline"}
              size={18}
              color={copied ? C.success : C.ink}
            />
          </Pressable>
          <Pressable style={s.iconBtn}>
            <Ionicons name="settings-outline" size={18} color={C.ink} />
          </Pressable>
        </View>

        <View style={s.identity}>
          {user.photo ? (
            <Image source={{ uri: user.photo }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <Text style={s.name}>{user.name}</Text>
          <Pressable onPress={handleCopy} style={s.handleRow}>
            <Text style={s.handle}>{truncateAddress(walletAddress)}</Text>
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={14}
              color={C.muted}
            />
          </Pressable>
          <Text style={s.email}>{user.email}</Text>
        </View>

        <View style={s.balanceSection}>
          <View style={s.periodTabs}>
            {PERIODS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[s.periodPill, period === p && s.periodPillActive]}
              >
                <Text
                  style={[s.periodText, period === p && s.periodTextActive]}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.balanceValue}>{formatCurrency(balance)}</Text>
          <Text style={s.balanceSub}>
            {balance === 0 ? "No balance yet" : `${period} performance`}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dashboard</Text>
          <View style={s.statGrid}>
            <StatCard
              label="Total Invested"
              value={formatCurrency(totalInvested)}
            />
            <StatCard
              label="Total P&L"
              value={`${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}`}
              valueColor={totalPnl >= 0 ? C.success : C.error}
            />
          </View>
          <View style={s.statGrid}>
            <StatCard label="Portfolio Value" value={formatCurrency(balance)} />
            <StatCard label="Total Trades" value={String(totalTrades)} />
          </View>

          {totalInvested === 0 && (
            <Pressable
              style={s.exploreBtn}
              onPress={() => navigation.navigate("Stocks")}
            >
              <Text style={s.exploreText}>Explore Stocks</Text>
              <Ionicons name="arrow-forward" size={16} color={C.buttonInk} />
            </Pressable>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="mail-outline" size={18} color={C.accent} />
              <Text style={s.rowValue}>{user.email}</Text>
            </View>
          </View>
          <Pressable style={s.row} onPress={handleCopy}>
            <View style={s.rowLeft}>
              <Ionicons name="wallet-outline" size={18} color={C.accent} />
              <Text style={s.rowValue}>{truncateAddress(walletAddress)}</Text>
            </View>
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={18}
              color={copied ? C.success : C.muted}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [s.signOut, pressed && s.signOutPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color={C.error} />
          <Text style={s.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, paddingBottom: 48, gap: 24 },

  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 8, gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.ring,
  },

  identity: { alignItems: "center", gap: 4 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarFallback: {
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.ring,
  },
  avatarInitial: { color: C.ink, fontSize: 30, fontWeight: "700" },
  name: { color: C.ink, fontSize: 21, fontWeight: "700", marginTop: 10 },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  handle: { color: C.accent, fontSize: 14, fontWeight: "600" },
  email: { color: C.muted, fontSize: 13, marginTop: 2 },

  balanceSection: { alignItems: "center", gap: 6, paddingVertical: 8 },
  periodTabs: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 4,
    gap: 2,
    marginBottom: 12,
  },
  periodPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  periodPillActive: { backgroundColor: C.ink },
  periodText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  periodTextActive: { color: C.buttonInk },
  balanceValue: {
    color: C.ink,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  balanceSub: { color: C.muted, fontSize: 13 },

  section: { gap: 10 },
  sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "700" },
  statGrid: { flexDirection: "row", gap: 12 },

  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  exploreText: { color: C.buttonInk, fontSize: 14, fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.ring,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowValue: { color: C.ink, fontSize: 15, fontWeight: "500" },

  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,143,143,0.25)",
  },
  signOutPressed: { opacity: 0.7 },
  signOutText: { color: C.error, fontSize: 15, fontWeight: "600" },
});
