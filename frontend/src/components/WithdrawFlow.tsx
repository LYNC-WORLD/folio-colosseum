// src/components/folio/WithdrawFlow.tsx — Withdraw (prototype openWithdraw → wdAmount → wdReview → wdSend)
//
//   pick    -> "To a crypto wallet" | "To your bank (coming soon)"   + SPOT / PERP strip
//   amount  -> % chips, amount, destination address, network rows
//   review  -> "Check and send" card + irreversible warning
//   busy    -> "Signing in your wallet"
//   done    -> check + "$X is on its way"
//
// onSend is where the real transfer goes. Return false (or throw) to fail.
// Until it is wired, a 1.5s mock runs so the whole flow can be tried.
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { hSelect, hTap } from "../lib/haptics";
import { money } from "../lib/format";
import { C, em, FONT } from "../theme";
import { Body, Btn, CARD, Check, H2, Kv, KvCard, Lbl } from "./PerpUi";

// TODO: set these once the chain / fee are final (prototype shows [CHAIN AT LAUNCH])
const NETWORK = "USDC network";
const NET_FEE = "Network fee only";

type Step = "pick" | "amount" | "review" | "busy" | "done";

const clean = (t: string) => {
  const x = t.replace(/[^0-9.]/g, "");
  const i = x.indexOf(".");
  return i < 0 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, "");
};
const floor2 = (n: number) => Math.floor(n * 100) / 100;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// 0x… (EVM, 42 chars) or a base58 address (32–44 chars)
const okAddr = (v: string) =>
  /^0x[0-9a-fA-F]{40}$/.test(v) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const shortTo = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function WithdrawFlow({
  spot,
  perp,
  onSend,
  onMoveToSpot,
  onDone,
}: {
  spot: number;
  perp: number;
  onSend?: (
    amount: number,
    to: string,
  ) => Promise<boolean | void> | boolean | void;
  onMoveToSpot?: () => void; // "Money in your perp account? Move it to spot first ›"
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [amt, setAmt] = useState(Math.min(100, Math.floor(spot)));
  const [txt, setTxt] = useState(String(Math.min(100, Math.floor(spot)) || ""));
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");
  const [bankMsg, setBankMsg] = useState(false);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const over = amt > spot + 1e-9;
  const addr = to.trim();
  const good = okAddr(addr);
  const bad = amt <= 0 || over || !good;

  const setAmount = (n: number) => {
    setAmt(n);
    setTxt(n ? String(n) : "");
  };

  const send = async () => {
    hTap();
    Keyboard.dismiss();
    setErr("");
    setStep("busy");
    try {
      await wait(1500); // mock latency: delete when onSend is a real network call
      const res = await Promise.resolve(onSend ? onSend(amt, addr) : true);
      if (res === false) throw new Error("The transfer didn't go through.");
      if (!alive.current) return;
      setStep("done");
    } catch (e) {
      if (!alive.current) return;
      setErr(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
      setStep("review");
    }
  };

  const Strip = (
    <View style={s.strip}>
      <Text style={s.stripTxt}>
        SPOT <Text style={s.stripB}>{money(spot)}</Text>
      </Text>
      <Text style={s.stripTxt}>
        PERP <Text style={s.stripB}>{money(perp)}</Text>
      </Text>
    </View>
  );

  // ------------------------------------------------------------ pick
  if (step === "pick")
    return (
      <View style={{ gap: 16 }}>
        <H2 style={{ textAlign: "center", fontSize: 21 }}>Withdraw</H2>
        {Strip}
        <Pressable
          onPress={() => {
            hTap();
            setStep("amount");
          }}
          style={s.opt}
          accessibilityRole="button"
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.optT}>To a crypto wallet</Text>
            <Text style={s.optS}>Send USDC to any address</Text>
            <Text style={s.tag}>ABOUT A MINUTE · NETWORK FEE ONLY</Text>
          </View>
          <View style={s.ico}>
            <Svg
              width={22}
              height={22}
              viewBox="0 0 20 20"
              fill="none"
              stroke={C.mint}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Rect x={2.5} y={5} width={15} height={11} rx={2.4} />
              <Path d="M13.5 10.5h1.5M2.5 8h15" />
            </Svg>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            hSelect();
            setBankMsg(true);
          }}
          style={[s.opt, { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
            >
              <Text style={s.optT}>To your bank</Text>
              <View style={s.badge}>
                <Text style={s.badgeT}>COMING SOON</Text>
              </View>
            </View>
            <Text style={s.optS}>Cash out as dollars to your account</Text>
          </View>
          <View style={s.ico}>
            <Svg
              width={22}
              height={22}
              viewBox="0 0 20 20"
              fill="none"
              stroke={C.ink3}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M3 8l7-4 7 4M4.5 8v7M8 8v7M12 8v7M15.5 8v7M3 16.5h14" />
            </Svg>
          </View>
        </Pressable>
        {bankMsg ? (
          <Text style={s.help}>
            Bank withdrawals are coming soon. Send to a crypto wallet for now.
          </Text>
        ) : null}
        {perp > 0 && onMoveToSpot ? (
          <Pressable
            onPress={onMoveToSpot}
            style={{
              alignSelf: "center",
              minHeight: 40,
              justifyContent: "center",
            }}
          >
            <Text style={s.link}>
              Money in your perp account? Move it to spot first ›
            </Text>
          </Pressable>
        ) : null}
      </View>
    );

  // ------------------------------------------------------------ amount
  if (step === "amount")
    return (
      <View style={{ gap: 16 }}>
        <Pressable onPress={() => setStep("pick")} style={s.back} hitSlop={8}>
          <Text style={s.backT}>‹ Withdraw</Text>
        </Pressable>
        <H2>Send to a crypto wallet</H2>

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
                      setAmount(floor2((spot * v) / 100));
                    }}
                    style={s.pct}
                  >
                    <Text style={s.pctT}>{v === 100 ? "Max" : v + "%"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <Text style={s.avail}>{money(spot)}</Text>
              <Text style={s.availK}>IN SPOT WALLET</Text>
            </View>
          </View>
          <View style={[s.field, over && { borderColor: C.loss }]}>
            <Text style={s.cur}>$</Text>
            <TextInput
              value={txt}
              onChangeText={(t) => {
                const c = clean(t);
                setTxt(c);
                setAmt(parseFloat(c) || 0);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.ink4}
              style={s.input}
            />
            <Text style={s.k}>USDC</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Lbl>TO ADDRESS</Lbl>
          <View
            style={[
              s.field,
              { height: 54 },
              !!addr && !good && { borderColor: C.loss },
            ]}
          >
            <TextInput
              value={to}
              onChangeText={setTo}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="Paste address"
              placeholderTextColor={C.ink4}
              style={[
                s.input,
                { fontFamily: FONT.mono400, fontSize: 14, letterSpacing: 0 },
              ]}
            />
          </View>
          <Text style={[s.help, !!addr && { color: good ? C.mint : C.loss }]}>
            {!addr
              ? "Paste the USDC address from the wallet or exchange you are sending to."
              : good
                ? "Looks like a valid address. Check the first and last characters."
                : "That is not a valid address. Check it and try again."}
          </Text>
        </View>

        <View>
          {[
            ["NETWORK", NETWORK],
            ["NETWORK FEE", NET_FEE],
            ["ARRIVES", "About a minute"],
          ].map(([k, v], i, a) => (
            <View key={k} style={[s.kv, i < a.length - 1 && s.hair]}>
              <Text style={s.kvK}>{k}</Text>
              <Text style={s.kvV}>{v}</Text>
            </View>
          ))}
        </View>

        <Btn
          disabled={bad}
          label={over ? "More than you have in your spot wallet" : "Review"}
          onPress={() => {
            hTap();
            Keyboard.dismiss();
            setStep("review");
          }}
        />
      </View>
    );

  // ------------------------------------------------------------ review
  if (step === "review")
    return (
      <View style={{ gap: 16 }}>
        <Pressable onPress={() => setStep("amount")} style={s.back} hitSlop={8}>
          <Text style={s.backT}>‹ Edit</Text>
        </Pressable>
        <H2>Check and send</H2>
        <KvCard>
          <Kv k="AMOUNT" v={`${money(amt)} USDC`} />
          <Kv k="TO" v={shortTo(addr)} />
          <Kv k="NETWORK" v={NETWORK} />
          <Kv k="NETWORK FEE" v={NET_FEE} />
          <Kv k="SPOT WALLET AFTER" v={money(spot - amt)} last />
        </KvCard>
        {err ? (
          <View style={s.coach}>
            <Text style={s.coachH}>TRANSFER FAILED</Text>
            <Text style={s.coachT}>{err}</Text>
          </View>
        ) : (
          <Text style={[s.help, { color: C.loss }]}>
            Crypto transfers cannot be reversed. Sending to the wrong address or
            network loses the funds.
          </Text>
        )}
        <Btn label={`Send ${money(amt)}`} onPress={send} />
      </View>
    );

  // ------------------------------------------------------------ busy
  if (step === "busy")
    return (
      <View style={s.center}>
        <H2 style={{ fontSize: 19 }}>Signing in your wallet</H2>
        <ActivityIndicator color={C.mint} size="large" />
        <Text style={s.mono}>SENDING {money(amt)} USDC</Text>
        <Text style={[s.mono, { fontSize: 9, marginTop: -8 }]}>
          DON'T CLOSE THE APP
        </Text>
      </View>
    );

  // ------------------------------------------------------------ done
  return (
    <View style={{ gap: 16 }}>
      <View style={[s.center, { gap: 14, paddingTop: 6 }]}>
        <Check />
        <H2 style={{ textAlign: "center" }}>{money(amt)} is on its way</H2>
        <Body style={{ textAlign: "center", fontSize: 13 }}>
          It reaches {shortTo(addr)} in about a minute.
        </Body>
      </View>
      <KvCard>
        <Kv k="SPOT WALLET" v={money(spot - amt)} />
        <Kv k="PERP ACCOUNT" v={money(perp)} last />
      </KvCard>
      <Btn label="Done" onPress={onDone} />
    </View>
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
  strip: { flexDirection: "row", justifyContent: "center", gap: 22 },
  stripTxt: {
    fontFamily: FONT.mono400,
    fontSize: 10.5,
    letterSpacing: em(10.5, 0.14),
    color: C.ink4,
  },
  stripB: { color: C.ink1 },

  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: CARD,
  },
  optT: {
    fontFamily: FONT.sans700,
    fontSize: 18,
    letterSpacing: em(18, -0.02),
    color: C.ink1,
  },
  optS: { fontFamily: FONT.sans400, fontSize: 14, color: C.ink3 },
  tag: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.12),
    color: C.mint,
  },
  ico: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2A303A",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#2A303A",
  },
  badgeT: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: em(8.5, 0.12),
    color: C.ink3,
  },
  link: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },

  back: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  backT: { fontFamily: FONT.sans600, fontSize: 14, color: C.ink3 },
  help: {
    fontFamily: FONT.sans600,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink3,
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
  k: {
    fontFamily: FONT.mono400,
    fontSize: 9,
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

  kv: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  kvK: {
    flex: 1,
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.2),
    color: C.ink4,
  },
  kvV: { fontFamily: FONT.mono400, fontSize: 13, color: "#D6DAE0" },

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
