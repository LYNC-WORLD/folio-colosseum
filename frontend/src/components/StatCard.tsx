import { StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

type Props = { label: string; value: string; valueColor?: string };

export function StatCard({ label, value, valueColor }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.ring,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 6,
  },
  label: { color: C.muted, fontSize: 12, fontWeight: "600" },
  value: { color: C.ink, fontSize: 18, fontWeight: "700" },
});
