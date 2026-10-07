import { StyleSheet, Text, View } from "react-native";
import { PressScale } from "./ui";
import { C, FONT, TYPE, em } from "../theme";
import { hTap } from "../lib/haptics";
import type { PerpCategory } from "../hooks/usePerpPositions";
import { UiPosition } from "../hooks/perps";

export type PerpRow = UiPosition & { category?: PerpCategory };

const usd = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const sMoney = (n: number) => (n < 0 ? "−" : "+") + usd(n);
const sPct = (n: number) => (n < 0 ? "−" : "+") + Math.abs(n).toFixed(2) + "%";
const tone = (n: number) => (n >= 0 ? C.mint : C.loss);

// "+ $182.37 in perps · +$12.37" (place under the total; renders nothing when empty)
export function PerpSummaryLine({
  equity,
  pnl,
  count,
}: {
  equity: number;
  pnl: number;
  count: number;
}) {
  if (!count) return null;
  return (
    <Text style={s.summary}>
      {"+ "}
      {usd(equity)} in perps
      {" · "}
      <Text style={{ color: tone(pnl) }}>{sMoney(pnl)}</Text>
    </Text>
  );
}

// Heading block for the Perps tab: "Perps (1)" / "$120.00 margin · +$13.13 open"
export function PerpsHeader({
  count,
  margin,
  pnl,
}: {
  count: number;
  margin: number;
  pnl: number;
}) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={s.title}>
        Perps <Text style={{ color: C.ink3 }}>({count})</Text>
      </Text>
      <Text style={s.sub}>
        {count ? (
          <>
            {usd(margin)} margin{" · "}
            <Text style={{ color: tone(pnl) }}>{sMoney(pnl)}</Text> open
          </>
        ) : (
          "Long or short, up to 50x"
        )}
      </Text>
    </View>
  );
}

export function PerpPositionRow({
  p,
  last,
  onPress,
}: {
  p: PerpRow;
  last?: boolean;
  onPress?: (p: PerpRow) => void;
}) {
  const name = p.sym;
  const mark = p.size ? p.value / p.size : p.entry; // mark price = position value / size
  const pnl = p.pnl;
  const roe = p.roe;
  const long = p.side > 0;
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress?.(p);
      }}
      style={[s.row, !last && s.hair]}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${long ? "long" : "short"} ${p.lev}x, ${sMoney(pnl)}`}
    >
      <View style={s.logo}>
        <Text style={s.logoText}>{name.slice(0, 3).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
        <View style={s.line}>
          <Text style={TYPE.ttl} numberOfLines={1}>
            {name}
          </Text>
          <View
            style={[
              s.side,
              {
                backgroundColor: long
                  ? "rgba(55,224,153,.12)"
                  : "rgba(240,96,77,.12)",
              },
            ]}
          >
            <Text style={[s.sideText, { color: long ? C.mint : C.loss }]}>
              {long ? "LONG" : "SHORT"} {p.lev}x
            </Text>
          </View>
        </View>
        <Text style={s.px} numberOfLines={1}>
          {usd(p.entry)} → {usd(mark)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[s.pnl, { color: tone(pnl) }]}>{sMoney(pnl)}</Text>
        <Text style={[s.roe, { color: tone(roe) }]}>{sPct(roe)}</Text>
      </View>
    </PressScale>
  );
}

// The list under the chips. `category` is your current chip value ("all" | "stocks" | "index" | "commodities").
export function PerpPositionList({
  positions,
  category,
  onOpen,
  onOpenTrade,
}: {
  positions: PerpRow[];
  category: "all" | PerpCategory;
  onOpen?: (p: PerpRow) => void;
  onOpenTrade: () => void;
}) {
  const rows = positions.filter(
    (p) => category === "all" || (p.category ?? "stocks") === category,
  );
  if (!rows.length) {
    return (
      <View style={s.empty}>
        <Text style={TYPE.sub}>
          {positions.length
            ? "No perps in this category."
            : "No perp positions. Go long or short on stocks, index funds and commodities."}
        </Text>
        {!positions.length && (
          <PressScale
            onPress={onOpenTrade}
            style={s.cta}
            accessibilityRole="button"
          >
            <Text style={s.ctaText}>Open Trade</Text>
          </PressScale>
        )}
      </View>
    );
  }
  return (
    <View>
      {rows.map((p, i) => (
        <PerpPositionRow
          key={p.id}
          p={p}
          last={i === rows.length - 1}
          onPress={onOpen}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  summary: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  title: {
    fontFamily: FONT.sans800,
    fontSize: 20,
    letterSpacing: em(20, -0.03),
    color: C.ink1,
  },
  sub: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink4 },
  row: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontFamily: FONT.mono400, fontSize: 10.5, color: C.mint },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  side: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  sideText: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.12),
  },
  px: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  pnl: {
    fontFamily: FONT.sans700,
    fontSize: 15.5,
    fontVariant: ["tabular-nums"],
  },
  roe: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  empty: { gap: 14, paddingVertical: 18, alignItems: "flex-start" },
  cta: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#313844",
    backgroundColor: "#1D222B",
    justifyContent: "center",
  },
  ctaText: { fontFamily: FONT.sans700, fontSize: 13.5, color: C.ink1 },
});
