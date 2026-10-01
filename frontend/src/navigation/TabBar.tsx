// src/navigation/TabBar.tsx — the prototype's tab bar (.tabs / .tab).
//
// • five tabs, translucent dark with blur, hairline on top
// • active tab: mint, icon lifts 2pt and grows 8% (300ms)
// • slides away (110%) when you push into a detail screen, back when you return
// • floats over content — scroll views on tab screens should add
//   paddingBottom: useTabBarSpace() so their last row isn't hidden

import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { C, FONT } from "../theme";
import { timing } from "../theme/motion";
import { hSelect } from "../lib/haptics";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** height of the bar above the home indicator */
export const TAB_BAR_HEIGHT = 66;

/** bottom padding a tab screen needs so content clears the floating bar */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + 30;
}

// Prototype ICONS (22×22 grid, stroke 1.7). Circles written as arcs.
const ICON_PATHS: Record<string, string[]> = {
  home: ["M3 9.6 11 3.2l8 6.4V19a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1z"],
  groups: [
    "M5.5 8a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M3 18c0-3 2.5-4.6 5.5-4.6S14 15 14 18",
    "M15 6.2a3 3 0 0 1 0 5.6M16.5 13.6c1.7.6 2.9 2 2.9 4.4",
  ],
  folio: [
    "M11 3.2a7.8 7.8 0 1 0 7.8 7.8H11z",
    "M13.8 3.7a7.8 7.8 0 0 1 4.5 4.5h-4.5z",
  ],
  leaders: [
    "M6.5 3.5h9v4.7a4.5 4.5 0 0 1-9 0z",
    "M6.5 5H4a2.4 2.4 0 0 0 2.5 2.4M15.5 5H18a2.4 2.4 0 0 1-2.5 2.4M11 12.7V16M8 19h6",
  ],
  trade: [
    "M6.5 3v3M6.5 15v4M15.5 3.5v2.5M15.5 13v3.5",
    "M5.4 6h2.2a1.2 1.2 0 0 1 1.2 1.2v6.6a1.2 1.2 0 0 1-1.2 1.2H5.4a1.2 1.2 0 0 1-1.2-1.2V7.2A1.2 1.2 0 0 1 5.4 6z",
    "M14.4 6h2.2a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-1.2 1.2h-2.2a1.2 1.2 0 0 1-1.2-1.2V7.2A1.2 1.2 0 0 1 14.4 6z",
  ],
  // Folio AI: the mochi blob outline. The two eyes are tiny stroked segments —
  // with round caps at stroke 1.7 they draw as dots (prototype: circles r .9).
  analyst: [
    "M3 15.5C3 10.3 6.4 6.5 11 6.5s8 3.8 8 9c0 2.2-2.6 3.2-8 3.2s-8-1-8-3.2z",
    "M8.85 13.4h.1",
    "M13.05 13.4h.1",
  ],
};

/** route name → icon + label, in bar order. Routes not listed (Profile) get no button. */
export const TABS: {
  route: string;
  icon: keyof typeof ICON_PATHS;
  label: string;
}[] = [
  { route: "Home", icon: "home", label: "Home" },
  { route: "Trade", icon: "trade", label: "Trade" },
  { route: "Portfolio", icon: "folio", label: "Folio" },
  { route: "Leaders", icon: "groups", label: "Social" },
  { route: "Signals", icon: "analyst", label: "Folio AI" },
];
/** routes without a button highlight another tab (Account lives under Folio) */
const HIGHLIGHT_AS: Record<string, string> = {
  Profile: "Portfolio",
  Groups: "Leaders",
};
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focused = state.routes[state.index];
  const nestedIndex =
    (focused.state as { index?: number } | undefined)?.index ?? 0;
  const hidden = nestedIndex > 0;
  const activeRoute = HIGHLIGHT_AS[focused.name] ?? focused.name;

  const hide = useSharedValue(hidden ? 1 : 0);
  useEffect(() => {
    hide.value = withTiming(hidden ? 1 : 0, timing(340));
  }, [hidden]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: hide.value * (TAB_BAR_HEIGHT + insets.bottom) * 1.1 },
    ],
  }));

  return (
    <Animated.View
      style={[s.bar, { paddingBottom: insets.bottom }, barStyle]}
      pointerEvents={hidden ? "none" : "auto"}
      accessibilityRole="tablist"
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, s.tint]} />

      <View style={s.row}>
        {TABS.map((t) => {
          const route = state.routes.find((r) => r.name === t.route);
          if (!route) return null;
          const isActive = activeRoute === t.route;
          return (
            <TabButton
              key={t.route}
              icon={t.icon}
              label={t.label}
              active={isActive}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  if (focused.key !== route.key) hSelect();
                  // re-pressing the focused tab lets the stack pop to its root
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
  onLongPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(active ? 1 : 0, timing(300));
  }, [active]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -2 * p.value }, { scale: 1 + 0.08 * p.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [C.ink4, C.mint]),
  }));

  return (
    <Pressable
      style={s.tab}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={iconStyle}>
        <Svg width={21} height={21} viewBox="0 0 22 22" fill="none">
          {ICON_PATHS[icon].map((d, i) => (
            <TabPath key={i} d={d} p={p} />
          ))}
        </Svg>
      </Animated.View>
      <Animated.Text style={[s.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function TabPath({ d, p }: { d: string; p: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({
    stroke: interpolateColor(p.value, [0, 1], [C.ink4, C.mint]),
  }));
  return (
    <AnimatedPath
      d={d}
      animatedProps={props}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

const s = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: C.hair,
    overflow: "hidden",
  },
  tint: {
    backgroundColor: Platform.OS === "ios" ? C.tabBg : "rgba(10,11,14,0.97)",
  },
  row: { flexDirection: "row", height: TAB_BAR_HEIGHT },
  tab: { flex: 1, alignItems: "center", paddingTop: 12, gap: 5 },
  label: { fontFamily: FONT.sans600, fontSize: 10 },
});
