// Sheets opened from Folio: Deposit (menu → crypto / exchanges), Activity, and the "…" menu.
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import Svg, { Path, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context";
import { useUserTransactions } from "../../hooks/useUserRecords";
import type { UserTransaction } from "../../services/user";
import { C, FONT, TYPE, em } from "../../theme";
import { money } from "../../lib/format";
import { timeAgo, units } from "../../lib/trade";
import { hTap } from "../../lib/haptics";
import { txUsd } from "../../lib/transactions";
import { useSheet } from "../Sheet";
import { useToast } from "../Toast";
import { Button } from "../ui/Button";
import { PressScale } from "../ui/PressScale";
import { Rise } from "../ui/Enter";
import { Skeleton } from "../ui/Skeleton";
import { Step } from "../trade/SheetParts";

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—");

function useCopy() {
  const toast = useToast();
  return async (text: string, title: string) => {
    try {
      await Clipboard.setStringAsync(text);
      toast(title, text.length > 24 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text);
    } catch {
      toast("Copy did not work", "SELECT IT BY HAND");
    }
  };
}

// ---------------------------------------------------------------- deposit

const DEP_ICONS = {
  crypto: (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.ink1} strokeWidth={1.8} strokeLinejoin="round">
      <Rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
      <Rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
      <Rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
      <Path d="M14 14h2.6v2.6H14zM18 18h2.5v2.5H18zM14 18.5v2M18.5 14h2" strokeLinecap="round" />
    </Svg>
  ),
  exch: (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.ink1} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h14.5l-3.4-3.4M20 16H5.5l3.4 3.4" />
    </Svg>
  ),
};

export function DepositFlow({ address }: { address?: string }) {
  const [step, setStep] = useState<"menu" | "crypto" | "exch">("menu");
  const copy = useCopy();

  if (!address) {
    return (
      <Step id="noaddr">
        <Text style={[TYPE.h2, { fontSize: 21 }]}>Deposit</Text>
        <Text style={TYPE.body}>Your wallet address hasn't loaded yet. Pull down on Folio to refresh, then try again.</Text>
      </Step>
    );
  }

  const back = (
    <Pressable onPress={() => setStep("menu")} style={s.back} hitSlop={8} accessibilityRole="button">
      <Ionicons name="chevron-back" size={16} color={C.mint} />
      <Text style={s.backText}>Deposit with</Text>
    </Pressable>
  );

  if (step === "crypto") {
    return (
      <Step id="crypto">
        {back}
        <Text style={TYPE.h2}>Receive USDC</Text>
        <Text style={[TYPE.body, { fontSize: 13.5, marginTop: -6 }]}>
          Send USDC from any wallet to this address. It lands as cash you can invest straight away.
        </Text>
        <View style={s.qrBox} accessibilityLabel="QR code of your wallet address">
          <QRCode value={address} size={176} color="#0A0B0E" backgroundColor="#FFFFFF" ecl="M" />
        </View>
        <View style={s.addrCard}>
          <View style={[s.addrRow, s.hair]}>
            <Text style={s.miniLbl}>YOUR ADDRESS</Text>
            <Text style={s.addr} selectable>
              {address}
            </Text>
          </View>
          <View style={s.netRow}>
            <Text style={[s.miniLbl, { flex: 1 }]}>NETWORK</Text>
            <Text style={s.net}>Solana</Text>
          </View>
        </View>
        <Text style={s.warn}>Only send USDC on Solana. Other tokens or networks may be lost.</Text>
        <Button title="Copy address" onPress={() => copy(address, "Address copied")} />
      </Step>
    );
  }

  if (step === "exch") {
    const APPS: [string, string][] = [
      ["Coinbase", "CB"],
      ["Binance", "BN"],
      ["Kraken", "KR"],
      ["OKX", "OK"],
    ];
    return (
      <Step id="exch">
        {back}
        <Text style={TYPE.h2}>From an exchange or app</Text>
        <View style={{ gap: 10 }}>
          {["Copy your Folio address below.", "In the app, withdraw USDC on Solana to that address.", "It shows up here as cash in your wallet."].map(
            (t, i) => (
              <View key={i} style={s.stepRow}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={s.stepText}>{t}</Text>
              </View>
            ),
          )}
        </View>
        <View>
          {APPS.map(([n, c], i) => (
            <PressScale
              key={n}
              scaleTo={0.985}
              onPress={() => {
                hTap();
                copy(address, `Address copied · paste in ${n}`);
              }}
              style={[s.appRow, i < APPS.length - 1 && s.hair]}
              accessibilityRole="button"
            >
              <View style={s.appLogo}>
                <Text style={s.appCode}>{c}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={TYPE.ttl}>{n}</Text>
                <Text style={TYPE.sub}>Tap to copy your address, then open {n}</Text>
              </View>
              <Text style={s.chev}>›</Text>
            </PressScale>
          ))}
        </View>
        <Button title="Copy address" onPress={() => copy(address, "Address copied")} />
      </Step>
    );
  }

  const OPTS = [
    { id: "crypto" as const, t: "Crypto", s: "Receive USDC from a crypto wallet" },
    { id: "exch" as const, t: "Exchanges and apps", s: "Coinbase, Binance, Kraken, OKX" },
  ];
  return (
    <Step id="menu">
      <Text style={[TYPE.h2, { fontSize: 21, textAlign: "center", marginTop: 2 }]}>Deposit with</Text>
      <View style={{ gap: 12 }}>
        {OPTS.map((o, i) => (
          <Rise key={o.id} delay={i * 55} duration={420}>
            <PressScale
              scaleTo={0.98}
              onPress={() => {
                hTap();
                setStep(o.id);
              }}
              style={s.depOpt}
              accessibilityRole="button"
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.depTitle}>{o.t}</Text>
                <Text style={s.depSub}>{o.s}</Text>
              </View>
              {DEP_ICONS[o.id]}
            </PressScale>
          </Rise>
        ))}
      </View>
    </Step>
  );
}

