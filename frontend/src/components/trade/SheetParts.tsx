// Small building blocks shared by the trade sheets.
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { C, FONT, TYPE, em, h1Size } from "../../theme";
import { ProcBar } from "../ui/ProcBar";
import { SuccessTick } from "../ui/SuccessTick";

/** Each sheet step fades in when it replaces the previous one. */
export function Step({ children, id }: { children: ReactNode; id: string }) {
  return (
    <Animated.View key={id} entering={FadeIn.duration(240)} style={s.step}>
      {children}
    </Animated.View>
  );
}

/** "ROUTE ……… Best price across venues" row (prototype row()) */
export function Row({ k, v, last }: { k: string; v: ReactNode; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.hair]}>
      <Text style={s.key}>{k}</Text>
      {typeof v === "string" ? <Text style={s.val}>{v}</Text> : v}
    </View>
  );
}

export function Heading({ label, title, labelColor }: { label: string; title: string; labelColor?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[TYPE.lbl, labelColor ? { color: labelColor } : null]}>{label}</Text>
      <Text style={[TYPE.h1, h1Size(28)]}>{title}</Text>
    </View>
  );
}

export function Working({ title, caption }: { title: string; caption: string }) {
  return (
    <View style={s.working} accessibilityLiveRegion="polite">
      <Text style={[TYPE.h2, { fontSize: 19 }]}>{title}</Text>
      <ProcBar />
      <Text style={s.caption}>{caption}</Text>
    </View>
  );
}

export function Success({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.success} accessibilityLiveRegion="polite">
      <SuccessTick />
      <Text style={[TYPE.h2, s.center]}>{title}</Text>
      <Text style={[TYPE.body, s.center, { fontSize: 13 }]}>{body}</Text>
    </View>
  );
}

export function Note({ children, tone = "ink2" }: { children: ReactNode; tone?: "ink2" | "ink3" }) {
  return <Text style={[s.note, { color: tone === "ink2" ? C.ink2 : C.ink3 }]}>{children}</Text>;
}

const s = StyleSheet.create({
  step: { gap: 18 },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 },
  hair: { borderBottomWidth: 1, borderBottomColor: C.hair },
  key: { flex: 1, fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.2), color: C.ink4 },
  val: { fontFamily: FONT.mono400, fontSize: 13, color: "#D6DAE0", fontVariant: ["tabular-nums"], textAlign: "right", flexShrink: 1 },
  working: { gap: 20, paddingTop: 14, paddingBottom: 6, alignItems: "center" },
  caption: { fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.16), color: C.ink4 },
  success: { gap: 18, paddingTop: 10, paddingBottom: 4, alignItems: "center" },
  center: { textAlign: "center" },
  note: { fontFamily: FONT.sans400, fontSize: 12.5, lineHeight: 19 },
});
