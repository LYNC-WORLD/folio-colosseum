// Line icons from the prototype, drawn with react-native-svg.
import Svg, { Circle, Path } from "react-native-svg";
import { C } from "../theme";

type P = { size?: number; color?: string };

export function GearIcon({ size = 19, color = C.ink1 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="10" cy="10" r="2.6" />
      <Path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </Svg>
  );
}

export function ShareIcon({ size = 19, color = C.ink1 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10 12.5V3M6.5 6.5 10 3l3.5 3.5" />
      <Path d="M5 10H4.5A1.5 1.5 0 0 0 3 11.5v4A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 15.5 10H15" />
    </Svg>
  );
}

export function HistoryIcon({ size = 19, color = C.ink1 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.2 10a6.8 6.8 0 1 0 2-4.8" />
      <Path d="M3 3.5v3.2h3.2" />
      <Path d="M10 6.6v3.6l2.4 1.5" />
    </Svg>
  );
}
