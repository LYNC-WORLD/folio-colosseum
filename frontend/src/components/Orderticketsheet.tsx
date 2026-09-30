// src/components/perps/OrderTicketSheet.tsx — Long / Short ticket: side, order type, margin,
// leverage, liquidation preview, analyst check, TP/SL, fees, hold-to-confirm (25x+), success card.
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  MAXLEV,
  MIN_MARGIN,
  MMR,
  TAKER,
  deposit,
  fmtPx,
  fundLeft,
  marketOf,
  preCheck,
  qtyFmt,
  sMoney,
  sideTxt,
  submitTicket,
  toast,
  usePerps,
  type Order,
  type Position,
} from "../data/perpsStore";
import {
  AMBER,
  Body,
  Btn,
  CARD,
  Check,
  H2,
  HoldButton,
  Kv,
  KvCard,
  Lbl,
  LeverageSlider,
  LongShortSeg,
  Sheet,
  Tag,
  levTone,
} from "./PerpUi";
import { C, FONT } from "../theme";
import { hTap } from "../lib/haptics";

const clean = (t: string) => {
  const x = t.replace(/[^0-9.]/g, "");
  const i = x.indexOf(".");
  return i < 0 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, "");
};
const num = (t: string) => parseFloat(t) || 0;

export function OrderTicketSheet({
  sym,
  initialSide,
  onClose,
  onChart,
}: {
  sym: string;
  initialSide: 1 | -1;
  onClose: () => void;
  onChart: () => void;
}) {
  const st = usePerps();
  const m = marketOf(sym),
    mk = st.marks[sym].mark;
  const [side, setSide] = useState<1 | -1>(initialSide);
  const [otype, setOtype] = useState<"Market" | "Limit" | "Stop">("Market");
  const [opx, setOpx] = useState("");
  const [marginT, setMarginT] = useState(
    String(Math.min(50, Math.max(0, Math.floor(st.usdc)))),
  );
  const [lev, setLev] = useState(10);
  const [tpOn, setTpOn] = useState(false);
  const [tpT, setTpT] = useState("");
  const [slT, setSlT] = useState("");
  const [phase, setPhase] = useState<"form" | "busy" | "done">("form");
  const [result, setResult] = useState<Position | Order | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const mg = num(marginT);
  const en = otype === "Market" ? mk * (1 + side * 0.0003) : num(opx) || mk;
  const notional = mg * lev,
    qty = en ? notional / en : 0,
    fee = notional * TAKER;
  const liq = qty
    ? side > 0
      ? en - (mg - MMR * qty * en) / qty
      : en + (mg - MMR * qty * en) / qty
    : en;
  const dist = (Math.abs(liq - en) / en) * 100;
  const [tone, toneTxt] = useMemo(
    () => preCheck(sym, dist || 0.01),
    [sym, dist],
  );
  const toneCol = tone === "ok" ? C.mint : tone === "warn" ? AMBER : C.loss;
  const fpay = notional * (m.funding / 100) * side;
  const tp = num(tpT) || null,
    sl = num(slT) || null;
  const need = mg + fee - st.usdc;

  let bad = "";
  if (otype !== "Market" && !num(opx))
    bad = `Enter a ${otype.toLowerCase()} price.`;
  if (mg > 0 && mg < MIN_MARGIN)
    bad = `The smallest trade is $${MIN_MARGIN} of margin.`;
  if (tpOn && tp && (side > 0 ? tp <= en : tp >= en))
    bad = `Take profit has to be ${side > 0 ? "above" : "below"} your entry.`;
  if (tpOn && sl && (side > 0 ? sl >= en || sl <= liq : sl <= en || sl >= liq))
    bad = `Stop loss has to sit between your entry and ${fmtPx(liq)}.`;

  const setType = (t: "Market" | "Limit" | "Stop") => {
    setOtype(t);
    if (t !== "Market")
      setOpx(
        (t === "Limit"
          ? mk * (1 - side * 0.01)
          : mk * (1 + side * 0.01)
        ).toFixed(2),
      );
  };
  const pickSide = (v: 1 | -1) => {
    setSide(v);
    setTpT("");
    setSlT("");
  };
  const pctMargin = (p: number) => {
    const max = Math.floor((st.usdc / (1 + lev * TAKER)) * 100) / 100;
    setMarginT(String(Math.floor(max * p) / 100));
  };

  const go = () => {
    setPhase("busy");
    setTimeout(() => {
      const r = submitTicket({
        sym,
        side,
        lev,
        margin: mg,
        kind: otype,
        px: num(opx) || null,
        tp: tpOn ? tp : null,
        sl: tpOn ? sl : null,
      });
      setResult(r);
      setPhase("done");
    }, 1000);
  };

  const nm = m.short;
  const holdNeeded = lev >= 25 && !(mg > 0 && need > 0);
  const btnLabel =
    mg > 0 && need > 0
      ? "Add funds to trade"
      : lev >= 25
        ? `Hold to ${otype === "Market" ? "open" : "place"} ${lev}x ${side > 0 ? "long" : "short"}`
        : `${otype === "Market" ? "" : otype + " "}${side > 0 ? "Long " : "Short "}${nm} · ${lev}x`;
  const disabled = mg <= 0 || (!!bad && !(need > 0));

  // ---------------------------------------------------------------- processing
  if (phase === "busy")
    return (
      <Sheet onClose={() => {}}>
        <View style={{ alignItems: "center", gap: 20, paddingVertical: 14 }}>
          <H2 style={{ fontSize: 19 }}>
            {otype === "Market" ? "Opening on QFX" : "Placing your order"}
          </H2>
          <ActivityIndicator color={C.mint} />
          <Text style={s.mono}>
            {sideTxt(side)} {nm.toUpperCase()} · {lev}X · SIGNED IN YOUR WALLET
          </Text>
        </View>
      </Sheet>
    );

  // ---------------------------------------------------------------- success
  if (phase === "done" && result) {
    const isPos = "entry" in result;
    const col = side > 0 ? C.mint : C.loss;
    const rows: [string, string][] = isPos
      ? [
          ["ENTRY", fmtPx(result.entry)],
          ["SIZE", fmtPx(mg * lev) + " · " + lev + "x"],
          ["MARGIN", fmtPx(mg)],
          ["LIQUIDATION", fmtPx(liq)],
          ["FEE PAID", fmtPx(fee)],
        ]
      : [
          ["PRICE", fmtPx(num(opx))],
          ["SIDE", sideTxt(side) + " · " + lev + "x"],
          ["MARGIN HELD", fmtPx(mg)],
        ];
    if (tpOn && tp) rows.push(["TAKE PROFIT", fmtPx(tp)]);
    if (tpOn && sl) rows.push(["STOP LOSS", fmtPx(sl)]);
    return (
      <Sheet onClose={onClose}>
        <View style={{ alignItems: "center", gap: 14, paddingTop: 6 }}>
          <Check color={col} />
          <H2 style={{ textAlign: "center" }}>
            {isPos
              ? `${side > 0 ? "Long" : "Short"} ${nm} is open`
              : `${otype} order placed`}
          </H2>
          <Body style={{ textAlign: "center", fontSize: 13 }}>
            {isPos
              ? "It is on your chart with its liquidation line."
              : `It fills when ${nm} reaches ${fmtPx(num(opx))}. Your ${fmtPx(mg)} is set aside until then.`}
          </Body>
        </View>
        <KvCard>
          {rows.map(([k, v], i) => (
            <Kv key={k} k={k} v={v} last={i === rows.length - 1} />
          ))}
        </KvCard>
        <Btn
          label="See it on the chart"
          onPress={() => {
            onClose();
            onChart();
          }}
        />
        <Btn kind="ghost" small label="Done" onPress={onClose} />
      </Sheet>
    );
  }

  // ---------------------------------------------------------------- form
  return (
    <Sheet onClose={onClose}>
      <View style={s.row}>
        <View style={s.logo}>
          <Text style={s.logoT}>
            {m.symbol.replace(/[^A-Z0-9]/g, "").slice(0, 3)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.ttl}>{m.short} perp</Text>
          <Text style={[s.mono, { color: C.ink3, letterSpacing: 0 }]}>
            {fmtPx(mk)} mark
          </Text>
        </View>
        <Tag label={`UP TO ${MAXLEV}X`} />
      </View>

      <LongShortSeg side={side} onChange={pickSide} />

      <View style={s.row}>
        <Lbl style={{ flex: 1 }}>ORDER</Lbl>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["Market", "Limit", "Stop"] as const).map((t) => (
            <Pressable
              key={t}
              hitSlop={{ top: 6, bottom: 6 }}
              onPress={() => {
                hTap();
                setType(t);
              }}
              style={[
                s.otype,
                t === otype && {
                  backgroundColor: "#262C36",
                  borderColor: "transparent",
                },
              ]}
            >
              <Text style={[s.otypeT, t === otype && { color: C.ink1 }]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {otype !== "Market" ? (
        <View style={s.pxField}>
          <Text style={s.k}>{otype.toUpperCase()} PRICE</Text>
          <TextInput
            value={opx}
            onChangeText={(t) => setOpx(clean(t))}
            keyboardType="decimal-pad"
            style={s.pxIn}
            placeholderTextColor={C.ink4}
          />
          <Text style={s.k}>USD</Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={s.row}>
          <View style={{ flex: 1, gap: 8 }}>
            <Lbl>MARGIN</Lbl>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[25, 50, 75, 100].map((p) => (
                <Pressable
                  key={p}
                  hitSlop={{ top: 8, bottom: 8 }}
                  onPress={() => {
                    hTap();
                    pctMargin(p);
                  }}
                  style={s.pct}
                >
                  <Text style={s.pctT}>{p === 100 ? "Max" : p + "%"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <Text
              style={[
                s.mono,
                { fontSize: 13.5, color: "#E4E8EE", letterSpacing: 0 },
              ]}
            >
              {fmtPx(st.usdc)}
            </Text>
            <Text style={[s.mono, { fontSize: 8.5, color: C.ink4 }]}>
              USDC AVAILABLE
            </Text>
          </View>
        </View>
        <View style={s.amt}>
          <Text style={s.cur}>$</Text>
          <TextInput
            value={marginT}
            onChangeText={(t) => setMarginT(clean(t))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.ink4}
            style={s.amtIn}
          />
          <Text style={s.k}>USDC</Text>
        </View>
      </View>

      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Lbl style={{ flex: 1 }}>LEVERAGE</Lbl>
          <Text style={[s.levNum, { color: levTone(lev) }]}>{lev}x</Text>
        </View>
        <LeverageSlider value={lev} onChange={setLev} />
      </View>

      <View style={s.liqBox}>
        <View style={s.row}>
          <Text style={[s.k, { flex: 1 }]}>POSITION</Text>
          <Text
            style={[
              s.mono,
              { fontSize: 12.5, color: C.ink1, letterSpacing: 0 },
            ]}
          >
            {mg > 0
              ? `${fmtPx(notional)} · ${qtyFmt(qty)} ${m.category === "stocks" ? m.symbol : m.short}`
              : "—"}
          </Text>
        </View>
        <Text style={s.say}>
          {mg > 0 ? (
            <>
              If {nm} {side > 0 ? "falls" : "rises"} to{" "}
              <Text style={[s.b, { color: C.loss }]}>{fmtPx(liq)}</Text> (
              {side > 0 ? "−" : "+"}
              {dist.toFixed(1)}%), this closes and you lose your{" "}
              <Text style={s.b}>{fmtPx(mg)}</Text>. A{" "}
              {side > 0 ? "rise" : "fall"} of 5% makes{" "}
              <Text style={[s.b, { color: C.mint }]}>
                {fmtPx(notional * 0.05)}
              </Text>
              .
            </>
          ) : (
            "Enter how much of your USDC to put in. That is the most you can lose."
          )}
        </Text>
        <View style={s.ai}>
          <View style={[s.aiDot, { backgroundColor: toneCol }]}>
            <Svg width={12} height={12} viewBox="0 0 22 22" fill="#06120D">
              <Path d="M11 2.6c.6 4.1 3.7 7.2 7.8 7.8-4.1.6-7.2 3.7-7.8 7.8-.6-4.1-3.7-7.2-7.8-7.8 4.1-.6 7.2-3.7 7.8-7.8z" />
            </Svg>
          </View>
          <Text style={s.aiT}>
            <Text style={{ color: "#fff", fontFamily: FONT.sans800 }}>
              Analyst check.{" "}
            </Text>
            {toneTxt}
          </Text>
        </View>
      </View>

      <View>
        <View style={[s.row, { minHeight: 48 }]}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.ttl}>Take profit / stop loss</Text>
            <Text style={s.sub}>Close automatically at a price you pick</Text>
          </View>
          <Switch
            value={tpOn}
            onValueChange={(v) => {
              hTap();
              setTpOn(v);
            }}
            trackColor={{ false: "#262C36", true: C.mint }}
            thumbColor="#fff"
            ios_backgroundColor="#262C36"
            accessibilityLabel="Take profit and stop loss"
          />
        </View>
        {tpOn ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <View style={s.pxField}>
              <Text style={[s.k, { color: C.mint }]}>TP</Text>
              <TextInput
                value={tpT}
                onChangeText={(t) => setTpT(clean(t))}
                keyboardType="decimal-pad"
                placeholder="Price"
                placeholderTextColor={C.ink4}
                style={s.pxIn}
              />
              <Text style={[s.mono, { color: C.mint, fontSize: 12 }]}>
                {tp ? sMoney(side * (tp - en) * qty) : ""}
              </Text>
            </View>
            <View style={s.chips}>
              {[25, 50, 100].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    hTap();
                    setTpT((en * (1 + (side * v) / 100 / lev)).toFixed(2));
                  }}
                  style={s.chip}
                >
                  <Text style={s.chipT}>+{v}%</Text>
                </Pressable>
              ))}
              <Text style={s.sub}>on margin</Text>
            </View>
            <View style={s.pxField}>
              <Text style={[s.k, { color: C.loss }]}>SL</Text>
              <TextInput
                value={slT}
                onChangeText={(t) => setSlT(clean(t))}
                keyboardType="decimal-pad"
                placeholder="Price"
                placeholderTextColor={C.ink4}
                style={s.pxIn}
              />
              <Text style={[s.mono, { color: C.loss, fontSize: 12 }]}>
                {sl ? sMoney(side * (sl - en) * qty) : ""}
              </Text>
            </View>
            <View style={s.chips}>
              {[10, 25, 50].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    hTap();
                    setSlT((en * (1 - (side * v) / 100 / lev)).toFixed(2));
                  }}
                  style={s.chip}
                >
                  <Text style={s.chipT}>−{v}%</Text>
                </Pressable>
              ))}
              <Text style={s.sub}>on margin</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View>
        <Kv k="FEE" v={`${fmtPx(fee)} · ${(TAKER * 100).toFixed(2)}%`} />
        <Kv
          k={`FUNDING · NEXT IN ${fundLeft()}`}
          v={
            <Text style={[s.kvV, { color: fpay > 0 ? C.loss : C.mint }]}>
              {fpay > 0 ? "you pay " : "you get "}
              {fmtPx(Math.abs(fpay))}
            </Text>
          }
          last
        />
      </View>

      {mg > 0 && need > 0 ? (
        <View style={s.coach}>
          <Text style={s.coachH}>INSUFFICIENT FUNDS</Text>
          <Text style={s.coachT}>
            You have {fmtPx(st.usdc)} in your wallet. Add {fmtPx(need)} to open
            this trade.
          </Text>
        </View>
      ) : bad ? (
        <View style={s.coach}>
          <Text style={s.coachH}>CHECK</Text>
          <Text style={s.coachT}>{bad}</Text>
        </View>
      ) : null}

      <HoldButton
        kind={side > 0 ? "long" : "short"}
        label={btnLabel}
        hold={holdNeeded}
        disabled={disabled}
        onBlocked={() =>
          toast("Keep holding to confirm", `A SAFETY CHECK FOR ${lev}X`)
        }
        onConfirm={() => {
          if (mg > 0 && need > 0) deposit(Math.ceil(need));
          else go();
        }}
      />
      <Text
        style={[s.mono, { textAlign: "center", fontSize: 9, marginTop: -4 }]}
      >
        LEVERAGE CUTS BOTH WAYS · YOU CAN LOSE YOUR WHOLE MARGIN
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#262C36",
    alignItems: "center",
    justifyContent: "center",
  },
  logoT: { fontFamily: FONT.mono400, fontSize: 10, color: C.ink2 },
  ttl: {
    fontFamily: FONT.sans800,
    fontSize: 16,
    letterSpacing: -0.3,
    color: C.ink1,
  },
  sub: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.ink3 },
  mono: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: 1.6,
    color: C.ink4,
  },
  k: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: C.ink4,
  },
  otype: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2A303A",
    justifyContent: "center",
  },
  otypeT: { fontFamily: FONT.sans800, fontSize: 13, color: C.ink3 },
  pxField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: CARD,
  },
  pxIn: {
    flex: 1,
    height: "100%",
    color: C.ink1,
    fontFamily: FONT.mono400,
    fontSize: 16,
  },
  pct: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#262C36",
    justifyContent: "center",
  },
  pctT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink2 },
  amt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 62,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CARD,
  },
  cur: { fontFamily: FONT.sans800, fontSize: 26, color: C.ink3 },
  amtIn: {
    flex: 1,
    height: "100%",
    color: C.ink1,
    fontFamily: FONT.sans800,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  levNum: { fontFamily: FONT.sans800, fontSize: 30, letterSpacing: -1.2 },
  liqBox: {
    gap: 10,
    padding: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#161A21",
    borderWidth: 1,
    borderColor: "#262C36",
  },
  say: {
    fontFamily: FONT.sans600,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.ink1,
  },
  b: { fontFamily: FONT.sans800 },
  ai: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#232933",
  },
  aiDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  aiT: {
    flex: 1,
    fontFamily: FONT.sans600,
    fontSize: 12.5,
    lineHeight: 19,
    color: C.ink2,
  },
  chips: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#262C36",
    justifyContent: "center",
  },
  chipT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink2 },
  kvV: { fontFamily: FONT.mono400, fontSize: 12.5, color: "#D6DAE0" },
  coach: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(232,163,61,.10)",
    borderWidth: 1,
    borderColor: "rgba(232,163,61,.35)",
  },
  coachH: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: AMBER,
  },
  coachT: {
    fontFamily: FONT.sans600,
    fontSize: 13,
    lineHeight: 19,
    color: C.ink1,
  },
});
