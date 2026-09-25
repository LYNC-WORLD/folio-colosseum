// The prototype's amount block (.amtBlock):
//
//   AMOUNT                                   $440.00
//                                     USDC AVAILABLE
//   ┌────────────────────────────────────────────┐
//   │ $ 100                                 USDC │   focus → mint ring
//   └────────────────────────────────────────────┘   over  → red ring + red digits
//   ≈ 0.5429 NVDA at $184.20
//
// While the field is focused, the AMOUNT label fades out and the % chips
// rise in one after another (45ms apart).

import { forwardRef, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { C, FONT, TYPE, em } from "../theme";
import { timing } from "../theme/motion";
import { hSelect } from "../lib/haptics";

export type PctOption = { label: string; value: number };

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  amount: number;
  pcts: PctOption[];
  onPick: (value: number, label: string) => void;
  availValue: string;
  availLabel: string;
  hint: string;
  bad?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
};

export const AmountField = forwardRef<TextInput, Props>(function AmountField(
  { value, onChangeText, amount, pcts, onPick, availValue, availLabel, hint, bad = false, autoFocus, onFocus },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const f = useSharedValue(0);
  const b = useSharedValue(bad ? 1 : 0);

  useEffect(() => {
    f.value = withTiming(focused ? 1 : 0, timing(220));
  }, [focused]);
  useEffect(() => {
    b.value = withTiming(bad ? 1 : 0, timing(200));
  }, [bad]);

  const field = useAnimatedStyle(() => ({
    borderColor: b.value > 0.01
      ? interpolateColor(b.value, [0, 1], [C.mint, C.loss])
      : interpolateColor(f.value, [0, 1], ["rgba(55,224,153,0)", C.mint]),
    backgroundColor: interpolateColor(f.value, [0, 1], [C.surface, C.raised]),
  }));
  const label = useAnimatedStyle(() => ({ opacity: 1 - f.value }));

  const inner = useRef<TextInput | null>(null);

  return (
    <View style={s.block}>
      <View style={s.top}>
        <View style={s.slot}>
          <Animated.View style={[s.labelWrap, label]} pointerEvents="none">
            <Text style={TYPE.lbl}>AMOUNT</Text>
          </Animated.View>
          <View style={s.pcts} pointerEvents={focused ? "auto" : "none"}>
            {pcts.map((p, i) => (
              <PctButton
                key={p.label}
                label={p.label}
                index={i}
                shown={focused}
                on={amount > 0 && Math.abs(amount - p.value) < 0.005}
                onPress={() => {
                  hSelect();
                  onPick(p.value, p.label);
                }}
              />
            ))}
          </View>
        </View>
        <View style={s.avail}>
          <Text style={s.availValue}>{availValue}</Text>
          <Text style={s.availLabel}>{availLabel}</Text>
        </View>
      </View>

      <Pressable onPress={() => inner.current?.focus()} accessible={false}>
        <Animated.View style={[s.field, field]}>
          <Text style={s.cur}>$</Text>
          <TextInput
            ref={(node) => {
              inner.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onBlur={() => setFocused(false)}
            keyboardType="decimal-pad"
            returnKeyType="done"
            placeholder="0"
            placeholderTextColor="#3A404A"
            selectionColor={C.mint}
            autoFocus={autoFocus}
            style={[s.input, bad && { color: C.loss }]}
            accessibilityLabel="Amount in US dollars"
            accessibilityHint={hint}
          />
          <Text style={s.unit}>USDC</Text>
        </Animated.View>
      </Pressable>

      <Text style={[s.hint, bad && { color: C.loss }]}>{hint}</Text>
    </View>
  );
});

function PctButton({
  label,
  index,
  shown,
  on,
  onPress,
}: {
  label: string;
  index: number;
  shown: boolean;
  on: boolean;
  onPress: () => void;
}) {
  const p = useSharedValue(0);
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = shown ? withDelay(140 + index * 45, withTiming(1, timing(220))) : withTiming(0, timing(140));
  }, [shown]);
  useEffect(() => {
    o.value = withTiming(on ? 1 : 0, timing(150));
  }, [on]);

  const a = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 8 }, { scale: 0.94 + 0.06 * p.value }],
    backgroundColor: interpolateColor(o.value, [0, 1], [C.surface, C.mint]),
  }));
  const t = useAnimatedStyle(() => ({ color: interpolateColor(o.value, [0, 1], [C.ink2, C.onMint]) }));

  return (
    <Pressable onPress={onPress} hitSlop={{ top: 5, bottom: 5, left: 2, right: 2 }} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[s.pct, a]}>
        <Animated.Text style={[s.pctText, t]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  block: { gap: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, height: 36 },
  slot: { flex: 1, height: 36, justifyContent: "center" },
  labelWrap: { position: "absolute", left: 0 },
  pcts: { flexDirection: "row", alignItems: "center", gap: 6 },
  pct: { height: 34, paddingHorizontal: 12, borderRadius: 999, justifyContent: "center" },
  pctText: { fontFamily: FONT.mono400, fontSize: 12, fontVariant: ["tabular-nums"] },
  avail: { alignItems: "flex-end", gap: 2 },
  availValue: { fontFamily: FONT.mono400, fontSize: 13.5, color: "#E4E8EE", fontVariant: ["tabular-nums"] },
  availLabel: { fontFamily: FONT.mono400, fontSize: 8.5, letterSpacing: em(8.5, 0.16), color: C.ink4 },
  field: {
    height: 70,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cur: { fontFamily: FONT.sans800, fontSize: 34, letterSpacing: em(34, -0.04), color: C.ink4 },
  input: {
    flex: 1,
    height: "100%",
    padding: 0,
    fontFamily: FONT.sans800,
    fontSize: 34,
    letterSpacing: em(34, -0.04),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  unit: { fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.16), color: C.ink4 },
  hint: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
});
