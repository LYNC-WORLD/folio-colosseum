// List row for an asset (prototype resultRow): avatar, name, ticker · kind,
// price and today's move on the right. Same props as before, plus optional
// change / kind, so existing screens keep working.
import { StyleSheet, Text, View } from "react-native";
import { C, FONT, TYPE } from "../theme";
import { money, pct } from "../lib/format";
import { hTap } from "../lib/haptics";
import { PressScale } from "./ui/PressScale";
import { AssetAvatar } from "./AssetAvatar";

type Props = {
  symbol: string;
  name: string;
  price: number;
  imageUrl: string;
  onPress?: () => void;
  /** % move today; omitted = not shown */
  change?: number | null;
  /** "Stock", "Pre-IPO" … shown after the ticker */
  kind?: string;
  /** hide the hairline under the last row */
  last?: boolean;
};

export function AssetRow({ symbol, name, price, imageUrl, onPress, change, kind, last }: Props) {
  const sub = kind ? (symbol === name ? kind : `${symbol} · ${kind}`) : symbol;
  return (
    <PressScale
      scaleTo={0.985}
      onPress={() => {
        hTap();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${money(price)}${change != null ? `, ${pct(change)} today` : ""}`}
      style={[s.row, !last && s.hair]}
    >
      <AssetAvatar symbol={symbol} imageUrl={imageUrl} />
      <View style={s.info}>
        <Text style={TYPE.ttl} numberOfLines={1}>
          {name}
        </Text>
        <Text style={TYPE.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.price}>{money(price)}</Text>
        {change != null ? (
          <Text style={[s.change, { color: change >= 0 ? C.mint : C.loss }]}>{pct(change)}</Text>
        ) : null}
      </View>
    </PressScale>
  );
}

const s = StyleSheet.create({
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  info: { flex: 1, minWidth: 0, gap: 3 },
  right: { alignItems: "flex-end", gap: 3 },
  price: { fontFamily: FONT.mono400, fontSize: 13, color: "#D6DAE0", fontVariant: ["tabular-nums"] },
  change: { fontFamily: FONT.mono400, fontSize: 11.5, fontVariant: ["tabular-nums"] },
});
