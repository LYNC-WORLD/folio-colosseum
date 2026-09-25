// Success check that draws itself: circle (500ms), then the tick (340ms).
// Prototype .tick. Fires a success haptic as it lands.
import { useEffect } from "react";
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { C } from "../../theme/colors";
import { timing } from "../../theme/motion";
import { hSuccess } from "../../lib/haptics";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const CIRCLE = 2 * Math.PI * 27; // ≈ 170
const TICK = 40;

export function SuccessTick({ size = 66 }: { size?: number }) {
  const c = useSharedValue(CIRCLE);
  const t = useSharedValue(TICK);

  useEffect(() => {
    c.value = withTiming(0, timing(500));
    t.value = withDelay(340, withTiming(0, timing(340)));
    const h = setTimeout(hSuccess, 520);
    return () => clearTimeout(h);
  }, []);

  const circleProps = useAnimatedProps(() => ({ strokeDashoffset: c.value }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: t.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 66 66" fill="none" accessibilityLabel="Done">
      <AnimatedCircle
        cx={33}
        cy={33}
        r={27}
        stroke={C.mint}
        strokeWidth={3}
        strokeDasharray={[CIRCLE, CIRCLE]}
        animatedProps={circleProps}
        strokeLinecap="round"
        rotation={-90}
        origin="33, 33"
      />
      <AnimatedPath
        d="M21 34.5 29.5 43 46 25"
        stroke={C.mint}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[TICK, TICK]}
        animatedProps={tickProps}
      />
    </Svg>
  );
}
