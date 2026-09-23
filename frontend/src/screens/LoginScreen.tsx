import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context";
import { C, RADIUS, FONT } from "../theme";

const PREVIEW_ASSETS: {
  ticker: string;
  price: string;
  delta?: string;
  deltaColor?: string;
  tag?: string;
}[] = [
  { ticker: "NVDA", price: "$184.20", delta: "+2.4%", deltaColor: C.jade },
  { ticker: "SPACEX", price: "$212.50", tag: "Pre-IPO" },
  { ticker: "XAUT", price: "$3,412", delta: "+0.6%", deltaColor: C.jade },
  { ticker: "TSLA", price: "$402.90", delta: "−1.1%", deltaColor: C.clay },
];

export function LoginScreen() {
  const { signIn, busy, error } = useAuth();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.container}>
        {/* Wordmark row */}
        <View style={s.brandRow}>
          <Text style={s.brand}>Folio</Text>
          <View style={s.brandRule} />
          <Text style={s.brandTag}>Non-custodial</Text>
        </View>

        {/* Headline */}
        <View style={s.headlineBlock}>
          <Text style={s.headline}>
            <Text style={s.headlineDim}>
              Own what{"\n"}you actually{"\n"}
            </Text>
            <Text style={s.headlineBright}>believe in.</Text>
          </Text>
          <Text style={s.subtitle}>
            US stocks, pre-IPOs, commodities and tokenized assets — bought with
            stablecoins, held in a wallet only you control.
          </Text>
        </View>

        {/* Preview grid */}
        <View style={s.grid}>
          {PREVIEW_ASSETS.map((a) => (
            <View key={a.ticker} style={s.card}>
              <Text style={s.cardTicker}>{a.ticker}</Text>
              <Text style={s.cardPrice}>{a.price}</Text>
              {a.tag ? (
                <Text style={s.cardTag}>{a.tag}</Text>
              ) : (
                <Text style={[s.cardDelta, { color: a.deltaColor }]}>
                  {a.delta}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ flexGrow: 1 }} />

        {/* Actions */}
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
            s.primaryButton,
            pressed && s.pressed,
            busy && s.busy,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={C.buttonInk} />
          ) : (
            <View style={s.gBadge}>
              <Text style={s.gLetter}>G</Text>
            </View>
          )}
          <Text style={s.primaryLabel}>
            {busy ? "Signing in…" : "Continue with Google"}
          </Text>
        </Pressable>

        {/* <Pressable
          onPress={() => {
            // TODO: wire up once wallet-connect is added to AuthContext.
            // Left as a visible, disabled-feeling affordance for now so the
            // screen matches the design — no wallet flow exists yet.
          }}
          accessibilityRole="button"
          accessibilityLabel="Connect a wallet instead"
          style={({ pressed }) => [s.secondaryButton, pressed && s.pressed]}
        >
          <Text style={s.secondaryLabel}>Connect a wallet instead</Text>
        </Pressable> */}

        <Text style={s.legal}>
          Non-custodial · settles on-chain · 1% per trade
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  brand: {
    fontFamily: FONT.display800,
    fontSize: 30,
    letterSpacing: -1.8,
    color: C.bone,
  },
  brandRule: { flexGrow: 1, height: 1, backgroundColor: C.hairline },
  brandTag: {
    fontFamily: FONT.mono500,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.inkMuted,
  },

  headlineBlock: { marginTop: 40, gap: 16 },
  headline: {
    fontFamily: FONT.display800,
    fontSize: 50,
    lineHeight: 48,
    letterSpacing: -2.7,
  },
  headlineDim: { color: C.inkMuted },
  headlineBright: { color: C.bone },
  subtitle: {
    fontFamily: FONT.display400,
    fontSize: 15,
    lineHeight: 23,
    color: C.inkSecondary,
    maxWidth: 300,
  },

  grid: {
    marginTop: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48%",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
  },
  cardTicker: {
    fontFamily: FONT.mono400,
    fontSize: 13,
    letterSpacing: 0.5,
    color: C.inkMuted,
  },
  cardPrice: {
    fontFamily: FONT.mono500,
    fontSize: 18,
    color: C.bone,
  },
  cardDelta: {
    fontFamily: FONT.display400,
    fontSize: 12,
  },
  cardTag: {
    fontFamily: FONT.display600,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: C.inkMuted,
  },

  primaryButton: {
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: C.buttonBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  gBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.inkSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  gLetter: {
    fontFamily: FONT.display600,
    fontSize: 13,
    color: C.inkMuted,
  },
  primaryLabel: {
    fontFamily: FONT.display600,
    fontSize: 16,
    color: C.buttonInk,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  busy: { opacity: 0.75 },

  secondaryButton: {
    height: 52,
    marginTop: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontFamily: FONT.display500,
    fontSize: 15,
    color: C.inkSecondary,
  },

  legal: {
    marginTop: 18,
    fontFamily: FONT.display400,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: C.inkMuted,
  },

  error: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    marginBottom: 12,
  },
  errorBar: { width: 3, borderRadius: 2, backgroundColor: C.clay },
  errorText: {
    flex: 1,
    fontFamily: FONT.display400,
    color: C.clay,
    fontSize: 14,
    lineHeight: 20,
  },
});
