// src/components/perps/DockBalance.tsx — "PERP ACCOUNT $200.00 ......... [⇄ Transfer]" above Long / Short
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, FONT } from "../../theme";
import { hTap } from "../../lib/haptics";
import { fmtPx } from "../../data/perpsStore";

export function DockBalance({
  perp,
  onTransfer,
}: {
  perp: number;
  onTransfer: () => void;
}) {
  return (
    <View style={s.row}>
      <Text style={s.k}>PERP ACCOUNT</Text>
      <Text style={s.v}>{fmtPx(perp)}</Text>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => {
          hTap();
          onTransfer();
        }}
        hitSlop={{ top: 8, bottom: 8 }}
        style={s.link}
        accessibilityRole="button"
        accessibilityLabel="Transfer between spot and perp account"
      >
        <Svg
          width={14}
          height={14}
          viewBox="0 0 20 20"
          fill="none"
          stroke={C.mint}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M4 7h11l-3-3M16 13H5l3 3" />
        </Svg>
        <Text style={s.linkT}>Transfer</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 30 },
  k: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.3,
    color: C.ink4,
  },
  v: {
    fontFamily: FONT.mono400,
    fontSize: 12.5,
    color: "#E4E8EE",
    fontVariant: ["tabular-nums"],
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "#2A303A",
  },
  linkT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.mint },
});
