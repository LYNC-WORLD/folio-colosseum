// src/components/perps/PerpUi.tsx — small primitives shared by the Trade screen and its sheets
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { C, FONT } from "../theme";
import { hTap } from "../lib/haptics";
import { MAXLEV } from "../data/perpsStore";

export const AMBER = "#E8A33D";
export const ON_MINT = "#06120D";
export const ON_SHORT = "#1C0805";
export const CARD = "#20252E";

// ---------- bottom sheet ----------
export function Sheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={s.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.wrap}
        pointerEvents="box-none"
      >
        <Animated.View
          entering={SlideInDown.duration(280)}
          style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={s.grab} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, paddingBottom: 4 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- text bits ----------
export const Lbl = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) => <Text style={[s.lbl, style]}>{children}</Text>;
export const H2 = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) => <Text style={[s.h2, style]}>{children}</Text>;
export const Body = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) => <Text style={[s.body, style]}>{children}</Text>;

export function Tag({
  label,
  tone = "mint",
}: {
  label: string;
  tone?: "mint" | "long" | "short" | "amber";
}) {
  const col = tone === "short" ? C.loss : tone === "amber" ? AMBER : C.mint;
  const bg =
    tone === "long"
      ? "rgba(55,224,153,.12)"
      : tone === "short"
        ? "rgba(240,96,77,.12)"
        : "transparent";
  const solid = tone === "long" || tone === "short";
  return (
    <View
      style={[
        s.tag,
        {
          borderColor: solid ? "transparent" : col + "66",
          backgroundColor: bg,
        },
      ]}
    >
      <Text style={[s.tagT, { color: col }]}>{label}</Text>
    </View>
  );
}

export function Kv({
  k,
  v,
  tone,
  last,
}: {
  k: string;
  v: ReactNode;
  tone?: "up" | "down";
  last?: boolean;
}) {
  return (
    <View
      style={[
        s.kv,
        !last && { borderBottomWidth: 1, borderBottomColor: "#262C36" },
      ]}
    >
      <Text style={s.kvK}>{k}</Text>
      {typeof v === "string" ? (
        <Text
          style={[
            s.kvV,
            tone === "up" && { color: C.mint },
            tone === "down" && { color: C.loss },
          ]}
        >
          {v}
        </Text>
      ) : (
        v
      )}
    </View>
  );
}
export const KvCard = ({ children }: { children: ReactNode }) => (
  <View style={s.kvCard}>{children}</View>
);

export function Check({
  size = 62,
  color = C.mint,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 66 66"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="33" cy="33" r="27" />
      <Path d="M21 34.5 29.5 43 46 25" />
    </Svg>
  );
}

