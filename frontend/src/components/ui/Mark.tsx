import { Image } from "react-native";

export function Mark({ height = 86 }: { height?: number }) {
  const width = height;
  return (
    <Image
      source={require("../../../assets/icon.png")}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityElementsHidden
    />
  );
}
