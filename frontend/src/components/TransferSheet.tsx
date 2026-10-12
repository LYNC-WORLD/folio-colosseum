// src/components/TransferSheet.tsx — "Move money": spot wallet <-> perp account.
//
// form      -> from/to cards (tap the swap button to switch direction), amount, confirm
// busy      -> brief "submitting" beat while the initiate call is in flight
// submitted -> live status screen: spinner while confirming, then flips to a
//              success or error screen the moment the polling hook (in TradeScreen)
//              reports "done" or "error" — captured via a ref so it can't be missed
//              even though TradeScreen resets its hook state right after toasting.
import { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { C, FONT } from "../theme";
import { fmtPx } from "../data/perpsStore";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { hTap } from "../lib/haptics";
import { Btn, CARD, Check, H2, Body, Lbl, Sheet } from "./PerpUi";

export type TransferStatus = {
  phase: "idle" | "depositing" | "confirming" | "done" | "error";
  amount: number;
  error: string | null;
};

const clean = (t: string) => {
  const x = t.replace(/[^0-9.]/g, "");
  const i = x.indexOf(".");
  return i < 0 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, "");
};
const floor2 = (n: number) => Math.floor(n * 100) / 100;
const fmtIn = (n: number) => (n ? String(n) : "");
const MIN_AMOUNT = 20;

const WalletIcon = memo(function WalletIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 20 20"
      fill="none"
      stroke={C.mint}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={2.5} y={5} width={15} height={11} rx={2.4} />
      <Path d="M13.5 10.5h1.5" />
      <Path d="M2.5 8h15" />
    </Svg>
  );
});
const PerpIcon = memo(function PerpIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 22 22"
      fill="none"
      stroke={C.mint}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M6.5 3v3M6.5 15v4M15.5 3.5v2.5M15.5 13v3.5" />
      <Rect x={4.2} y={6} width={4.6} height={9} rx={1.2} />
      <Rect x={13.2} y={6} width={4.6} height={7} rx={1.2} />
    </Svg>
  );
});