// ---------------------------------------------------------------- activity

// USD value per row: see txUsd in lib/transactions.ts

export function ActivitySheet() {
  const sheet = useSheet();
  const { idToken } = useAuth();
  const q = useUserTransactions(idToken ?? undefined);
  const list = [...(q.data?.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <Step id="activity">
      <View style={{ gap: 6 }}>
        <Text style={TYPE.lbl}>ACTIVITY</Text>
        <Text style={TYPE.h2}>Everything you have done</Text>
      </View>
      <ScrollView style={{ maxHeight: Dimensions.get("window").height * 0.52 }} showsVerticalScrollIndicator={false}>
        {q.isPending ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={40} radius={10} />
            ))}
          </View>
        ) : q.error ? (
          <Text style={[TYPE.sub, { color: C.loss }]}>Couldn't load your activity. Close and try again.</Text>
        ) : list.length === 0 ? (
          <Text style={TYPE.sub}>Nothing yet. Your buys and sales will show up here.</Text>
        ) : (
          list.map((tx, i) => {
            const sold = String(tx.type).toUpperCase() === "SELL";
            return (
              <View key={tx.id} style={[s.actRow, i < list.length - 1 && s.hair]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={TYPE.ttl}>
                    {sold ? "Sold" : "Bought"} · {tx.stock?.symbol}
                  </Text>
                  <Text style={TYPE.sub}>
                    {units(Number(tx.amount))} at {money(Number(tx.price))} · {timeAgo(tx.createdAt)}
                  </Text>
                </View>
                <Text style={[s.fig, { color: sold ? C.mint : "#D6DAE0" }]}>
                  {sold ? "+" : "−"}
                  {money(txUsd(tx))}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
      <Button variant="quiet" size="sm" title="Close" onPress={() => sheet.close()} />
    </Step>
  );
}

// ---------------------------------------------------------------- "…" menu

export function MoreSheet({
  address,
  onActivity,
  onOrders,
  onAccount,
}: {
  address?: string;
  onActivity: () => void;
  onOrders: () => void;
  onAccount: () => void;
}) {
  const sheet = useSheet();
  const copy = useCopy();
  const items: [string, string, () => void][] = [
    [
      "Copy wallet address",
      `${shortAddr(address)} · self-custody`,
      () => {
        sheet.close();
        if (address) copy(address, "Address copied");
      },
    ],
    ["Activity", "Every buy and sale", onActivity],
    ["Standing orders", "Recurring buys you have set up", onOrders],
    ["Account", "Profile, notifications, sign out", onAccount],
  ];
  return (
    <Step id="more">
      <Text style={TYPE.lbl}>CASH</Text>
      <View>
        {items.map(([t, sub, fn], i) => (
          <PressScale
            key={t}
            scaleTo={0.985}
            onPress={() => {
              hTap();
              fn();
            }}
            style={[s.appRow, i < items.length - 1 && s.hair]}
            accessibilityRole="button"
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={TYPE.ttl}>{t}</Text>
              <Text style={TYPE.sub}>{sub}</Text>
            </View>
            <Text style={s.chev}>›</Text>
          </PressScale>
        ))}
      </View>
    </Step>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", minHeight: 40, marginLeft: -4, marginBottom: -10, marginTop: -10 },
  backText: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },

  depOpt: { minHeight: 88, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20, backgroundColor: "#20252E", flexDirection: "row", alignItems: "center", gap: 14 },
  depTitle: { fontFamily: FONT.sans700, fontSize: 18, letterSpacing: em(18, -0.02), color: C.ink1 },
  depSub: { fontFamily: FONT.sans400, fontSize: 14, color: C.ink3 },

  qrBox: { alignSelf: "center", padding: 14, borderRadius: 18, backgroundColor: "#FFFFFF" },
  addrCard: { backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  addrRow: { gap: 6, paddingVertical: 12 },
  miniLbl: { fontFamily: FONT.mono400, fontSize: 9.5, letterSpacing: em(9.5, 0.16), color: C.ink4 },
  addr: { fontFamily: FONT.mono400, fontSize: 12.5, lineHeight: 19, color: C.ink1 },
  netRow: { minHeight: 46, flexDirection: "row", alignItems: "center" },
  net: { fontFamily: FONT.mono400, fontSize: 12, color: C.ink3 },
  warn: { fontFamily: FONT.sans400, fontSize: 12.5, lineHeight: 19, color: C.loss },

  stepRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNum: { width: 22, height: 22, borderRadius: 999, backgroundColor: C.stroke, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: FONT.mono500, fontSize: 11, color: C.mint },
  stepText: { flex: 1, fontFamily: FONT.sans400, fontSize: 13.5, lineHeight: 20, color: C.ink2 },

  appRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 14 },
  appLogo: { width: 40, height: 40, borderRadius: 999, backgroundColor: "#1B2029", borderWidth: 1, borderColor: C.stroke, alignItems: "center", justifyContent: "center" },
  appCode: { fontFamily: FONT.mono500, fontSize: 11, color: C.ink2 },
  chev: { fontSize: 17, color: C.ink4 },

  actRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  fig: { fontFamily: FONT.mono400, fontSize: 13, fontVariant: ["tabular-nums"] },
});
