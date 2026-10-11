// Shared layout for every onboarding screen (prototype #s-onb1…4, #s-result):
//
//   ‹  ━━━━ ━━━━ ━━━━ ────        back + progress (hidden on the result screen)
//   QUESTION 2 OF 4               ┐
//   What are you                  │ rise in, 55ms apart (.stagger)
//   starting with?                │
//   This becomes your default…    ┘
//   [ options … scroll ]
//   [ Continue ]                  pinned footer; content fades out under it

import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { C, TYPE } from "../../theme";
import { Rise } from "../ui/Enter";
import { ProgressBar } from "./ProgressBar";

export const HEADER_STEP = 55; // ms between header lines
export const RISE_MS = 460;
/** delay for the first element after the header, so lists continue the cascade */
export const AFTER_HEADER = HEADER_STEP * 3;

type Props = {
  /** 1–4 shows back + progress; omit for the result screen */
  step?: number;
  label: string;
  title: string;
  body?: string;
  titleStyle?: StyleProp<TextStyle>;
  bodyStyle?: StyleProp<TextStyle>;
  headerGap?: number;
  children?: ReactNode;
  footer: ReactNode;
};

export function OnboardingScaffold({
  step,
  label,
  title,
  body,
  titleStyle,
  bodyStyle,
  headerGap = 10,
  children,
  footer,
}: Props) {
  const nav = useNavigation();
  const canBack = step != null && nav.canGoBack();

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {step != null ? (
          <View style={s.top}>
            {canBack ? (
              <Pressable
                onPress={() => nav.goBack()}
                style={({ pressed }) => [s.back, pressed && { opacity: 0.6 }]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={22} color={C.mint} />
              </Pressable>
            ) : null}
            <ProgressBar step={step} />
          </View>
        ) : null}

        <ScrollView
          style={s.flex}
          contentContainerStyle={[s.content, step == null && s.contentNoTop]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: headerGap }}>
            <Rise duration={RISE_MS}>
              <Text style={TYPE.lbl}>{label}</Text>
            </Rise>
            <Rise duration={RISE_MS} delay={HEADER_STEP}>
              <Text style={[TYPE.h1, titleStyle]} accessibilityRole="header">
                {title}
              </Text>
            </Rise>
            {body ? (
              <Rise duration={RISE_MS} delay={HEADER_STEP * 2}>
                <Text style={[TYPE.body, bodyStyle]}>{body}</Text>
              </Rise>
            ) : null}
          </View>
          {children}
        </ScrollView>

        <View style={s.footer}>
          {/* long lists fade out under the button instead of being cut off */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(10,11,14,0)", C.ground]}
            style={s.fade}
          />
          {footer}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Dark inset panel with an optional mint label (prototype .wash). */
export function Wash({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <View style={s.wash}>
      {label ? <Text style={TYPE.lbl}>{label}</Text> : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  flex: { flex: 1 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  back: { width: 36, height: 44, marginLeft: -10, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, gap: 20 },
  contentNoTop: { paddingTop: 26 + 34 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12, backgroundColor: C.ground },
  fade: { position: "absolute", left: 0, right: 0, top: -24, height: 24 },
  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16, gap: 8 },
});
