import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { ENV } from "../config/env";

const C = {
  bg: "#0E1217",
  ink: "#F1F3F6",
  muted: "#7F8896",
  ring: "rgba(255,255,255,0.07)",
  accent: "#8B9BFF",
  buttonBg: "#F1F3F6",
  buttonInk: "#0E1217",
  error: "#FF8F8F",
};

export default function LoginScreen() {
  const { signIn, busy, error } = useAuth();
  console.log("====================================");
  console.log(ENV);
  console.log("====================================");
  console.log("====================================");
  console.log(error);
  console.log("====================================");

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* The one decorative element: concentric rings with a single accent dot */}
      <View style={s.art} pointerEvents="none">
        <View style={[s.ring, { width: 300, height: 300 }]} />
        <View style={[s.ring, { width: 200, height: 200 }]} />
        <View style={[s.ring, { width: 100, height: 100 }]} />
        <View style={s.dot} />
      </View>

      <View style={s.container}>
        <Text style={s.title} accessibilityRole="header">
          Let's{"\n"}get started
        </Text>
        <Text style={s.subtitle}>Sign in to continue your journey.</Text>

        <View style={s.actions}>
          {error ? (
            <View
              style={s.error}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <View style={s.errorBar} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={signIn}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [
              s.button,
              pressed && s.buttonPressed,
              busy && s.buttonBusy,
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={C.buttonInk} />
            ) : (
              <Text style={s.gLetter}>G</Text>
            )}
            <Text style={s.buttonLabel}>
              {busy ? "Signing in…" : "Continue with Google"}
            </Text>
          </Pressable>

          <Text style={s.legal}>
            By continuing, you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  art: {
    position: "absolute",
    top: 70,
    right: -110,
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.ring,
  },
  dot: {
    position: "absolute",
    top: 44,
    left: 144,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.accent,
  },

  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 28,
    justifyContent: "flex-end",
    gap: 56,
  },

  copy: { gap: 16 },
  title: {
    color: C.ink,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "700",
    letterSpacing: -1.5,
  },
  subtitle: {
    color: C.muted,
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 280,
  },

  actions: { gap: 16 },

  button: {
    height: 58,
    borderRadius: 29,
    backgroundColor: C.buttonBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  buttonBusy: { opacity: 0.75 },
  buttonLabel: {
    color: C.buttonInk,
    fontSize: 17,
    fontWeight: "600",
  },
  gLetter: {
    color: "#4285F4",
    fontSize: 20,
    fontWeight: "800",
    includeFontPadding: false,
  },

  error: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  errorBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: C.error,
  },
  errorText: {
    flex: 1,
    color: C.error,
    fontSize: 15,
    lineHeight: 21,
  },

  legal: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
