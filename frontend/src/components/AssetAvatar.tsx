// Square-ish tile with the asset's logo, or its mint ticker code (prototype .av).
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { C, FONT } from "../theme";
import { assetCode } from "../lib/format";

type Props = { symbol: string; imageUrl?: string | null; size?: number; radius?: number };

export function AssetAvatar({ symbol, imageUrl, size = 38, radius = 11 }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!imageUrl && !failed;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "#20252F",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <Image source={{ uri: imageUrl! }} style={{ width: "100%", height: "100%" }} onError={() => setFailed(true)} />
      ) : (
        <Text style={{ fontFamily: FONT.mono500, fontSize: size >= 40 ? 12 : 11, color: C.mint }}>
          {assetCode(symbol)}
        </Text>
      )}
    </View>
  );
}
