import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme/colors";

type Props = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap?: string;
  color: string;
  onPress?: () => void;
};

function formatPrice(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export default function AssetRow({
  symbol,
  name,
  price,
  changePct,
  marketCap,
  color,
  onPress,
}: Props) {
  const positive = changePct >= 0;
  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      onPress={onPress}
    >
      <View
        style={[
          s.icon,
          { backgroundColor: color + "22", borderColor: color + "55" },
        ]}
      >
        <Text style={[s.iconText, { color }]}>{symbol.charAt(0)}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.symbol}>{symbol}</Text>
        <Text style={s.name} numberOfLines={1}>
          {name}
          {marketCap ? ` · ${marketCap} MC` : ""}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.price}>{formatPrice(price)}</Text>
        <Text style={[s.change, { color: positive ? C.success : C.error }]}>
          {positive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  pressed: { opacity: 0.6 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconText: { fontSize: 16, fontWeight: "700" },
  info: { flex: 1, gap: 2 },
  symbol: { color: C.ink, fontSize: 15, fontWeight: "700" },
  name: { color: C.muted, fontSize: 12 },
  right: { alignItems: "flex-end", gap: 2 },
  price: { color: C.ink, fontSize: 15, fontWeight: "600" },
  change: { fontSize: 12, fontWeight: "600" },
});
