// src/theme/fonts.ts
// Inter Tight for everything, JetBrains Mono for figures and labels.
// On React Native each weight is its own family — set fontFamily, never fontWeight.
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  InterTight_800ExtraBold,
} from "@expo-google-fonts/inter-tight";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";

export const FONT = {
  sans400: "InterTight_400Regular",
  sans500: "InterTight_500Medium",
  sans600: "InterTight_600SemiBold",
  sans700: "InterTight_700Bold",
  sans800: "InterTight_800ExtraBold",
  mono400: "JetBrainsMono_400Regular",
  mono500: "JetBrainsMono_500Medium",
  mono600: "JetBrainsMono_600SemiBold",

  // legacy keys, repointed
  display400: "InterTight_400Regular",
  display500: "InterTight_500Medium",
  display600: "InterTight_600SemiBold",
  display700: "InterTight_700Bold",
  display800: "InterTight_800ExtraBold",
} as const;

export const fontsToLoad = {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
  InterTight_800ExtraBold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
};

/** CSS letter-spacing is in em; React Native's is in points. em(34, -0.045) → -1.53 */
export const em = (fontSize: number, value: number) => fontSize * value;
