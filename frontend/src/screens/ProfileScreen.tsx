// Account — prototype #s-account (opened from Folio's gear / avatar, Home's avatar)
//
//   ‹ Back
//   (S) Shanu
//       SINCE SEP 2026 · 3 POSITIONS
//       shanu@gmail.com
//   [ $1,240 ] [ 14 ] [ 2 ]        TOTAL VALUE · TRADES · FOLLOWING
//   ┌ INVESTOR PROFILE ─────────────────┐
//   │ The Patient Builder               │
//   │ US stocks · Pre-IPOs · …          │
//   │ [ Retake the questions ]          │
//   WALLET
//   [ 4a91…f2c7  SELF-CUSTODY      ⧉ ]
//   $440.00 USDC                [Add funds]
//   Standing orders           2 active  ›
//   Every transaction              14  ›
//   NOTIFY ME WHEN  (switches)
//   fee disclosure
//   [ Sign out ]

import { useEffect, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import Svg, { Path, Rect } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth, type OnboardingProfile } from "../context";
import { useWallet } from "../context/WalletContext";
import { useAppFlow } from "../context/AppFlowContext";
import { useUserTransactions } from "../hooks/useUserRecords";
import { useRecurringBuys } from "../hooks/useTrade";
import { useCountUp } from "../hooks/useCountUp";
import { getOnboardingProfile } from "../lib";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { useTabBarSpace } from "../navigation/TabBar";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Button, PressScale, Pop, Rise, Switch } from "../components/ui";
import { BackLink } from "../components/BackLink";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { DepositFlow, shortAddr } from "../components/folio/FolioSheets";
import { useFollowing } from "../lib/follows";
import { NOTIFY_OPTIONS, setNotify, useNotifyPrefs } from "../lib/notifyPrefs";
import { money, money0 } from "../lib/format";
import { hTap } from "../lib/haptics";

