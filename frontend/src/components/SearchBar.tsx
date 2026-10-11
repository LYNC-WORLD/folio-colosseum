// Home search (prototype .srow / .sbox):
// focus → mint ring, lifted surface, mint icon, "Cancel" slides in;
// typing → a round clear button pops in.
import { forwardRef, useEffect } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { C, FONT } from "../theme";
import { timing } from "../theme/motion";
import { Pop } from "./ui/Enter";

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  active: boolean;
  onFocus: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onClear: () => void;
};

const CANCEL_W = 72;

export const SearchBar = forwardRef<TextInput, Props>(function SearchBar(
  { value, onChangeText, active, onFocus, onCancel, onSubmit, onClear },
  ref,
) {
  const a = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    a.value = withTiming(active ? 1 : 0, timing(active ? 320 : 260));
  }, [active]);

  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(a.value, [0, 1], ["rgba(55,224,153,0)", C.mint]),
    backgroundColor: interpolateColor(a.value, [0, 1], [C.surface, C.raised]),
  }));
  const cancel = useAnimatedStyle(() => ({ width: a.value * CANCEL_W, opacity: a.value }));

  return (
    <View style={s.row}>
      <Animated.View style={[s.box, box]}>
        <View style={s.icon} pointerEvents="none">
          <Svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke={active ? C.mint : C.ink4} strokeWidth={1.8} strokeLinecap="round">
            <Circle cx="8.8" cy="8.8" r="5.4" />
            <Path d="m12.8 12.8 3.7 3.7" />
          </Svg>
        </View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onSubmitEditing={onSubmit}
          placeholder="Search stocks, pre-IPOs, gold…"
          placeholderTextColor={C.ink4}
          selectionColor={C.mint}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={s.input}
          accessibilityLabel="Search assets"
        />
        {value ? (
          <Pop style={s.clearWrap}>
            <Pressable onPress={onClear} style={s.clear} hitSlop={6} accessibilityRole="button" accessibilityLabel="Clear search">
              <Svg width={13} height={13} viewBox="0 0 14 14" fill="none" stroke={C.ink2} strokeWidth={2} strokeLinecap="round">
                <Path d="M2 2 12 12M12 2 2 12" />
              </Svg>
            </Pressable>
          </Pop>
        ) : null}
      </Animated.View>

      <Animated.View style={[s.cancelWrap, cancel]}>
        <Pressable onPress={onCancel} style={s.cancel} accessibilityRole="button" accessibilityLabel="Cancel search" disabled={!active}>
          <Animated.Text style={s.cancelText} numberOfLines={1}>
            Cancel
          </Animated.Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  box: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, justifyContent: "center" },
  icon: { position: "absolute", left: 14 },
  input: {
    height: "100%",
    paddingLeft: 43,
    paddingRight: 44,
    fontFamily: FONT.sans400,
    fontSize: 16,
    color: C.ink1,
  },
  clearWrap: { position: "absolute", right: 7 },
  clear: { width: 32, height: 32, borderRadius: 999, backgroundColor: C.track, alignItems: "center", justifyContent: "center" },
  cancelWrap: { overflow: "hidden", alignItems: "flex-end" },
  cancel: { height: 48, justifyContent: "center", paddingLeft: 12 },
  cancelText: { fontFamily: FONT.sans600, fontSize: 14.5, color: C.mint },
});
