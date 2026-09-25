// src/screens/LoginScreen.tsx — prototype: #s-signin
//
// No entrance animation of its own: on app open it is revealed by the splash
// crossfade, and after sign-out it is shown with the same 280ms fade.
// Auth logic is unchanged — this only renders useAuth().

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { Button, Mark, Rise } from "../components/ui";

export function LoginScreen() {
  const { signIn, busy, error } = useAuth();

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={s.page}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — centred in the free space above the button */}
        <View style={s.hero}>
          <Mark height={86} />
          <Text style={[TYPE.h1, h1Size(48)]} accessibilityRole="header">
            Own the{"\n"}world's best{"\n"}companies.
          </Text>
          <Text style={[TYPE.body, s.body]}>
            Stocks, pre-IPOs, gold and treasuries — bought with stablecoins,
            held in a wallet only you control.
          </Text>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          {error ? (
            <Rise key={error} distance={8} duration={320}>
              <View
                style={s.error}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <View style={s.errorBar} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            </Rise>
          ) : null}

          <Button
            title={busy ? "Signing in…" : "Continue with Google"}
            onPress={busy ? undefined : signIn}
            icon={
              busy ? (
                <ActivityIndicator size="small" color={C.onMint} />
              ) : (
                <View style={s.g}>
                  <Text style={s.gLetter}>G</Text>
                </View>
              )
            }
          />

          <Text style={s.legal}>NON-CUSTODIAL · SETTLES ON-CHAIN</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  // prototype .screen padding: 26px 20px 24px
  page: {
    flexGrow: 1,
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  hero: { flexGrow: 1, justifyContent: "center", gap: 28, paddingVertical: 12 },
  body: { maxWidth: 300 },

  actions: { gap: 16 },

  // "G" avatar inside the button: on-mint circle, mint letter
  g: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: C.onMint,
    alignItems: "center",
    justifyContent: "center",
  },
  gLetter: {
    fontFamily: FONT.sans800,
    fontSize: 12,
    color: C.mint,
    includeFontPadding: false,
  },

  legal: {
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.2),
    color: C.ink4,
  },

  error: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  errorBar: { width: 3, borderRadius: 2, backgroundColor: C.loss },
  errorText: {
    flex: 1,
    fontFamily: FONT.sans500,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.loss,
  },
});
