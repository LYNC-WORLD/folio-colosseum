// src/theme/type.ts — the prototype's text classes as RN styles.
import { StyleSheet } from "react-native";
import { C } from "./colors";
import { FONT, em } from "./fonts";

export const TYPE = StyleSheet.create({
  /** mint mono label: "QUESTION 1 OF 4" */
  lbl: { fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.22), color: C.mint },
  h1: { fontFamily: FONT.sans800, fontSize: 34, letterSpacing: em(34, -0.045), lineHeight: 35, color: C.ink1 },
  h2: { fontFamily: FONT.sans800, fontSize: 24, letterSpacing: em(24, -0.04), lineHeight: 25, color: C.ink1 },
  body: { fontFamily: FONT.sans400, fontSize: 14, lineHeight: 22, color: C.ink3 },
  sub: { fontFamily: FONT.sans400, fontSize: 12, color: C.ink3 },
  ttl: { fontFamily: FONT.sans700, fontSize: 14.5, letterSpacing: em(14.5, -0.015), color: C.ink1 },
  mono: { fontFamily: FONT.mono400, fontVariant: ["tabular-nums"], color: C.ink1 },
  fig: { fontFamily: FONT.mono400, fontSize: 13, fontVariant: ["tabular-nums"], color: C.ink1 },
  up: { color: C.mint },
  down: { color: C.loss },
});

/** Big display headline, e.g. h1Size(48) on sign-in. */
export const h1Size = (size: number) => ({
  fontSize: size,
  letterSpacing: em(size, -0.045),
  lineHeight: Math.round(size * 1.02),
});
