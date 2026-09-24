import { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useWallet } from "../context";
import { C } from "../theme";
import { SafeScreen } from "../components";
import {
  useUserRecurringBuyAssets,
  useUserTransactions,
} from "../hooks/useUserRecords";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../navigation/ProfileStack";

const MONO = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});
const APP_VERSION = "0.9.2";

/* ---------------- helpers ---------------- */

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
function formatUsdc(n: number) {
  return `${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDC`;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function formatShortDate(d?: string | number | Date) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ---------------- small pieces ---------------- */

/** 2x2 quadrant avatar derived from the wallet address, using theme colors. */
function WalletAvatar({
  address,
  size = 60,
}: {
  address?: string | null;
  size?: number;
}) {
  const palette = [C.accent, C.success, C.ink, C.card, C.muted];
  const seed = (address ?? "0x00000000").replace(/^0x/, "");
  const colors = [0, 1, 2, 3].map(
    (i) => palette[parseInt(seed.charAt(i * 2) || "0", 16) % palette.length],
  );
  const half = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: half,
        overflow: "hidden",
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      {colors.map((c, i) => (
        <View
          key={i}
          style={{ width: half, height: half, backgroundColor: c }}
        />
      ))}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={s.sectionLabelRow}>
      <Text style={s.sectionLabel}>{children}</Text>
      <View style={s.sectionLabelLine} />
    </View>
  );
}

function Row({
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.row, !last && s.divider, pressed && s.pressed]}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={s.rowSub}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

const Chevron = () => (
  <Ionicons name="chevron-forward" size={18} color={C.muted} />
);

