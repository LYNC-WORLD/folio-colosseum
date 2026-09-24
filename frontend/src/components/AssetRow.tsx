import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { C, RADIUS, FONT } from "../theme";

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

export function AssetRow({ symbol, name, price, imageUrl, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      onPress={onPress}
    >
      <View style={s.iconWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.icon} />
        ) : (
          <Text style={s.iconFallback}>{symbol.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={s.symbol}>{symbol}</Text>
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
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  icon: { width: "100%", height: "100%" },
  iconFallback: { fontFamily: FONT.mono400, fontSize: 13, color: C.bone },
  info: { flex: 1, minWidth: 0 },
  name: { fontFamily: FONT.display600, fontSize: 15, color: C.bone },
  symbol: {
    marginTop: 3,
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkMuted,
  },
  right: { alignItems: "flex-end" },
  price: { fontFamily: FONT.mono400, fontSize: 15, color: C.bone },
});