const Card = memo(function Card({
  which,
  role,
  bal,
  after,
}: {
  which: "spot" | "perp";
  role: "FROM" | "TO";
  bal: number;
  after: number;
}) {
  const col = after === bal ? C.ink3 : after > bal ? C.mint : "#E4E8EE";
  return (
    <View style={s.card}>
      <View style={s.ic}>
        {which === "spot" ? <WalletIcon /> : <PerpIcon />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.k}>
          {role} · {which === "spot" ? "SPOT WALLET" : "PERP ACCOUNT"}
        </Text>
        <Text style={s.bal}>{fmtPx(bal)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={s.k}>AFTER</Text>
        <Text style={[s.after, { color: col }]}>
          {fmtPx(Math.max(0, after))}
        </Text>
      </View>
    </View>
  );
});

export function TransferSheet({
  dir: dir0 = "in",
  amt: amt0,
  onClose,
  onMoved,
  onDeposit,
  onWithdraw,
  depositStatus,
  withdrawStatus,
}: {
  dir?: "in" | "out";
  amt?: number;
  onClose: () => void;
  onMoved?: () => void;
  onDeposit: (amt: number) => Promise<void>;
  onWithdraw: (amt: number) => Promise<void>;
  depositStatus?: TransferStatus;
  withdrawStatus?: TransferStatus;
}) {
  const wallet = useWalletBalance();
  const spot = wallet.wallet?.usdc.balance ?? 0;
  const perp = wallet.perpAvailable;
  const [dir, setDir] = useState<"in" | "out">(dir0);
  const src0 = dir0 === "in" ? spot : perp;
  const defaultAmt = Math.floor(
    Math.min(src0, dir0 === "in" ? Math.max(50, src0 * 0.2) : src0),
  );
  const [amt, setAmt] = useState<number>(
    amt0 ?? (src0 < MIN_AMOUNT ? src0 : Math.max(MIN_AMOUNT, defaultAmt)),
  );
  const [txt, setTxt] = useState(fmtIn(amt));
  const [phase, setPhase] = useState<"form" | "busy" | "submitted">("form");
  const [err, setErr] = useState("");

  const inb = dir === "in",
    src = inb ? spot : perp,
    dst = inb ? perp : spot;
  const under = amt > 0 && amt < MIN_AMOUNT;
  const ok = amt >= MIN_AMOUNT && amt <= src + 1e-9,
    mv = ok ? amt : 0,
    over = amt > src + 1e-9;

  // Whichever direction was actually submitted drives which hook's status we watch.
  const active = inb ? depositStatus : withdrawStatus;

  // Latch the outcome the instant it appears, DURING RENDER — not in an effect.
  // TradeScreen's own effect resets the hook's phase back to "idle" right after
  // toasting, and that reset can land before a child effect would run, so an
  // effect-based capture here could miss the "done"/"error" value entirely.
  // Capturing in render is synchronous with the prop arriving, so it can't be missed.
  const resultRef = useRef<
    { kind: "done"; amount: number } | { kind: "error"; message: string } | null
  >(null);
  if (phase === "submitted" && !resultRef.current) {
    if (active?.phase === "done") {
      resultRef.current = { kind: "done", amount: active.amount };
    } else if (active?.phase === "error" && active.error) {
      resultRef.current = { kind: "error", message: active.error };
    }
  }
  const result = phase === "submitted" ? resultRef.current : null;

  const rot = useSharedValue(dir0 === "out" ? 1 : 0); // counts half-turns
  const swapStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));
  const [boxH, setBoxH] = useState(150);

  const set = (n: number) => {
    setAmt(n);
    setTxt(fmtIn(n));
  };
  const flip = () => {
    rot.value = withTiming(rot.value + 1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    const next = inb ? "out" : "in",
      nsrc = next === "in" ? spot : perp;
    setDir(next);
    setErr("");
    if (amt > nsrc) set(floor2(nsrc));
    hTap();
  };

  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const goForm = () => {
    resultRef.current = null;
    setPhase("form");
  };

  const submit = async () => {
    if (!ok || phase !== "form") return;
    hTap();
    Keyboard.dismiss();
    setErr("");
    resultRef.current = null;
    setPhase("busy");
    try {
      if (inb) await onDeposit(amt);
      else await onWithdraw(amt);
      if (!alive.current) return;
      // Don't auto-close: the transfer is accepted but not yet confirmed.
      // This screen now watches depositStatus/withdrawStatus itself and will
      // flip to a success or error view the moment the backend confirms —
      // it no longer depends on the top banner/toast to tell the story.
      setPhase("submitted");
    } catch (e) {
      if (!alive.current) return;
      setErr(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
      setPhase("form");
    }
  };

  const dismiss = () => {
    if (phase === "busy") return;
    onClose();
  };

  return (
    <Sheet onClose={dismiss}>
      {phase === "busy" ? (
        // ---------------------------------------------------------- submitting
        <View style={s.center}>
          <H2 style={{ fontSize: 19 }}>Moving money</H2>
          <ActivityIndicator color={C.mint} size="large" />
          <Text style={s.mono}>
            {fmtPx(amt)} · {inb ? "SPOT → PERP" : "PERP → SPOT"}
          </Text>
        </View>
      ) : phase === "submitted" ? (
        result?.kind === "done" ? (
          // ---------------------------------------------------------- confirmed
          <View style={[s.center, { gap: 14, paddingTop: 6 }]}>
            <Check />
            <H2 style={{ textAlign: "center" }}>
              Moved {fmtPx(result.amount)} {inb ? "to perp" : "to spot"}
            </H2>
            <Body style={{ textAlign: "center", fontSize: 13 }}>
              {inb
                ? "It's in your perp account, ready to use as margin."
                : "It's back in your spot wallet."}
            </Body>
            <Btn label="Done" onPress={onClose} />
          </View>
        ) : result?.kind === "error" ? (
          // ---------------------------------------------------------- failed after submit
          <View style={[s.center, { gap: 14, paddingTop: 6 }]}>
            <View style={s.coach}>
              <Text style={s.coachH}>TRANSFER FAILED</Text>
              <Text style={s.coachT}>{result.message}</Text>
            </View>
            <Btn label="Close" onPress={onClose} />
          </View>
        ) : (
          // ---------------------------------------------------------- submitted, not yet confirmed
          <View style={[s.center, { gap: 14, paddingTop: 6 }]}>
            <ActivityIndicator color={C.mint} size="large" />
            <H2 style={{ textAlign: "center" }}>Transfer submitted</H2>
            <Body style={{ textAlign: "center", fontSize: 13 }}>
              Moving {fmtPx(amt)} to your {inb ? "perp account" : "spot wallet"}
              . This can take up to 5 minutes — you can close this now and we'll
              let you know once it's done.
            </Body>
            <Btn label="Close" onPress={onClose} />
          </View>
        )
      ) : (
        // ---------------------------------------------------------- form
        <>
          <View style={{ gap: 6 }}>
            <Lbl>TRANSFER</Lbl>
            <H2>Move money</H2>
          </View>

          <View
            style={{ gap: 6 }}
            onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
          >
            {(inb
              ? (["spot", "perp"] as const)
              : (["perp", "spot"] as const)
            ).map((w, i) => (
              <Card
                key={w}
                which={w}
                role={i === 0 ? "FROM" : "TO"}
                bal={i === 0 ? src : dst}
                after={i === 0 ? src - mv : dst + mv}
              />
            ))}
            <View
              pointerEvents="box-none"
              style={[s.swapWrap, { top: boxH / 2 - 20 }]}
            >
              <Pressable
                onPress={flip}
                hitSlop={8}
                style={s.swap}
                accessibilityRole="button"
                accessibilityLabel={`Switch direction. Now moving ${inb ? "spot to perp" : "perp to spot"}`}
              >
                <Animated.View style={swapStyle}>
                  <Svg
                    width={18}
                    height={18}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke={C.mint}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M10 3.5v13M5.5 12l4.5 4.5 4.5-4.5" />
                  </Svg>
                </Animated.View>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <View style={s.row}>
              <View style={{ flex: 1, gap: 8 }}>
                <Lbl>AMOUNT</Lbl>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[25, 50, 75, 100].map((v) => (
                    <Pressable
                      key={v}
                      hitSlop={{ top: 8, bottom: 8 }}
                      onPress={() => {
                        hTap();
                        set(floor2((src * v) / 100));
                      }}
                      style={s.pct}
                    >
                      <Text style={s.pctT}>{v === 100 ? "Max" : v + "%"}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <Text style={s.avail}>{fmtPx(src)}</Text>
                <Text style={s.availK}>
                  {inb ? "IN SPOT WALLET" : "FREE IN PERP ACCOUNT"}
                </Text>
              </View>
            </View>
            <View style={[s.field, (over || under) && { borderColor: C.loss }]}>
              <Text style={s.cur}>$</Text>
              <TextInput
                value={txt}
                onChangeText={(t) => {
                  const c = clean(t);
                  setTxt(c);
                  setAmt(parseFloat(c) || 0);
                  setErr("");
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.ink4}
                style={s.input}
              />
              <Text style={s.k}>USDC</Text>
            </View>
          </View>

          {err ? (
            <View style={s.coach}>
              <Text style={s.coachH}>TRANSFER FAILED</Text>
              <Text style={s.coachT}>{err}</Text>
            </View>
          ) : (
            <Text style={s.note}>
              {inb
                ? "Instant and free. Money in the perp account is margin for your trades. Spot buys cannot use it until you move it back."
                : "Instant and free. Margin inside open positions stays put until you close them."}
            </Text>
          )}

          <Btn
            disabled={!ok}
            label={
              over
                ? `More than you have in your ${inb ? "spot wallet" : "perp account"}`
                : under
                  ? `Minimum transfer is ${fmtPx(MIN_AMOUNT)}`
                  : `Move ${fmtPx(amt)} ${inb ? "to perp" : "to spot"}`
            }
            onPress={submit}
          />
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  center: { alignItems: "center", gap: 20, paddingVertical: 14 },
  mono: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: 1.6,
    color: C.ink4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CARD,
  },
  ic: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#2A303A",
    alignItems: "center",
    justifyContent: "center",
  },
  k: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.ink4,
  },
  bal: {
    fontFamily: FONT.sans800,
    fontSize: 18,
    letterSpacing: -0.5,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  after: {
    fontFamily: FONT.mono400,
    fontSize: 12.5,
    fontVariant: ["tabular-nums"],
  },
  swapWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 5,
  },
  swap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.raised,
    borderWidth: 4,
    borderColor: C.raised,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  pct: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#262C36",
    justifyContent: "center",
  },
  pctT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink2 },
  avail: { fontFamily: FONT.mono400, fontSize: 13.5, color: "#E4E8EE" },
  availK: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: C.ink4,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 62,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cur: { fontFamily: FONT.sans800, fontSize: 26, color: C.ink3 },
  input: {
    flex: 1,
    height: "100%",
    color: C.ink1,
    fontFamily: FONT.sans800,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  note: {
    marginTop: -4,
    fontFamily: FONT.sans600,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink3,
  },
  coach: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(240,96,77,.10)",
    borderWidth: 1,
    borderColor: "rgba(240,96,77,.4)",
  },
  coachH: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: C.loss,
  },
  coachT: {
    fontFamily: FONT.sans600,
    fontSize: 13,
    lineHeight: 19,
    color: C.ink1,
  },
});
