import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme/colors";

type Props = {
  symbol: string;
  name: string;
  price: number;
  imageUrl: string;
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
  imageUrl,
  onPress,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      onPress={onPress}
    >
      <Image source={{ uri: imageUrl }} style={s.icon} />
      <View style={s.info}>
        <Text style={s.symbol}>{symbol}</Text>
        <Text style={s.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.price}>{formatPrice(price)}</Text>
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
    backgroundColor: C.card,
  },
  info: { flex: 1, gap: 2 },
  symbol: { color: C.ink, fontSize: 15, fontWeight: "700" },
  name: { color: C.muted, fontSize: 12 },
  right: { alignItems: "flex-end", gap: 2 },
  price: { color: C.ink, fontSize: 15, fontWeight: "600" },
});
