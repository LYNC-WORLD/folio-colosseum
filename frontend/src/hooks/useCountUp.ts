// src/hooks/useCountUp.ts — numbers that roll to their value (900ms, ease-out cubic).
// First mount counts from `from` (0 by default, like the prototype);
// later changes count from the previous value.
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { DUR } from "../theme/motion";

export function useCountUp(
  to: number,
  { duration = DUR.count, from = 0 }: { duration?: number; from?: number } = {},
) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : from);
  const current = useRef(reduced ? to : from);

  useEffect(() => {
    if (reduced || !Number.isFinite(to)) {
      current.current = to;
      setValue(to);
      return;
    }
    const start = current.current;
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = start + (to - start) * e;
      current.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduced]);

  return value;
}