/* ---------------- screen ---------------- */

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const {
    walletAddress,
    usdValue,
    loading: walletLoading,
    error: walletError,
    refresh,
  } = useWallet();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const [copied, setCopied] = useState(false);
  const [pulling, setPulling] = useState(false);

  if (!user) return null;
  const u = user as any;

  // ---- data (swap these for real fields once the backend exposes them) ----
  const pnl30dPct: number = u.pnl30dPct ?? 0;
  const followers: number = u.followers ?? 0;
  const following: number = u.following ?? 0;

  const walletProvider: string | undefined = u.walletProvider;
  const walletChain: string | undefined = u.walletChain ?? "Base";
  const walletConnectedAt = formatShortDate(u.walletConnectedAt);

  const displayAddress = walletAddress
    ? truncateAddress(walletAddress)
    : walletLoading
      ? "Loading wallet…"
      : "Wallet unavailable";

  const connectedSub = walletAddress
    ? [
        walletProvider,
        walletChain,
        walletConnectedAt && `connected ${walletConnectedAt}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "No wallet connected";

  // ---- handlers ----
  const handleCopy = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePullRefresh = async () => {
    setPulling(true);
    try {
      await refresh();
    } finally {
      setPulling(false);
    }
  };
  const { idToken } = useAuth();

  const transactionsQuery = useUserTransactions(idToken!);

  const recurringQuery = useUserRecurringBuyAssets(idToken!);

  const txCount = transactionsQuery.data?.data?.length ?? 0;

  const recurringCount =
    recurringQuery.data?.data?.filter((item) => item.isActive).length ?? 0;

  const recurringSub =
    recurringCount > 0
      ? `${recurringCount} active request${recurringCount === 1 ? "" : "s"}`
      : "Set up an automatic buy";

  // TODO: wire these to your navigation / flows
  const onAddFunds = () => {};
  const onConnectedWallet = () => {};
  const onRecurringBuys = () => {
    navigation.navigate("RecurringBuys");
  };

  const onTransactions = () => {
    navigation.navigate("Transactions");
  };
  const onExportTax = () => {};
  const onSupport = () => {};
  const onTerms = () => {};

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={handlePullRefresh}
            tintColor={C.ink}
          />
        }
      >
        {/* Title */}
        <Text style={s.title}>You</Text>

        {/* Identity */}
        <View style={s.identity}>
          {u.photo ? (
            <Image source={{ uri: u.photo }} style={s.avatar} />
          ) : (
            <WalletAvatar address={walletAddress} size={60} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.address}>{displayAddress}</Text>
            <Text style={s.signedIn} numberOfLines={1}>
              Signed in as {user.email}
            </Text>
          </View>
          <Pressable
            onPress={handleCopy}
            disabled={!walletAddress}
            style={({ pressed }) => [s.copyBtn, pressed && s.pressed]}
            hitSlop={8}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={18}
              color={copied ? C.success : walletAddress ? C.ink : C.muted}
            />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.statLabel}>30-DAY</Text>
            <Text
              style={[
                s.statValue,
                { color: pnl30dPct >= 0 ? C.success : C.error },
              ]}
            >
              {formatPct(pnl30dPct)}
            </Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>FOLLOWERS</Text>
            <Text style={s.statValue}>{followers}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>FOLLOWING</Text>
            <Text style={s.statValue}>{following}</Text>
          </View>
        </View>

        {/* Wallet */}
        <View>
          <SectionLabel>WALLET</SectionLabel>

          <View style={[s.row, s.divider]}>
            <View style={{ flex: 1, gap: 4 }}>
              {walletLoading ? (
                <ActivityIndicator
                  color={C.ink}
                  style={{ alignSelf: "flex-start", height: 26 }}
                />
              ) : (
                <Text style={s.balance}>
                  {walletError ? "—" : formatUsdc(usdValue ?? 0)}
                </Text>
              )}
              <Text style={s.rowSub}>
                {walletError
                  ? "Couldn't load balance. Pull to retry."
                  : "Held in your wallet, not by Folio"}
              </Text>
            </View>
            <Pressable
              onPress={onAddFunds}
              style={({ pressed }) => [s.pillBtn, pressed && s.pressed]}
            >
              <Text style={s.pillBtnText}>Add funds</Text>
            </Pressable>
          </View>

          {/* <Row
            title="Connected wallet"
            subtitle={connectedSub}
            onPress={onConnectedWallet}
            right={<Chevron />}
          /> */}

          <Row
            title="Recurring buys"
            subtitle={recurringQuery.isLoading ? "Loading..." : recurringSub}
            onPress={onRecurringBuys}
            right={<Chevron />}
            last
          />
        </View>

        {/* Records */}
        <View>
          <SectionLabel>RECORDS</SectionLabel>
          <Row
            title="Every transaction"
            onPress={onTransactions}
            right={
              <View style={s.rightInline}>
                <Text style={s.count}>
                  {transactionsQuery.isLoading ? "..." : txCount}
                </Text>

                <Chevron />
              </View>
            }
          />
          {/* <Row
            title="Export for tax"
            subtitle="CSV of every buy, sell and fee, by tax year"
            onPress={onExportTax}
            right={
              <Ionicons name="download-outline" size={18} color={C.muted} />
            }
          /> */}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.feeText}>
            Folio charges <Text style={s.feeBold}>1%</Text> on each buy and sell
            and <Text style={s.feeBold}>5%</Text> of profit when you exit in the
            green. No monthly fee, no spread markup, no payment for order flow.
          </Text>

          <View style={s.links}>
            <Pressable onPress={onSupport} hitSlop={6}>
              <Text style={s.link}>Support</Text>
            </Pressable>
            <Pressable onPress={onTerms} hitSlop={6}>
              <Text style={s.link}>Terms & disclosures</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={signOut}
            hitSlop={6}
            style={({ pressed }) => [
              { alignSelf: "flex-start" },
              pressed && s.pressed,
            ]}
          >
            <Text style={s.signOutText}>Sign out</Text>
          </Pressable>

          <Text style={s.version}>
            Folio {APP_VERSION} · non-custodial · you hold the keys
          </Text>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

/* ---------------- styles ---------------- */

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 28,
  },
  pressed: { opacity: 0.6 },

  title: { color: C.ink, fontSize: 36, fontWeight: "800", letterSpacing: -1 },

  identity: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  address: { color: C.ink, fontSize: 18, fontFamily: MONO },
  signedIn: { color: C.muted, fontSize: 13 },
  copyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.ring,
    alignItems: "center",
    justifyContent: "center",
  },

  stats: {
    flexDirection: "row",
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.ring,
    marginTop: -8,
  },
  stat: { flex: 1, gap: 6 },
  statLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  statValue: { color: C.ink, fontSize: 20, fontFamily: MONO },

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  sectionLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
  },
  sectionLabelLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.ring,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.ring },
  rowTitle: { color: C.ink, fontSize: 17, fontWeight: "600" },
  rowSub: { color: C.muted, fontSize: 13 },
  rightInline: { flexDirection: "row", alignItems: "center", gap: 10 },
  count: { color: C.muted, fontSize: 14, fontFamily: MONO },

  balance: { color: C.ink, fontSize: 20, fontFamily: MONO },
  pillBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.ring,
  },
  pillBtnText: { color: C.ink, fontSize: 15, fontWeight: "500" },

  footer: { gap: 18 },
  feeText: { color: C.muted, fontSize: 13, lineHeight: 20 },
  feeBold: { color: C.ink, fontWeight: "700" },
  links: { flexDirection: "row", gap: 20 },
  link: { color: C.ink, fontSize: 15, opacity: 0.85 },
  signOutText: { color: C.error, fontSize: 15, fontWeight: "500" },
  version: { color: C.muted, fontSize: 12, fontFamily: MONO },
});
