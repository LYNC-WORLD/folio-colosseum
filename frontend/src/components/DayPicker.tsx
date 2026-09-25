// Horizontal row of day-of-month chips (1–30), selected one in mint.
import { useRef } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { C, FONT } from "../theme";
import { hSelect } from "../lib/haptics";
import { PressScale } from "./ui/PressScale";

const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export function DayPicker({ day, onPick }: { day: number; onPick: (d: number) => void }) {
  const ref = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      onLayout={() => ref.current?.scrollTo({ x: Math.max(0, (day - 3) * 50), animated: false })}
      accessibilityRole="radiogroup"
    >
      {DAYS.map((d) => (
        <PressScale
          key={d}
          scaleTo={0.92}
          onPress={() => {
            hSelect();
            onPick(d);
          }}
          style={[s.day, d === day && s.on]}
          accessibilityRole="radio"
          accessibilityState={{ checked: d === day }}
          accessibilityLabel={`Day ${d}`}
        >
          <Text style={[s.text, d === day && { color: C.onMint }]}>{d}</Text>
        </PressScale>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  day: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  on: { backgroundColor: C.mint },
  text: { fontFamily: FONT.mono400, fontSize: 14, color: C.ink2 },
});
