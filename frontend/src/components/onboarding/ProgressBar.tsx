// Onboarding progress: four thin mint segments (prototype .prog).
// The segment for the current question fills in as the screen arrives.
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { C } from "../../theme";
import { timing } from "../../theme/motion";

export function ProgressBar({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <View
      style={s.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Question ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Segment key={i} state={i + 1 < step ? "done" : i + 1 === step ? "current" : "todo"} />
      ))}
    </View>
  );
}

function Segment({ state }: { state: "done" | "current" | "todo" }) {
  const width = useSharedValue(0);
  const p = useSharedValue(state === "done" ? 1 : 0);

  useEffect(() => {
    // wait for the push slide to mostly land, then fill (prototype: .4s)
    if (state === "current") p.value = withDelay(180, withTiming(1, timing(400)));
    else p.value = state === "done" ? 1 : 0;
  }, [state]);

  const fill = useAnimatedStyle(() => ({ width: width.value * p.value }));

  return (
    <View style={s.seg} onLayout={(e) => (width.value = e.nativeEvent.layout.width)}>
      <Animated.View style={[s.fill, fill]} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", gap: 6 },
  seg: { flex: 1, height: 3, borderRadius: 999, backgroundColor: C.hair, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: C.mint },
});
