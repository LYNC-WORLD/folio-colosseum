// Shared options for every native stack in the app.
//
// Push: new screen slides in from the right while the previous one drifts
// left — the prototype's screen stack (.screen.right → .active → .left).
// iOS uses its native push (same motion, with the edge swipe-back gesture).
//
// Screens that still use the native header get a dark, mint-tinted one until
// each is redesigned with the prototype's in-screen "‹ Back" link.

import { Platform } from "react-native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { C, FONT } from "../theme";

export const stackOptions: NativeStackNavigationOptions = {
  animation: Platform.OS === "ios" ? "default" : "slide_from_right",
  animationDuration: 400,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  contentStyle: { backgroundColor: C.ground },

  headerStyle: { backgroundColor: C.ground },
  headerShadowVisible: false,
  headerTintColor: C.mint,
  headerTitleStyle: { fontFamily: FONT.sans700, fontSize: 17, color: C.ink1 },
  headerBackButtonDisplayMode: "minimal",
};
