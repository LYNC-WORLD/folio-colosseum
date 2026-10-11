// Overlapping member avatars (prototype: 24–26px circles, 2px ring, −8px overlap).
import { Text, View } from "react-native";
import { C, FONT } from "../../theme";
import type { Member } from "../../data/groupsStore";

export function Avatars({ members, size = 24, ring = C.surface, max = 6 }: { members: Member[]; size?: number; ring?: string; max?: number }) {
  return (
    <View style={{ flexDirection: "row" }} accessibilityElementsHidden>
      {members.slice(0, max).map((m, i) => (
        <View
          key={m.name + i}
          style={{
            width: size + 4,
            height: size + 4,
            borderRadius: 999,
            backgroundColor: ring,
            marginLeft: i ? -10 : -2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: m.color, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: FONT.sans800, fontSize: size * 0.4, color: C.onMint }}>{m.name[0]}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
