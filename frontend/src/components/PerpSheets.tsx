// src/components/perps/PerpSheets.tsx
// PositionSheet (close / add margin / TP-SL / reverse / share), UnlockSheet (first-trade quiz),
// MarketPickerSheet, MarketStatusSheet.
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { C, FONT } from "../theme";
import { hTap } from "../lib/haptics";
import {
  MAXLEV,
  TAKER,
  addMargin,
  changeOf,
  closePerp,
  fmtPx,
  fundLeft,
  liqOf,
  marketOf,
  mktOpen,
  pnlOf,
  qtyFmt,
  reversePerp,
  roeOf,
  sMoney,
  sPct,
  setTpSl,
  sideTxt,
  toast,
  unlockPerps,
  usePerps,
  type Snap,
} from "../data/perpsStore";
import {
  PERP_CATEGORIES,
  PERP_MARKETS,
  perpLabel,
  searchPerps,
  type PerpCategory,
} from "../data/perps";
import {
  Body,
  Btn,
  CARD,
  Check,
  H2,
  Kv,
  KvCard,
  Lbl,
  Sheet,
  Tag,
} from "./PerpUi";

const tone = (n: number) => (n >= 0 ? C.mint : C.loss);
const clean = (t: string) => {
  const x = t.replace(/[^0-9.]/g, "");
  const i = x.indexOf(".");
  return i < 0 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, "");
};
const code = (sym: string) => sym.replace(/[^A-Z0-9]/g, "").slice(0, 3);

