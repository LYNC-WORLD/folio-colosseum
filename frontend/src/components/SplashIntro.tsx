// src/components/SplashIntro.tsx
//
// The animated splash that plays every time the app opens (prototype: #s-splash).
//
//   0ms     native splash (plain dark ground) is hidden; this takes over, same colour
//   0–900   mint glow fades in; mark scales .72 → 1 and rises 18pt   (markIn)
//   180–1280 "Folio" tracks in: letter-spacing .42em → -.05em       (trackIn)
//   700–1300 "NON-CUSTODIAL · SETTLES ON-CHAIN" rises in           (rise)
//   1900    if auth is ready → 280ms crossfade to the app underneath
//           if not → a small sliding progress bar appears until it is
//
// The app mounts underneath while this plays, so the first screen is ready
// and fully drawn by the time the splash fades away.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { C } from "../theme/colors";
import { FONT, em } from "../theme/fonts";
import { timing } from "../theme/motion";
import { Mark } from "./ui/Mark";

const MIN_MS = 1900; // same as the prototype's boot timer
const FADE_MS = 280; // prototype 'fade' screen change: opacity .28s linear

const WORD_SIZE = 44;
const TRACK_FROM = em(WORD_SIZE, 0.42);
const TRACK_TO = em(WORD_SIZE, -0.05);

const BAR_TRACK = 120;
const BAR = BAR_TRACK * 0.4;

/** true once the splash has gone — screens can wait for it before playing their own entrance. */
export const SplashDoneContext = createContext(true);
export const useSplashDone = () => useContext(SplashDoneContext);

type Props = {
  /** auth + onboarding state resolved, first screen can be shown */
  ready: boolean;
  /** called after the fade-out finishes; unmount the splash then */
  onDone: () => void;
};

export function SplashIntro({ ready, onDone }: Props) {
  const [started, setStarted] = useState(false);
  const [minDone, setMinDone] = useState(false);
  const leaving = useRef(false);

  const glow = useSharedValue(0);
  const mark = useSharedValue(0);
  const word = useSharedValue(0);
  const sub = useSharedValue(0);
  const wait = useSharedValue(0); // progress bar visibility
  const slide = useSharedValue(0); // progress bar position
  const out = useSharedValue(1);

  // Hide the native splash only once this view has been laid out, so there is
  // never a frame without a splash. Then start the intro.
  const onLayout = () => {
    if (started) return;
    SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => setStarted(true));
  };

  useEffect(() => {
    if (!started) return;
    glow.value = withTiming(1, timing(900));
    mark.value = withTiming(1, timing(900));
    word.value = withDelay(180, withTiming(1, timing(1100)));
    sub.value = withDelay(700, withTiming(1, timing(600)));
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(t);
  }, [started]);

  useEffect(() => {
    if (!minDone || leaving.current) return;
    if (ready) {
      leaving.current = true;
      out.value = withTiming(0, { duration: FADE_MS, easing: Easing.linear });
      const t = setTimeout(onDone, FADE_MS + 20);
      return () => clearTimeout(t);
    }
    // Still waiting on auth (slow network) → show the prototype's processing bar.
    wait.value = withTiming(1, timing(300));
    slide.value = withRepeat(
      withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [minDone, ready]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: out.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [
      { translateY: (1 - mark.value) * 18 },
      { scale: 0.72 + 0.28 * mark.value },
    ],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    letterSpacing: interpolate(word.value, [0, 1], [TRACK_FROM, TRACK_TO]),
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: sub.value,
    transform: [{ translateY: (1 - sub.value) * 14 }],
  }));
  const waitStyle = useAnimatedStyle(() => ({ opacity: wait.value }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(slide.value, [0, 1], [-1.1 * BAR, 3.2 * BAR]) },
    ],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.root, rootStyle]}
      onLayout={onLayout}
      pointerEvents={minDone && ready ? "none" : "auto"}
      accessible
      accessibilityLabel="Folio. Loading."
    >
      {/* radial-gradient(55% 38% at 50% 44%, rgba(55,224,153,.18) 0%, transparent 70%) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, glowStyle]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient
              id="splashGlow"
              cx="50%"
              cy="44%"
              rx="55%"
              ry="38%"
              fx="50%"
              fy="44%"
            >
              <Stop offset="0" stopColor={C.mint} stopOpacity={0.18} />
              <Stop offset="0.7" stopColor={C.mint} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#splashGlow)"
          />
        </Svg>
      </Animated.View>

      <View style={s.col}>
        <Animated.View style={markStyle}>
          <Mark height={100} />
        </Animated.View>

        <Animated.Text style={[s.word, wordStyle]} numberOfLines={1}>
          Folio
        </Animated.Text>

        <Animated.Text style={[s.sub, subStyle]}>
          NON-CUSTODIAL · SETTLES ON-CHAIN
        </Animated.Text>
      </View>

      <Animated.View style={[s.waitWrap, waitStyle]} pointerEvents="none">
        <View style={s.track}>
          <Animated.View style={[s.bar, barStyle]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: C.ground, zIndex: 100, elevation: 100 },
  col: { flex: 1, alignItems: "center", justifyContent: "center", gap: 26 },
  word: {
    fontFamily: FONT.sans800,
    fontSize: WORD_SIZE,
    color: C.ink1,
    includeFontPadding: false,
  },
  sub: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.2),
    color: C.ink4,
  },
  waitWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "18%",
    alignItems: "center",
  },
  track: {
    width: BAR_TRACK,
    height: 4,
    borderRadius: 999,
    backgroundColor: C.track,
    overflow: "hidden",
  },
  bar: {
    width: BAR,
    height: "100%",
    borderRadius: 999,
    backgroundColor: C.mint,
  },
});
