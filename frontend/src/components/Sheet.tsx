// src/components/Sheet.tsx — one app-wide bottom sheet (prototype #sheet + #scrim).
//
//   const sheet = useSheet();
//   sheet.open(<ConfirmOrder onDone={sheet.close} />);
//
// • slides up 420ms with the app's easing, scrim fades to 68% black
// • drag it down (or tap the scrim, or Android back) to close
// • rises with the keyboard
// Content is rendered above the navigators: pass callbacks in, don't call
// useNavigation() inside sheet content.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BackHandler, Keyboard, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../theme";
import { DUR, timing } from "../theme/motion";

type SheetOptions = {
  /** called once the sheet starts closing, however it was closed */
  onClose?: () => void;
  /** false = no drag / scrim / back-button dismissal (e.g. while an order is processing) */
  dismissable?: boolean;
  /** screen-reader name, e.g. "Confirm order" */
  label?: string;
};

type SheetApi = {
  open: (content: ReactNode, options?: SheetOptions) => void;
  /** swap the content without re-animating (processing → success) */
  update: (content: ReactNode, options?: SheetOptions) => void;
  /** change options of the open sheet, e.g. block dismissal while an order runs */
  setOptions: (options: Partial<SheetOptions>) => void;
  close: () => void;
  isOpen: boolean;
};

const SheetContext = createContext<SheetApi | null>(null);

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheet must be used inside <SheetProvider>");
  return ctx;
}

const OFFSCREEN = 2000;

export function SheetProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  const [content, setContent] = useState<ReactNode>(null);
  const [isOpen, setIsOpen] = useState(false);
  const options = useRef<SheetOptions>({});
  const openRef = useRef(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const p = useSharedValue(0); // 0 closed → 1 open
  const height = useSharedValue(0);
  const drag = useSharedValue(0);

  const open = useCallback((node: ReactNode, opts: SheetOptions = {}) => {
    clearTimeout(clearTimer.current);
    options.current = opts;
    openRef.current = true;
    drag.value = 0;
    setContent(node);
    setIsOpen(true);
    p.value = withTiming(1, timing(DUR.sheet));
  }, []);

  const update = useCallback((node: ReactNode, opts?: SheetOptions) => {
    if (opts) options.current = opts;
    setContent(node);
  }, []);

  const setOptions = useCallback((opts: Partial<SheetOptions>) => {
    options.current = { ...options.current, ...opts };
  }, []);

  const close = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    Keyboard.dismiss();
    setIsOpen(false);
    p.value = withTiming(0, timing(DUR.sheet));
    const cb = options.current.onClose;
    clearTimer.current = setTimeout(() => {
      setContent(null);
      drag.value = 0;
    }, DUR.sheet);
    cb?.();
  }, []);

  // Android back closes the sheet first
  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (options.current.dismissable !== false) close();
      return true;
    });
    return () => sub.remove();
  }, [isOpen, close]);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(10)
        .failOffsetX([-24, 24])
        .onUpdate((e) => {
          if (options.current.dismissable === false) return;
          // follow the finger down; resist a little going up
          drag.value = e.translationY > 0 ? e.translationY : e.translationY * 0.15;
        })
        .onEnd((e) => {
          if (options.current.dismissable === false) return;
          const h = height.value || 400;
          if (e.translationY > h * 0.25 || e.velocityY > 900) close();
          else drag.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
        }),
    [close],
  );

  const sheetStyle = useAnimatedStyle(() => {
    const h = height.value || OFFSCREEN;
    return {
      transform: [{ translateY: (1 - p.value) * h * 1.05 + Math.max(drag.value, -20) - keyboard.height.value }],
    };
  });

  const scrimStyle = useAnimatedStyle(() => {
    const h = height.value || 1;
    const dragged = Math.min(1, Math.max(0, drag.value / h));
    return { opacity: p.value * (1 - dragged) };
  });

  const api = useMemo(
    () => ({ open, update, setOptions, close, isOpen }),
    [open, update, setOptions, close, isOpen],
  );

  return (
    <SheetContext.Provider value={api}>
      <View style={s.flex}>
        {children}

        <Animated.View style={[StyleSheet.absoluteFill, s.scrim, scrimStyle]} pointerEvents={isOpen ? "auto" : "none"}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => options.current.dismissable !== false && close()}
          />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => (height.value = e.nativeEvent.layout.height)}
            style={[s.sheet, { paddingBottom: 26 + insets.bottom }, sheetStyle]}
            pointerEvents={isOpen ? "auto" : "none"}
            accessibilityViewIsModal={isOpen}
            accessibilityLabel={options.current.label}
          >
            <View style={s.grab} />
            {content}
          </Animated.View>
        </GestureDetector>
      </View>
    </SheetContext.Provider>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { backgroundColor: C.scrim, zIndex: 40 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 41,
    backgroundColor: C.raised,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 18,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -20 },
    elevation: 24,
  },
  grab: { width: 38, height: 4, borderRadius: 999, backgroundColor: C.grab, alignSelf: "center", marginBottom: 4 },
});