// ---------- buttons ----------
type BtnKind = "primary" | "long" | "short" | "quiet" | "ghost" | "sell";
export function Btn({
  kind = "primary",
  label,
  onPress,
  disabled,
  small,
  style,
  children,
}: {
  kind?: BtnKind;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const bg =
    kind === "long" || kind === "primary"
      ? C.mint
      : kind === "short"
        ? C.loss
        : kind === "sell"
          ? "rgba(240,96,77,.16)"
          : kind === "quiet"
            ? CARD
            : "transparent";
  const fg =
    kind === "long" || kind === "primary"
      ? ON_MINT
      : kind === "short"
        ? ON_SHORT
        : kind === "sell"
          ? C.loss
          : C.ink2;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        hTap();
        onPress?.();
      }}
      style={({ pressed }) => [
        s.btn,
        small && { height: 44 },
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
      accessibilityRole="button"
    >
      {children ?? (
        <Text style={[s.btnT, { color: fg }, small && { fontSize: 13.5 }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** hold-to-confirm (used from 25x up); a normal tap button below that */
export function HoldButton({
  kind,
  label,
  hold,
  disabled,
  onConfirm,
  onBlocked,
}: {
  kind: "long" | "short";
  label: string;
  hold: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onBlocked?: () => void;
}) {
  const p = useSharedValue(0);
  const [w, setW] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fill = useAnimatedStyle(() => ({ width: p.value * w }));
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const bg = kind === "long" ? C.mint : C.loss,
    fg = kind === "long" ? ON_MINT : ON_SHORT;
  return (
    <Pressable
      disabled={disabled}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onPressIn={() => {
        if (!hold) return;
        p.value = withTiming(1, { duration: 900, easing: Easing.linear });
        timer.current = setTimeout(() => {
          timer.current = null;
          p.value = 0;
          onConfirm();
        }, 900);
      }}
      onPressOut={() => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
          p.value = withTiming(0, { duration: 120 });
          onBlocked?.();
        }
      }}
      onPress={() => {
        if (!hold) {
          hTap();
          onConfirm();
        }
      }}
      style={[
        s.btn,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.4 : 1,
          overflow: "hidden",
        },
      ]}
      accessibilityRole="button"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(255,255,255,.28)" },
          fill,
        ]}
      />
      <Text style={[s.btnT, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- segmented (Long | Short) ----------
export function LongShortSeg({
  side,
  onChange,
}: {
  side: 1 | -1;
  onChange: (s: 1 | -1) => void;
}) {
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {(
        [
          [1, "Long · goes up"],
          [-1, "Short · goes down"],
        ] as const
      ).map(([v, t]) => {
        const on = side === v;
        return (
          <Pressable
            key={v}
            onPress={() => {
              hTap();
              onChange(v);
            }}
            style={[s.segB, on && { backgroundColor: v > 0 ? C.mint : C.loss }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text style={[s.segT, on && { color: v > 0 ? ON_MINT : ON_SHORT }]}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- leverage slider ----------
export const levTone = (l: number) =>
  l <= 10 ? C.mint : l <= 25 ? AMBER : C.loss;
export function LeverageSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [w, setW] = useState(0);
  const start = useRef(value),
    cur = useRef(value),
    width = useRef(0);
  cur.current = value;
  width.current = w;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        if (width.current > 0) {
          // jump to where you touched
          const v = Math.round(
            1 +
              (Math.max(0, Math.min(width.current, e.nativeEvent.locationX)) /
                width.current) *
                (MAXLEV - 1),
          );
          start.current = v;
          if (v !== cur.current) onChange(v);
        } else start.current = cur.current;
      },
      onPanResponderMove: (_, g) => {
        if (!width.current) return;
        const v = Math.round(
          Math.max(
            1,
            Math.min(
              MAXLEV,
              start.current + (g.dx / width.current) * (MAXLEV - 1),
            ),
          ),
        );
        if (v !== cur.current) onChange(v);
      },
    }),
  ).current;
  const pct = (value - 1) / (MAXLEV - 1),
    col = levTone(value),
    TH = 26;
  return (
    <View style={{ gap: 2 }}>
      <View
        style={{ height: 36, justifyContent: "center" }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Leverage"
        accessibilityValue={{ min: 1, max: MAXLEV, now: value }}
      >
        <View
          pointerEvents="none"
          style={{ height: 6, borderRadius: 999, backgroundColor: "#2A303A" }}
        >
          <View
            style={{
              width: `${pct * 100}%`,
              height: 6,
              borderRadius: 999,
              backgroundColor: col,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: pct * Math.max(0, w - TH),
            width: TH,
            height: TH,
            borderRadius: 999,
            backgroundColor: "#fff",
            borderWidth: 5,
            borderColor: col + "40",
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: -2,
        }}
      >
        {[1, 5, 10, 25, 50].map((v) => (
          <Pressable
            key={v}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              hTap();
              onChange(v);
            }}
            style={[s.mark, v === value && { backgroundColor: "#262C36" }]}
          >
            <Text style={[s.markT, v === value && { color: C.ink1 }]}>
              {v}x
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,.6)",
  },
  wrap: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    backgroundColor: C.raised,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#262C36",
  },
  grab: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#3A404A",
    marginBottom: 16,
  },
  lbl: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: 1.8,
    color: C.ink3,
  },
  h2: {
    fontFamily: FONT.sans800,
    fontSize: 24,
    letterSpacing: -0.7,
    color: C.ink1,
  },
  body: {
    fontFamily: FONT.sans600,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.ink2,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagT: { fontFamily: FONT.mono400, fontSize: 8.5, letterSpacing: 1.1 },
  kvCard: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: CARD,
  },
  kv: { flexDirection: "row", alignItems: "center", minHeight: 38, gap: 12 },
  kvK: {
    flex: 1,
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: C.ink4,
  },
  kvV: {
    fontFamily: FONT.mono400,
    fontSize: 12.5,
    color: "#D6DAE0",
    fontVariant: ["tabular-nums"],
  },
  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 6,
  },
  btnT: { fontFamily: FONT.sans800, fontSize: 15.5, letterSpacing: -0.2 },
  seg: {
    flexDirection: "row",
    height: 46,
    padding: 4,
    borderRadius: 14,
    backgroundColor: CARD,
  },
  segB: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  segT: { fontFamily: FONT.sans800, fontSize: 13.5, color: C.ink3 },
  mark: {
    height: 28,
    minWidth: 36,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  markT: { fontFamily: FONT.mono400, fontSize: 11, color: C.ink4 },
});
