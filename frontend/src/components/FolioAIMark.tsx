// src/components/FolioAIMark.tsx — the Folio AI companion (prototype faiSVG).
//
//   a mint "mochi" blob with two eyes, a mouth and pink cheeks
//   • always: blinks every ~5s                       (@keyframes faiBlink)
//   • "float": slow bob + squash, 2.6s               (.fai.float → mochi)
//   • "think": fast bob, 0.9s, eyes scan left/right  (.fai.think → mochi + faiScan)
//   Reduced motion → holds still.

import { useEffect } from "react";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse, Path } from "react-native-svg";

const AEllipse = Animated.createAnimatedComponent(Ellipse);

export type FolioAIMode = "still" | "float" | "think";

export function FolioAIMark({
  size = 26,
  mode = "still",
}: {
  size?: number;
  mode?: FolioAIMode;
}) {
  const reduced = useReducedMotion();
  const bob = useSharedValue(0); // 0 → 1, looping
  const blink = useSharedValue(1); // eye height, 1 = open
  const scan = useSharedValue(0); // −1 … 1, eyes left/right

  useEffect(() => {
    cancelAnimation(bob);
    cancelAnimation(scan);
    bob.value = 0;
    scan.value = 0;
    if (reduced || mode === "still") return;

    const dur = mode === "think" ? 900 : 2600;
    bob.value = withRepeat(
      withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      -1,
      false,
    );
    if (mode === "think") {
      scan.value = -1;
      const ease = Easing.inOut(Easing.ease);
      scan.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 450, easing: ease }),
          withTiming(-1, { duration: 450, easing: ease }),
        ),
        -1,
        false,
      );
    }
  }, [mode, reduced]);

  useEffect(() => {
    if (reduced) return;
    blink.value = withRepeat(
      withSequence(
        withDelay(4650, withTiming(0.12, { duration: 150 })),
        withTiming(1, { duration: 200 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(blink);
  }, [reduced]);

  // the viewBox is 50 units wide, so 1 unit = size / 50 points
  const unit = size / 50;
  const body = useAnimatedStyle(() => {
    const p = bob.value;
    const k = [0, 0.45, 0.9, 1];
    return {
      transform: [
        { translateY: interpolate(p, k, [0, -3, 0, 0]) * unit },
        { scaleX: interpolate(p, k, [1, 0.97, 1.04, 1]) },
        { scaleY: interpolate(p, k, [1, 1.03, 0.96, 1]) },
      ],
    };
  });
  const eyeL = useAnimatedProps(() => ({
    cx: 26 + 2 * scan.value,
    ry: 2.2 * blink.value,
  }));
  const eyeR = useAnimatedProps(() => ({
    cx: 38 + 2 * scan.value,
    ry: 2.2 * blink.value,
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size, transformOrigin: "50% 100%" }, body]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="7 14 50 44">
        <Path
          d="M10 45c0-15 9-26 22-26s22 11 22 26c0 6-7 9-22 9s-22-3-22-9z"
          fill="#37E099"
        />
        <Path
          d="M17 33c2-5 6-8 11-9"
          stroke="#fff"
          strokeOpacity={0.55}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M14 47c5 3 31 3 36 0"
          stroke="#1FCF92"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />
        <AEllipse animatedProps={eyeL} cy={39} rx={2.2} fill="#0A0B0E" />
        <AEllipse animatedProps={eyeR} cy={39} rx={2.2} fill="#0A0B0E" />
        <Ellipse
          cx={21.3}
          cy={43}
          rx={2.5}
          ry={1.4}
          fill="#F07F9B"
          opacity={0.75}
        />
        <Ellipse
          cx={42.7}
          cy={43}
          rx={2.5}
          ry={1.4}
          fill="#F07F9B"
          opacity={0.75}
        />
        <Path
          d="M30 43q2 1.8 4 0"
          stroke="#0A0B0E"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}