const APP_VERSION = "0.9.2";
type Nav = NativeStackNavigationProp<ProfileStackParamList, "Profile">;

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const sheet = useSheet();
  const toast = useToast();
  const { retakeOnboarding } = useAppFlow();

  const { user, idToken, signOut } = useAuth();
  const {
    walletAddress,
    usdcValue,
    usdValue,
    tokens,
    loading,
    refreshing,
    refresh,
  } = useWallet();
  const txs = useUserTransactions(idToken ?? undefined);
  const { recurringBuys, reload: reloadRecurring } = useRecurringBuys();
  const following = useFollowing();
  const prefs = useNotifyPrefs();

  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  useEffect(() => {
    getOnboardingProfile().then(setProfile);
  }, []);

  const total = useCountUp(usdValue);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const name = (user.name ?? "").trim() || user.email.split("@")[0];
  const txList = txs.data?.data ?? [];
  const firstTx = txList.length
    ? new Date(Math.min(...txList.map((t) => +new Date(t.createdAt))))
    : null;
  const activeRec = recurringBuys.filter((r) => r.isActive).length;
  const meta = [
    firstTx
      ? `SINCE ${firstTx.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase()}`
      : null,
    `${tokens.length} ${tokens.length === 1 ? "POSITION" : "POSITIONS"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const stats: [string, string, string?][] = [
    [loading ? "…" : money0(total), "TOTAL VALUE"],
    [String(txList.length), "TRADES"],
    [String(following.size), "FOLLOWING"],
  ];

  const profSub = profile
    ? profile.owns?.length
      ? [
          profile.owns.join(" · "),
          profile.riskSummary?.toLowerCase(),
          profile.horizonLabel,
        ]
          .filter(Boolean)
          .join(" · ")
      : profile.tagline
    : "Answer four quick questions and Folio shapes your home screen around them.";

  const back = () => {
    if (nav.canGoBack()) nav.goBack();
    else nav.getParent()?.navigate("Portfolio" as never);
  };

  const copy = async () => {
    if (!walletAddress) return;
    hTap();
    try {
      await Clipboard.setStringAsync(walletAddress);
      toast("Address copied", "SELF-CUSTODY WALLET");
    } catch {
      toast("Copy did not work", "SELECT IT BY HAND");
    }
  };

  const r = (i: number) => ({ delay: i * 55, duration: 440 });

  return (
    <View style={s.safe}>
      <ScrollView
        contentContainerStyle={[
          s.page,
          { paddingTop: insets.top + 12, paddingBottom: bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              txs.refetch();
              reloadRecurring();
            }}
            tintColor={C.mint}
            colors={[C.mint]}
            progressBackgroundColor={C.raised}
          />
        }
      >
        <BackLink onPress={back} />

        {/* identity */}
        <View style={s.head}>
          <Pop duration={320}>
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={s.av} />
            ) : (
              <View style={[s.av, s.avFallback]}>
                <Text style={s.avText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </Pop>
          <Rise {...r(1)} style={{ flex: 1, gap: 6 }}>
            <Text
              style={[TYPE.h1, h1Size(28)]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {name}
            </Text>
            <Text style={s.meta}>{meta}</Text>
            <Text style={TYPE.sub} numberOfLines={1}>
              {user.email}
            </Text>
          </Rise>
        </View>

        {/* stats */}
        <View style={s.stats}>
          {stats.map(([v, l], i) => (
            <Rise key={l} {...r(2 + i)} style={{ flex: 1 }}>
              <View style={s.stat}>
                <Text style={s.statVal} numberOfLines={1} adjustsFontSizeToFit>
                  {v}
                </Text>
                <Text style={s.statLbl}>{l}</Text>
              </View>
            </Rise>
          ))}
        </View>

        {/* investor profile */}
        <Rise {...r(5)}>
          <View style={s.wash}>
            <Text style={TYPE.lbl}>INVESTOR PROFILE</Text>
            <Text style={TYPE.h2}>{profile?.title ?? "No profile yet"}</Text>
            <Text style={s.washText}>{profSub}</Text>
            <Button
              variant="ghost"
              size="sm"
              title={profile ? "Retake the questions" : "Answer the questions"}
              onPress={retakeOnboarding}
            />
          </View>
        </Rise>

        {/* wallet */}
        <Rise {...r(6)} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>WALLET</Text>
          <View style={s.walletCard}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.addr}>
                {walletAddress
                  ? shortAddr(walletAddress)
                  : loading
                    ? "Loading wallet…"
                    : "Wallet unavailable"}
              </Text>
              <Text style={s.tiny}>SELF-CUSTODY · YOU HOLD THE KEYS</Text>
            </View>
            <PressScale
              scaleTo={0.9}
              onPress={copy}
              disabled={!walletAddress}
              style={s.copy}
              accessibilityRole="button"
              accessibilityLabel="Copy wallet address"
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 20 20"
                fill="none"
                stroke={C.mint}
                strokeWidth={1.7}
                strokeLinejoin="round"
              >
                <Rect x="7" y="7" width="9" height="9" rx="2" />
                <Path d="M13 5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13" />
              </Svg>
            </PressScale>
          </View>

          <View>
            <View style={[s.row, s.hair]}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.balance}>
                  {loading ? "…" : `${money(usdcValue)} USDC`}
                </Text>
                <Text style={TYPE.sub}>
                  Cash in your wallet, not held by Folio
                </Text>
              </View>
              <PressScale
                scaleTo={0.95}
                onPress={() => {
                  hTap();
                  sheet.open(<DepositFlow address={walletAddress} />, {
                    label: "Deposit",
                  });
                }}
                style={s.pill}
                accessibilityRole="button"
              >
                <Text style={s.pillText}>Add funds</Text>
              </PressScale>
            </View>
            <LinkRow
              title="Standing orders"
              value={activeRec ? `${activeRec} active` : "None"}
              onPress={() => nav.navigate("RecurringBuys")}
            />
            <LinkRow
              title="Every transaction"
              value={txs.isPending ? "…" : String(txList.length)}
              onPress={() => nav.navigate("Transactions")}
              last
            />
          </View>
        </Rise>

        {/* notifications */}
        <Rise {...r(7)} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>NOTIFY ME WHEN</Text>
          <View>
            {NOTIFY_OPTIONS.map((o, i) => (
              <View
                key={o.key}
                style={[
                  s.row,
                  { minHeight: 58 },
                  i < NOTIFY_OPTIONS.length - 1 && s.hair,
                ]}
              >
                <Text style={[TYPE.ttl, { flex: 1, fontFamily: FONT.sans600 }]}>
                  {o.label}
                </Text>
                <Switch
                  value={prefs[o.key]}
                  onValueChange={(v) => setNotify(o.key, v)}
                  accessibilityLabel={o.label}
                />
              </View>
            ))}
          </View>
          <Text style={s.tiny}>SAVED ON THIS PHONE</Text>
        </Rise>

        {/* disclosure + sign out */}
        <Rise {...r(8)} style={{ gap: 18 }}>
          <Text style={s.fee}>
            Folio charges <Text style={s.feeBold}>1%</Text> on each buy and sell
            and <Text style={s.feeBold}>5%</Text> of profit when you exit in the
            green. No monthly fee, no spread markup, no payment for order flow.
          </Text>

          <PressScale
            dim
            onPress={async () => {
              if (signingOut) return;
              hTap();
              setSigningOut(true);
              try {
                await signOut();
              } finally {
                setSigningOut(false);
              }
            }}
            style={s.signOut}
            accessibilityRole="button"
            accessibilityState={{ busy: signingOut }}
          >
            <Text style={s.signOutText}>
              {signingOut ? "Signing out…" : "Sign out"}
            </Text>
          </PressScale>

          <Text style={[s.tiny, { textAlign: "center" }]}>
            FOLIO {APP_VERSION} · NON-CUSTODIAL
          </Text>
        </Rise>
      </ScrollView>
    </View>
  );
}

function LinkRow({
  title,
  value,
  onPress,
  last,
}: {
  title: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress();
      }}
      style={[s.row, !last && s.hair]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}`}
    >
      <Text style={[TYPE.ttl, { flex: 1, fontFamily: FONT.sans600 }]}>
        {title}
      </Text>
      <Text style={s.value}>{value}</Text>
      <Text style={s.chev}>›</Text>
    </PressScale>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20, gap: 20 },

  head: { flexDirection: "row", alignItems: "center", gap: 14 },
  av: { width: 60, height: 60, borderRadius: 999 },
  avFallback: {
    backgroundColor: "#232833",
    alignItems: "center",
    justifyContent: "center",
  },
  avText: { fontFamily: FONT.sans800, fontSize: 24, color: C.ink1 },
  meta: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.14),
    color: C.ink3,
  },

  stats: { flexDirection: "row", gap: 10 },
  stat: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  statVal: {
    fontFamily: FONT.mono400,
    fontSize: 17,
    letterSpacing: em(17, -0.02),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  statLbl: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.14),
    color: C.ink4,
  },

  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16, gap: 12 },
  washText: {
    fontFamily: FONT.sans400,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink2,
  },

  walletCard: {
    minHeight: 62,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: 16,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  addr: { fontFamily: FONT.mono400, fontSize: 13, color: C.ink1 },
  tiny: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.14),
    color: C.ink4,
  },
  copy: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  balance: {
    fontFamily: FONT.mono400,
    fontSize: 17,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  pill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#313844",
    backgroundColor: "#1D222B",
    justifyContent: "center",
  },
  pillText: { fontFamily: FONT.sans700, fontSize: 13.5, color: C.ink1 },
  value: { fontFamily: FONT.mono400, fontSize: 13, color: C.ink3 },
  chev: { fontSize: 17, color: C.ink4 },

  fee: {
    fontFamily: FONT.sans400,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink3,
  },
  feeBold: { fontFamily: FONT.sans700, color: C.ink1 },
  signOut: {
    height: 54,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  signOutText: { fontFamily: FONT.sans700, fontSize: 16, color: C.loss },
});
