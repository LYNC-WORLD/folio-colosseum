// src/components/Toast.tsx — the prototype's top toast.
//
//   const toast = useToast();
//   toast("Bought NVDA", "SETTLED TO YOUR WALLET");
//
// Drops in from the top (420ms), stays 2.9s, slides back up.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, FONT, em } from "../theme";
import { DUR, timing } from "../theme/motion";
import { hSuccess } from "../lib/haptics";
import { Mark } from "./ui/Mark";

type ToastFn = (title: string, sub?: string, opts?: { haptic?: boolean }) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const SHOW_MS = 2900;

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ title: string; sub?: string; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const p = useSharedValue(0);
  const h = useSharedValue(80);

  const show = useCallback<ToastFn>((title, sub, opts) => {
    clearTimeout(timer.current);
    setMsg({ title, sub, id: Date.now() });
    if (opts?.haptic !== false) hSuccess();
    p.value = withTiming(1, timing(DUR.sheet));
    timer.current = setTimeout(() => {
      p.value = withTiming(0, timing(DUR.sheet));
    }, SHOW_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const top = insets.top + 14;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    transform: [{ translateY: (1 - p.value) * -(h.value * 1.4 + top) }],
  }));

  return (
    <ToastContext.Provider value={show}>
      <View style={s.flex}>
        {children}
        <Animated.View
          pointerEvents="none"
          onLayout={(e) => (h.value = e.nativeEvent.layout.height)}
          style={[s.toast, { top }, style]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {msg ? (
            <>
              <Mark height={21} />
              <View style={s.text}>
                <Text style={s.title}>{msg.title}</Text>
                {msg.sub ? <Text style={s.sub}>{msg.sub}</Text> : null}
              </View>
            </>
          ) : null}
        </Animated.View>
      </View>
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  toast: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 60,
    elevation: 30,
    backgroundColor: C.raised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.stroke,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
  },
  text: { flex: 1, gap: 3 },
  title: { fontFamily: FONT.sans700, fontSize: 13, letterSpacing: em(13, -0.015), color: C.ink1 },
  sub: { fontFamily: FONT.mono400, fontSize: 9.5, letterSpacing: em(9.5, 0.14), color: C.mint },
});
