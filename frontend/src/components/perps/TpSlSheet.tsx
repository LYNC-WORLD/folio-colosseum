import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Body, Btn, CARD, H2, Lbl, Sheet, Tag } from "../PerpUi";
import { fmtPx, sMoney, sideTxt, toast } from "../../data/perpsStore";
import { C, FONT } from "../../theme";
import { hTap } from "../../lib/haptics";
import { tradeService, unwrap } from "../../services/perps/tradeService";
import { errMsg } from "../../services/hyperliquid/format";
import type { UiPosition } from "../../hooks/perps";

const clean = (t: string) => {
  const x = t.replace(/[^0-9.]/g, "");
  const i = x.indexOf(".");
  return i < 0 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, "");
};

type Mode = "price" | "pct";
type Kind = "tp" | "sl";

const CHIPS: Record<Kind, number[]> = {
  tp: [10, 25, 50, 100],
  sl: [5, 10, 25, 50],
};

const decimals = (px: number) => (px >= 100 ? 2 : px >= 1 ? 4 : 6);
const toStr = (n: number, px: number) =>
  String(Number(n.toFixed(decimals(px))));

const TargetIcon = memo(function TargetIcon() {
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
      <Path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
      <Path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </Svg>
  );
});

function Field({
  label,
  mode,
  onMode,
  value,
  onChange,
  placeholder,
  chips,
  onChip,
  bad,
  estimate,
}: {
  label: string;
  mode: Mode;
  onMode: (m: Mode) => void;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  chips: number[];
  onChip: (pct: number) => void;
  bad: boolean;
  estimate: number | null; // est. P&L when the trigger hits (price mode only)
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 8 }}>
          <Lbl>{label}</Lbl>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {chips.map((v) => (
              <Pressable
                key={v}
                hitSlop={{ top: 8, bottom: 8 }}
                onPress={() => {
                  hTap();
                  onChip(v);
                }}
                style={s.pct}
              >
                <Text style={s.pctT}>{v}%</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.modeWrap}>
          {(["price", "pct"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                hTap();
                onMode(m);
              }}
              style={[s.modeBtn, mode === m && s.modeOn]}
            >
              <Text style={[s.modeT, mode === m && { color: C.ink1 }]}>
                {m === "price" ? "Price" : "%"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[s.field, bad && { borderColor: C.loss }]}>
        {mode === "price" ? <Text style={s.cur}>$</Text> : null}
        <TextInput
          value={value}
          onChangeText={(t) => onChange(clean(t))}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={C.ink4}
          style={s.input}
        />
        {mode === "pct" ? <Text style={s.k}>%</Text> : null}
      </View>

      {estimate != null && !bad ? (
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={s.k}>EST. P&L AT TRIGGER</Text>
          <Text style={[s.after, { color: estimate >= 0 ? C.mint : C.loss }]}>
            {sMoney(estimate)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function TpSlSheet({
  position: p,
  mark,
  label,
  idToken,
  onClose,
  onSaved,
}: {
  position: UiPosition;
  mark: number;
  label: string;
  idToken: string | null | undefined;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const long = p.side > 0;

  const [tpMode, setTpMode] = useState<Mode>("price");
  const [slMode, setSlMode] = useState<Mode>("price");
  const [tp, setTp] = useState(p.tp != null ? String(p.tp) : "");
  const [sl, setSl] = useState(p.sl != null ? String(p.sl) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const tpNum = parseFloat(tp) || 0;
  const slNum = parseFloat(sl) || 0;
  const hasTp = tp.length > 0 && tpNum > 0;
  const hasSl = sl.length > 0 && slNum > 0;

  const tpBad =
    hasTp && tpMode === "price" && (long ? tpNum <= p.entry : tpNum >= p.entry);
  const slBad =
    hasSl && slMode === "price" && (long ? slNum >= p.entry : slNum <= p.entry);

  const ok = (hasTp || hasSl) && !tpBad && !slBad;

  // chip tap: in % mode it fills the percent, in price mode it converts to a price
  const priceFromPct = (kind: Kind, pct: number) => {
    const up = kind === "tp" ? long : !long;
    return p.entry * (1 + (up ? pct : -pct) / 100);
  };
  const applyChip = (kind: Kind, pct: number) => {
    setErr("");
    const mode = kind === "tp" ? tpMode : slMode;
    const val =
      mode === "pct" ? String(pct) : toStr(priceFromPct(kind, pct), p.entry);
    kind === "tp" ? setTp(val) : setSl(val);
  };

  const pnlAt = (px: number) => (px - p.entry) * p.size * (long ? 1 : -1);
  const tpEst = hasTp && tpMode === "price" ? pnlAt(tpNum) : null;
  const slEst = hasSl && slMode === "price" ? pnlAt(slNum) : null;

  const submit = async () => {
    if (!ok || busy) return;
    if (!idToken) {
      setErr("Sign in first");
      return;
    }
    hTap();
    setErr("");
    setBusy(true);
    try {
      await unwrap(
        tradeService.placeTpSlOrders(
          {
            stockSymbol: p.sym,
            ...(hasTp
              ? tpMode === "price"
                ? { tpPrice: tpNum }
                : { tpPercent: tpNum }
              : {}),
            ...(hasSl
              ? slMode === "price"
                ? { slPrice: slNum }
                : { slPercent: slNum }
              : {}),
          },
          idToken,
        ),
      );
      onSaved?.();
      onClose();
      toast("TP/SL updated", label.toUpperCase()); // after close, like TransferSheet
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={busy ? () => {} : onClose}>
      <View style={{ gap: 6 }}>
        <Lbl>{label.toUpperCase()}</Lbl>
        <H2>Take profit / stop loss</H2>
      </View>

      {/* position summary card, same shape as TransferSheet's Card */}
      <View style={s.card}>
        <View style={s.ic}>
          <TargetIcon />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.k}>ENTRY</Text>
            <Tag
              label={`${sideTxt(p.side)} ${p.lev}x`}
              tone={long ? "long" : "short"}
            />
          </View>
          <Text style={s.bal}>{fmtPx(p.entry)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={s.k}>MARK</Text>
          <Text style={s.after}>{fmtPx(mark)}</Text>
        </View>
      </View>

      <Field
        label="TAKE PROFIT"
        mode={tpMode}
        onMode={setTpMode}
        value={tp}
        onChange={(v) => {
          setTp(v);
          setErr("");
        }}
        placeholder={long ? "Above entry" : "Below entry"}
        chips={CHIPS.tp}
        onChip={(v) => applyChip("tp", v)}
        bad={tpBad}
        estimate={tpEst}
      />

      <Field
        label="STOP LOSS"
        mode={slMode}
        onMode={setSlMode}
        value={sl}
        onChange={(v) => {
          setSl(v);
          setErr("");
        }}
        placeholder={long ? "Below entry" : "Above entry"}
        chips={CHIPS.sl}
        onChip={(v) => applyChip("sl", v)}
        bad={slBad}
        estimate={slEst}
      />

      {err ? (
        <View style={s.coach}>
          <Text style={s.coachH}>COULDN'T SAVE</Text>
          <Text style={s.coachT}>{err}</Text>
        </View>
      ) : (
        <Text style={s.note}>
          Applies to the whole position. Orders trigger at the market price once
          the level is hit.
        </Text>
      )}

      <Btn
        disabled={!ok || busy}
        label={
          busy
            ? "Saving…"
            : tpBad
              ? `Take profit must be ${long ? "above" : "below"} entry`
              : slBad
                ? `Stop loss must be ${long ? "below" : "above"} entry`
                : !hasTp && !hasSl
                  ? "Set a take profit or stop loss"
                  : "Save TP/SL"
        }
        onPress={submit}
      />
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
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
    color: "#E4E8EE",
    fontVariant: ["tabular-nums"],
  },
  pct: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#262C36",
    justifyContent: "center",
  },
  pctT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink2 },
  modeWrap: {
    flexDirection: "row",
    padding: 2,
    borderRadius: 9,
    backgroundColor: "#1A1F27",
  },
  modeBtn: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 7,
    justifyContent: "center",
  },
  modeOn: { backgroundColor: C.raised },
  modeT: { fontFamily: FONT.sans700, fontSize: 11.5, color: C.ink4 },
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