function Logo({ sym, size = 42 }: { sym: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: "#262C36",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: FONT.mono400,
          fontSize: size > 40 ? 10.5 : 10,
          color: C.ink2,
        }}
      >
        {code(sym)}
      </Text>
    </View>
  );
}
function Chip({
  label,
  on,
  onPress,
  danger,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        hTap();
        onPress();
      }}
      hitSlop={{ top: 7, bottom: 7 }}
      style={[
        s.chip,
        on && { backgroundColor: "#262C36", borderColor: "transparent" },
        danger && { borderColor: C.loss },
      ]}
    >
      <Text
        style={[s.chipT, on && { color: C.ink1 }, danger && { color: C.loss }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// =============================================================== PnL share card
function PnlCard({
  snap,
  live,
}: {
  snap: Snap & { live?: boolean };
  live?: boolean;
}) {
  const neg = snap.pnl < 0,
    nm = marketOf(snap.sym).short;
  return (
    <LinearGradient
      colors={
        neg
          ? ["rgba(240,96,77,.20)", "#0E1116"]
          : ["rgba(55,224,153,.22)", "#0E1116"]
      }
      start={{ x: 1, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={s.pnl}
    >
      <View style={s.rowC}>
        <Text
          style={{
            fontFamily: FONT.sans800,
            fontSize: 15,
            letterSpacing: -0.4,
            color: C.ink1,
            flex: 1,
          }}
        >
          Folio
        </Text>
        <Tag
          label={`${sideTxt(snap.side)} ${snap.lev}x`}
          tone={snap.side > 0 ? "long" : "short"}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.mono}>
          {nm.toUpperCase()} · PERP{live ? " · OPEN" : ""}
        </Text>
        <Text style={[s.roe, { color: tone(snap.roe) }]}>{sPct(snap.roe)}</Text>
        <Text
          style={{
            fontFamily: FONT.sans800,
            fontSize: 16,
            color: tone(snap.pnl),
          }}
        >
          {sMoney(snap.pnl)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          ["ENTRY", fmtPx(snap.entry)],
          [live ? "MARK" : "EXIT", fmtPx(snap.exit)],
        ].map(([k, v]) => (
          <View key={k} style={{ flex: 1, gap: 4 }}>
            <Text style={[s.mono, { fontSize: 8.5 }]}>{k}</Text>
            <Text
              style={{ fontFamily: FONT.mono400, fontSize: 13, color: C.ink1 }}
            >
              {v}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={[
          s.rowC,
          {
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,.08)",
          },
        ]}
      >
        <Text style={[s.mono, { flex: 1, textAlign: "right", fontSize: 9.5 }]}>
          TRYFOLIO.MONEY
        </Text>
      </View>
    </LinearGradient>
  );
}
const shareTrade = (snap: Snap) =>
  Share.share({
    message: `${sideTxt(snap.side).toLowerCase()} ${marketOf(snap.sym).short} ${snap.lev}x · ${sPct(snap.roe)} on Folio`,
  });

// =============================================================== position sheet
type PMode =
  | "view"
  | "closing"
  | "closed"
  | "margin"
  | "flip"
  | "tpsl"
  | "share";
export function PositionSheet({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const st = usePerps();
  const p = st.perps.find((x) => x.id === id);
  const [mode, setMode] = useState<PMode>("view");
  const [frac, setFrac] = useState(100);
  const [add, setAdd] = useState(25);
  const [snap, setSnap] = useState<{ snap: Snap; back: number } | null>(null);
  const [activeId, setActiveId] = useState(id);
  const pos = st.perps.find((x) => x.id === activeId) ?? p;
  const [tpT, setTpT] = useState(""),
    [slT, setSlT] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // position vanished (liquidated / TP / SL) while the sheet was open
  useEffect(() => {
    if (!pos && mode !== "closed" && mode !== "closing" && mode !== "share")
      onClose();
  }, [pos, mode]); // eslint-disable-line
  if (!pos && !(mode === "closed" || mode === "share")) return null;

  const m = pos ? marketOf(pos.sym) : marketOf("NVDA");
  const mk = pos ? st.marks[pos.sym].mark : 0;

  // ---- closing / closed
  if (mode === "closing")
    return (
      <Sheet onClose={() => {}}>
        <View style={{ alignItems: "center", gap: 20, paddingVertical: 14 }}>
          <H2 style={{ fontSize: 19 }}>Closing on QFX</H2>
          <ActivityIndicator color={C.mint} />
          <Text style={s.mono}>
            {frac}% OF {pos ? sideTxt(pos.side) : ""} {m.short.toUpperCase()}
          </Text>
        </View>
      </Sheet>
    );
  if (mode === "closed" && snap)
    return (
      <Sheet onClose={onClose}>
        <View style={{ alignItems: "center", gap: 14, paddingTop: 6 }}>
          <Check />
          <H2
            style={{
              fontSize: 30,
              color: tone(snap.snap.pnl),
              textAlign: "center",
            }}
          >
            {sMoney(snap.snap.pnl)}
          </H2>
          <Body style={{ textAlign: "center", fontSize: 13 }}>
            {fmtPx(snap.back)} is back in your wallet, ready for your next
            trade.
          </Body>
        </View>
        <Btn label="Share this trade" onPress={() => setMode("share")} />
        <Btn kind="ghost" small label="Done" onPress={onClose} />
      </Sheet>
    );
  if (mode === "share" && (snap || pos)) {
    const sn: Snap & { live?: boolean } = snap
      ? snap.snap
      : {
          sym: pos!.sym,
          side: pos!.side,
          lev: pos!.lev,
          entry: pos!.entry,
          exit: mk,
          pnl: pnlOf(pos!, mk),
          roe: roeOf(pos!, mk),
          live: true,
        };
    return (
      <Sheet onClose={onClose}>
        <PnlCard snap={sn} live={!snap} />
        <Btn label="Share" onPress={() => shareTrade(sn)} />
        <Btn
          kind="ghost"
          small
          label="Back"
          onPress={() => setMode(snap ? "closed" : "view")}
        />
      </Sheet>
    );
  }
  if (!pos) return null;

  const pnl = pnlOf(pos, mk),
    roe = roeOf(pos, mk),
    liq = liqOf(pos);
  const days = Math.max(0, Math.round((Date.now() - pos.t) / 86400e3));
  const fpay = pos.qty * mk * (m.funding / 100) * pos.side;
  const f = frac / 100;
  const back = Math.max(0, pos.margin * f + pnl * f - pos.qty * f * mk * TAKER);
  const BackRow = ({ to = "view" as PMode }) => (
    <Pressable
      onPress={() => setMode(to)}
      hitSlop={10}
      style={{ marginBottom: -6 }}
    >
      <Text style={{ fontFamily: FONT.sans800, fontSize: 13.5, color: C.ink2 }}>
        ‹ {m.short} {sideTxt(pos.side).toLowerCase()}
      </Text>
    </Pressable>
  );

  // ---- add margin
  if (mode === "margin") {
    const q = { ...pos, margin: pos.margin + add };
    const short = add > st.usdc;
    return (
      <Sheet onClose={onClose}>
        <BackRow />
        <H2>Add margin</H2>
        <Body style={{ marginTop: -8 }}>
          More margin pushes your liquidation price further away. It comes from
          your {fmtPx(st.usdc)} in cash.
        </Body>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[10, 25, 50, 100].map((v) => (
            <Chip
              key={v}
              label={"$" + v}
              on={v === add}
              onPress={() => setAdd(v)}
            />
          ))}
        </View>
        <View style={s.liqBox}>
          <Text style={s.say}>
            Liquidation moves from <Text style={s.b}>{fmtPx(liq)}</Text> to{" "}
            <Text style={[s.b, { color: C.mint }]}>{fmtPx(liqOf(q))}</Text>.
            Leverage drops to about{" "}
            {((pos.qty * pos.entry) / q.margin).toFixed(1)}x.
          </Text>
        </View>
        <Btn
          disabled={short}
          label={short ? "Not enough cash in your wallet" : "Add " + fmtPx(add)}
          onPress={() => {
            addMargin(pos.id, add);
            setMode("view");
          }}
        />
      </Sheet>
    );
  }

  // ---- reverse
  if (mode === "flip")
    return (
      <Sheet onClose={onClose}>
        <BackRow />
        <H2>Flip to {pos.side > 0 ? "short" : "long"}?</H2>
        <Body style={{ marginTop: -8 }}>
          This closes your {sideTxt(pos.side).toLowerCase()} at {fmtPx(mk)} (
          {sMoney(pnl)}) and opens a {pos.side > 0 ? "short" : "long"} of the
          same size at {pos.lev}x.
        </Body>
        <Btn
          kind={pos.side > 0 ? "short" : "long"}
          label={`Flip to ${pos.side > 0 ? "short" : "long"} · ${pos.lev}x`}
          onPress={() => {
            const q = reversePerp(pos.id);
            if (q) {
              setActiveId(q.id);
              setMode("view");
            } else onClose();
          }}
        />
      </Sheet>
    );

  // ---- TP / SL (the prototype drags lines on the chart; here you type or tap a suggestion)
  if (mode === "tpsl") {
    const tp = parseFloat(tpT) || null,
      sl = parseFloat(slT) || null;
    const tpBad = tp != null && (pos.side > 0 ? tp <= mk : tp >= mk);
    const slBad =
      sl != null &&
      (pos.side > 0 ? sl >= mk || sl <= liq : sl <= mk || sl >= liq);
    return (
      <Sheet onClose={onClose}>
        <BackRow />
        <H2>Take profit / stop loss</H2>
        <Body style={{ marginTop: -8 }}>
          Close automatically at a price you pick. A stop has to sit between the
          mark and your liquidation at {fmtPx(liq)}.
        </Body>
        <View style={s.field}>
          <Text style={[s.k, { color: C.mint }]}>TP</Text>
          <TextInput
            value={tpT}
            onChangeText={(t) => setTpT(clean(t))}
            keyboardType="decimal-pad"
            placeholder="Price"
            placeholderTextColor={C.ink4}
            style={s.fieldIn}
          />
          <Text style={[s.mono, { color: C.mint }]}>
            {tp ? sMoney(pos.side * (tp - pos.entry) * pos.qty) : ""}
          </Text>
        </View>
        <View style={s.field}>
          <Text style={[s.k, { color: C.loss }]}>SL</Text>
          <TextInput
            value={slT}
            onChangeText={(t) => setSlT(clean(t))}
            keyboardType="decimal-pad"
            placeholder="Price"
            placeholderTextColor={C.ink4}
            style={s.fieldIn}
          />
          <Text style={[s.mono, { color: C.loss }]}>
            {sl ? sMoney(pos.side * (sl - pos.entry) * pos.qty) : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip
            label="Suggest"
            onPress={() => {
              setTpT((mk * (1 + pos.side * 0.035)).toFixed(2));
              setSlT((mk * (1 - pos.side * 0.02)).toFixed(2));
            }}
          />
          <Chip
            label="Clear both"
            onPress={() => {
              setTpT("");
              setSlT("");
            }}
          />
        </View>
        {tpBad || slBad ? (
          <Text style={[s.say, { color: C.loss }]}>
            {tpBad
              ? `Take profit has to be ${pos.side > 0 ? "above" : "below"} the mark.`
              : `Stop loss has to sit between ${fmtPx(mk)} and ${fmtPx(liq)}.`}
          </Text>
        ) : null}
        <Btn
          disabled={tpBad || slBad}
          label="Save"
          onPress={() => {
            setTpSl(pos.id, tp, sl);
            toast(
              "TP / SL saved",
              m.short.toUpperCase() +
                " · " +
                sideTxt(pos.side) +
                " " +
                pos.lev +
                "X",
            );
            setMode("view");
          }}
        />
      </Sheet>
    );
  }

  // ---- main view
  return (
    <Sheet onClose={onClose}>
      <View style={s.rowC}>
        <Logo sym={pos.sym} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={[s.rowC, { gap: 8 }]}>
            <Text
              style={{
                fontFamily: FONT.sans800,
                fontSize: 21,
                letterSpacing: -0.6,
                color: C.ink1,
              }}
            >
              {perpLabel(m)}
            </Text>
            <Tag
              label={`${sideTxt(pos.side)} ${pos.lev}x`}
              tone={pos.side > 0 ? "long" : "short"}
            />
          </View>
          <Text style={s.sub}>
            Opened{" "}
            {days ? `${days} ${days === 1 ? "day" : "days"} ago` : "today"} ·
            isolated margin
          </Text>
        </View>
        <Pressable
          onPress={() => setMode("share")}
          style={s.iconBtn}
          accessibilityLabel="Share this trade"
        >
          <Svg
            width={18}
            height={18}
            viewBox="0 0 20 20"
            fill="none"
            stroke={C.ink2}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M10 12.5V3M6.5 6.5 10 3l3.5 3.5" />
            <Path d="M5 10H4.5A1.5 1.5 0 0 0 3 11.5v4A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 15.5 10H15" />
          </Svg>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Lbl>UNREALIZED PROFIT</Lbl>
        <Text
          style={{
            fontFamily: FONT.sans800,
            fontSize: 38,
            letterSpacing: -1.6,
            color: tone(pnl),
            fontVariant: ["tabular-nums"],
          }}
        >
          {sMoney(pnl)}
        </Text>
        <Text
          style={{ fontFamily: FONT.mono400, fontSize: 13, color: tone(roe) }}
        >
          {sPct(roe)} on your margin
        </Text>
      </View>

      <KvCard>
        <Kv k="SIZE" v={`${qtyFmt(pos.qty)} · ${fmtPx(pos.qty * mk)}`} />
        <Kv k="MARGIN" v={fmtPx(pos.margin)} />
        <Kv k="ENTRY → MARK" v={`${fmtPx(pos.entry)} → ${fmtPx(mk)}`} />
        <Kv k="LIQUIDATION" v={fmtPx(liq)} tone="down" />
        <Kv
          k="TAKE PROFIT / STOP"
          v={`${pos.tp ? fmtPx(pos.tp) : "—"} / ${pos.sl ? fmtPx(pos.sl) : "—"}`}
        />
        <Kv
          k={`FUNDING · ${fundLeft()}`}
          v={
            <Text style={[s.kvV, { color: fpay > 0 ? C.loss : C.mint }]}>
              {fpay > 0 ? "you pay " : "you get "}
              {fmtPx(Math.abs(fpay))}
            </Text>
          }
          last
        />
      </KvCard>

      <View style={{ gap: 10 }}>
        <View style={s.rowC}>
          <Lbl style={{ flex: 1 }}>CLOSE</Lbl>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[25, 50, 75, 100].map((v) => (
              <Chip
                key={v}
                label={v + "%"}
                on={v === frac}
                onPress={() => setFrac(v)}
              />
            ))}
          </View>
        </View>
        <Btn
          kind="sell"
          label={`${f < 1 ? `Close ${frac}%` : "Close position"} · get ${fmtPx(back)}`}
          onPress={() => {
            setMode("closing");
            setTimeout(() => {
              const r = closePerp(pos.id, frac / 100, null);
              if (r) {
                setSnap({ snap: r.snap, back: r.back });
                setMode("closed");
              } else onClose();
            }, 900);
          }}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn
          kind="quiet"
          small
          label="Add margin"
          style={{ flex: 1 }}
          onPress={() => setMode("margin")}
        />
        <Btn
          kind="quiet"
          small
          label="TP / SL"
          style={{ flex: 1 }}
          onPress={() => {
            setTpT(pos.tp ? String(pos.tp) : "");
            setSlT(pos.sl ? String(pos.sl) : "");
            setMode("tpsl");
          }}
        />
        <Btn
          kind="quiet"
          small
          label="Reverse"
          style={{ flex: 1 }}
          onPress={() => setMode("flip")}
        />
      </View>
    </Sheet>
  );
}

// =============================================================== first-trade unlock
const QUIZ: { q: string; a: [string, string, boolean?][] }[] = [
  {
    q: "You put $100 into a 10x long on NVDA. NVDA falls 10%. What happens?",
    a: [
      [
        "You lose about $10",
        "That is how spot works. At 10x, a 10% fall is 100% of your margin.",
      ],
      [
        "Your $100 is gone. The position is liquidated",
        "Right. Leverage multiplies the move: 10% × 10 = 100% of your margin.",
        true,
      ],
    ],
  },
  {
    q: "What is funding?",
    a: [
      [
        "A small payment between longs and shorts, every hour",
        "Right. When more people are long, longs pay shorts, and the other way round. You see the rate before you trade.",
        true,
      ],
      [
        "A one-off fee Folio charges to open a trade",
        "Funding is paid between traders every hour, for as long as your position is open.",
      ],
    ],
  },
  {
    q: "Do you own NVDA shares when you go long on the perp?",
    a: [
      [
        "Yes, the same as buying on Spot",
        "A perp is a contract on the price. To own the shares, buy on Spot.",
      ],
      [
        "No. It is a contract on the price",
        "Right. You never hold the stock, so there are no dividends or votes.",
        true,
      ],
    ],
  },
];
export function UnlockSheet({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [ok, setOk] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const Dots = () => (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 3,
            flex: 1,
            borderRadius: 999,
            backgroundColor: i <= step ? C.mint : "#2A303A",
          }}
        />
      ))}
    </View>
  );
  if (step === 0)
    return (
      <Sheet onClose={onClose}>
        <Dots />
        <View style={{ gap: 8 }}>
          <Lbl>PERPS · ONE-TIME CHECK</Lbl>
          <H2>Before your first leveraged trade</H2>
        </View>
        <Body style={{ marginTop: -6 }}>
          A perp lets you trade a price going up (long) or down (short) with
          more than you put in. Gains grow faster, and so do losses. Three quick
          questions, then you are in.
        </Body>
        <Pressable
          onPress={() => {
            hTap();
            setOk(!ok);
          }}
          style={[s.rowC, { gap: 12, minHeight: 56 }]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ok }}
        >
          <View
            style={[s.chk, ok && { backgroundColor: C.mint, borderWidth: 0 }]}
          >
            {ok ? (
              <Svg
                width={14}
                height={14}
                viewBox="0 0 16 16"
                fill="none"
                stroke="#06120D"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="m3.5 8.5 3 3 6-7" />
              </Svg>
            ) : null}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                fontFamily: FONT.sans600,
                fontSize: 14,
                lineHeight: 20,
                color: C.ink1,
              }}
            >
              I am not a US person, and perps are allowed where I live
            </Text>
            <Text style={s.sub}>
              Not offered in [RESTRICTED REGIONS AT LAUNCH]
            </Text>
          </View>
        </Pressable>
        <Btn disabled={!ok} label="Start" onPress={() => setStep(1)} />
      </Sheet>
    );
  if (step <= 3) {
    const Q = QUIZ[step - 1],
      sel = pick != null ? Q.a[pick] : null;
    return (
      <Sheet onClose={onClose}>
        <Dots />
        <View style={{ gap: 8 }}>
          <Lbl>QUESTION {step} OF 3</Lbl>
          <H2 style={{ fontSize: 21, lineHeight: 26 }}>{Q.q}</H2>
        </View>
        <View style={{ gap: 10 }}>
          {Q.a.map((x, i) => {
            const right = pick === i && x[2],
              wrong = pick === i && !x[2];
            return (
              <Pressable
                key={i}
                onPress={() => {
                  hTap();
                  setPick(i);
                }}
                style={[
                  s.qOpt,
                  right && {
                    borderColor: C.mint,
                    backgroundColor: "rgba(55,224,153,.08)",
                  },
                  wrong && {
                    borderColor: C.loss,
                    backgroundColor: "rgba(240,96,77,.08)",
                  },
                ]}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: FONT.sans600,
                    fontSize: 14,
                    lineHeight: 20,
                    color: C.ink1,
                  }}
                >
                  {x[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {sel ? (
          <Text style={s.qNote}>
            {sel[1]}
            {sel[2] ? "" : " Try the other answer."}
          </Text>
        ) : null}
        {sel?.[2] ? (
          <Btn
            label={step < 3 ? "Next question" : "Finish"}
            onPress={() => {
              setPick(null);
              if (step < 3) setStep(step + 1);
              else {
                unlockPerps();
                setStep(4);
              }
            }}
          />
        ) : null}
      </Sheet>
    );
  }
  return (
    <Sheet onClose={onClose}>
      <View style={{ alignItems: "center", gap: 14, paddingTop: 6 }}>
        <Check />
        <H2 style={{ textAlign: "center" }}>Perps are unlocked</H2>
        <Body style={{ textAlign: "center", fontSize: 13 }}>
          You can trade up to {MAXLEV}x. From 25x up you hold the button to
          confirm, so a big bet never happens by accident.
        </Body>
      </View>
      <Btn label="Continue to your trade" onPress={onDone} />
    </Sheet>
  );
}

// =============================================================== market picker
export function MarketPickerSheet({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (sym: string) => void;
  onClose: () => void;
}) {
  const st = usePerps();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | PerpCategory>("all");
  const list = useMemo(
    () =>
      searchPerps(
        PERP_MARKETS.filter((m) => cat === "all" || m.category === cat),
        q,
      ),
    [q, cat],
  );
  return (
    <Sheet onClose={onClose}>
      <View style={{ gap: 6 }}>
        <Lbl>PERP MARKETS</Lbl>
        <H2>Long or short any of {PERP_MARKETS.length}</H2>
      </View>
      <View style={s.search}>
        <Svg
          width={18}
          height={18}
          viewBox="0 0 20 20"
          fill="none"
          stroke={C.ink3}
          strokeWidth={1.8}
          strokeLinecap="round"
        >
          <Path d="M14.2 8.8a5.4 5.4 0 1 1-10.8 0 5.4 5.4 0 0 1 10.8 0Z" />
          <Path d="m12.8 12.8 3.7 3.7" />
        </Svg>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="NVDA, gold, S&P 500…"
          placeholderTextColor={C.ink4}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={s.searchIn}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {PERP_CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            on={c.key === cat}
            onPress={() => setCat(c.key)}
          />
        ))}
      </View>
      <View style={{ marginTop: -6 }}>
        {list.length ? (
          list.map((m, i) => {
            const mark = st.marks[m.symbol].mark,
              ch = changeOf(m.symbol);
            return (
              <Pressable
                key={m.symbol}
                onPress={() => {
                  hTap();
                  onPick(m.symbol);
                }}
                style={[
                  s.mRow,
                  i < list.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: C.hair,
                  },
                ]}
              >
                <Logo sym={m.symbol} size={38} />
                <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                  <View style={[s.rowC, { gap: 7 }]}>
                    <Text
                      style={{
                        fontFamily: FONT.sans800,
                        fontSize: 15,
                        color: C.ink1,
                      }}
                    >
                      {perpLabel(m)}
                    </Text>
                    {m.symbol === current ? <Tag label="VIEWING" /> : null}
                  </View>
                  <Text style={s.sub} numberOfLines={1}>
                    {m.name} · {m.kind}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <Text
                    style={{
                      fontFamily: FONT.mono400,
                      fontSize: 13,
                      color: C.ink1,
                    }}
                  >
                    {fmtPx(mark)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONT.mono400,
                      fontSize: 11.5,
                      color: tone(ch),
                    }}
                  >
                    {sPct(ch)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={[s.sub, { paddingVertical: 14, fontSize: 13.5 }]}>
            No perp market for that yet.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

// =============================================================== market status
export function MarketStatusSheet({
  sym,
  onClose,
}: {
  sym: string;
  onClose: () => void;
}) {
  const m = marketOf(sym),
    open = mktOpen(m),
    what = m.category === "commodities" ? "commodity" : "US stock";
  return (
    <Sheet onClose={onClose}>
      <View style={{ gap: 8 }}>
        <Lbl>{open ? "MARKET OPEN" : "MARKET CLOSED"}</Lbl>
        <H2>
          {open ? "The perp tracks the live price" : "The perp keeps trading"}
        </H2>
      </View>
      <Body>
        {open
          ? `While the ${what} market is open, the mark price follows the live price from the oracle. Funding keeps the perp close to it.`
          : `The ${what} market is closed, but ${perpLabel(m)} perps trade around the clock. The price moves on what traders do now and snaps back toward the real price when the market reopens. Gaps at the open can be large, so keep leverage in check over weekends.`}
      </Body>
      <KvCard>
        <Kv k="US MARKET HOURS" v="9:30–16:00 ET · MON–FRI" />
        <Kv k="PERP HOURS" v="24/7" />
        <Kv k="PRICE SOURCE" v="[ORACLE AT LAUNCH]" last />
      </KvCard>
      <Btn kind="quiet" small label="Got it" onPress={onClose} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  rowC: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  sub: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.ink3 },
  kvV: { fontFamily: FONT.mono400, fontSize: 12.5, color: "#D6DAE0" },
  chip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2A303A",
    justifyContent: "center",
  },
  chipT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink3 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  liqBox: {
    padding: 16,
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
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: CARD,
  },
  fieldIn: {
    flex: 1,
    height: "100%",
    color: C.ink1,
    fontFamily: FONT.mono400,
    fontSize: 16,
  },
  pnl: {
    borderRadius: 22,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#2A303A",
    overflow: "hidden",
  },
  roe: {
    fontFamily: FONT.sans800,
    fontSize: 52,
    letterSpacing: -2.6,
    lineHeight: 54,
    fontVariant: ["tabular-nums"],
  },
  chk: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#3A404A",
    alignItems: "center",
    justifyContent: "center",
  },
  qOpt: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: "transparent",
    justifyContent: "center",
  },
  qNote: {
    fontFamily: FONT.sans600,
    fontSize: 13,
    lineHeight: 20,
    color: C.ink2,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: CARD,
  },
  searchIn: {
    flex: 1,
    height: "100%",
    color: C.ink1,
    fontFamily: FONT.sans600,
    fontSize: 15,
  },
  mRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12 },
});
