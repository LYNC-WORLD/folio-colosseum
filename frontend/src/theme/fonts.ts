import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from "@expo-google-fonts/schibsted-grotesk";
import {
  AzeretMono_400Regular,
  AzeretMono_500Medium,
  AzeretMono_600SemiBold,
} from "@expo-google-fonts/azeret-mono";

export const FONT = {
  display400: "SchibstedGrotesk_400Regular",
  display500: "SchibstedGrotesk_500Medium",
  display600: "SchibstedGrotesk_600SemiBold",
  display700: "SchibstedGrotesk_700Bold",
  display800: "SchibstedGrotesk_800ExtraBold",
  mono400: "AzeretMono_400Regular",
  mono500: "AzeretMono_500Medium",
  mono600: "AzeretMono_600SemiBold",
} as const;

export const fontsToLoad = {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
  AzeretMono_400Regular,
  AzeretMono_500Medium,
  AzeretMono_600SemiBold,
};
