// The Folio mark — the isometric "F". Same polygons as the prototype.
import Svg, { Polygon } from "react-native-svg";

const SHAPES: [string, string][] = [
  ["13.86,8.00 13.86,-22.00 25.11,-28.50 25.11,1.50", "#0C9A6C"],
  ["41.57,-6.00 41.57,-19.00 52.83,-25.50 52.83,-12.50", "#0C9A6C"],
  ["41.57,-19.00 13.86,-35.00 25.11,-41.50 52.83,-25.50", "#4FF6BB"],
  ["13.86,-35.00 13.86,-53.00 25.11,-59.50 25.11,-41.50", "#0C9A6C"],
  ["53.69,-30.00 53.69,-45.00 64.95,-51.50 64.95,-36.50", "#0C9A6C"],
  ["53.69,-45.00 0.00,-76.00 11.26,-82.50 64.95,-51.50", "#4FF6BB"],
  [
    "0.00,0.00 13.86,8.00 13.86,-22.00 41.57,-6.00 41.57,-19.00 13.86,-35.00 13.86,-53.00 53.69,-30.00 53.69,-45.00 0.00,-76.00",
    "#01D794",
  ],
];

export function Mark({ height = 86 }: { height?: number }) {
  const width = (height * 65) / 90.5;
  return (
    <Svg width={width} height={height} viewBox="0 -82.5 65 90.5" accessibilityElementsHidden>
      {SHAPES.map(([points, fill], i) => (
        <Polygon key={i} points={points} fill={fill} />
      ))}
    </Svg>
  );
}
