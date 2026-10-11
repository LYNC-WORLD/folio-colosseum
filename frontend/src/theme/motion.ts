// src/theme/motion.ts — one easing curve and one set of durations for the whole app.
// Reanimated's withTiming respects the phone's "Reduce motion" setting by default.
import { Easing } from "react-native-reanimated";

/** cubic-bezier(.22,.61,.36,1) — the prototype's --ease */
export const EASE = Easing.bezier(0.22, 0.61, 0.36, 1);

export const DUR = {
  press: 140,
  fast: 200,
  switch: 220,
  base: 280,
  segment: 340,
  screen: 400,
  sheet: 420,
  rise: 480,
  bar: 800,
  count: 900,
} as const;

export const timing = (duration: number) => ({ duration, easing: EASE });

/** Stagger for lists that rise in: stagger(i) → 0, 60, 120 … ms */
export const stagger = (i: number, step = 60, base = 0) => base + i * step;
