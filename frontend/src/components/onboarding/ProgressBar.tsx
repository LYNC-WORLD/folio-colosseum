import { StyleSheet, Text, View } from "react-native";
import { C, FONT } from "../../theme";

export function ProgressBar({
  step,
  total = 4,
}: {
  step: number;
  total?: number;
}) {
  return (
    <View style={s.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.segment,
            { backgroundColor: i < step ? C.bone : C.hairline },
          ]}
        />
      ))}
      <Text style={s.label}>
        {step}/{total}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  segment: { flexGrow: 1, height: 3, borderRadius: 2 },
  label: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: C.inkMuted,
  },
});
