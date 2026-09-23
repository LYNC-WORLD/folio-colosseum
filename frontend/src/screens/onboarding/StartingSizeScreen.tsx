import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../../components";
import { AMOUNT_PRESETS, useOnboarding } from "../../context";
import { C, RADIUS, FONT } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation";
import { ProgressBar } from "../../components";

type Props = NativeStackScreenProps<OnboardingStackParamList, "StartingSize">;

export function StartingSizeScreen({ navigation }: Props) {
  const {
    amountPreset,
    setAmountPreset,
    customAmount,
    setCustomAmount,
    resolvedAmount,
  } = useOnboarding();

  const activeNote =
    AMOUNT_PRESETS.find((p) => p.v === amountPreset)?.note ?? "";

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <ProgressBar step={2} />

        <Text style={s.h1}>How much do you want to put in to start?</Text>
        <Text style={s.sub}>
          This becomes your default buy size. Change it any time.
        </Text>

        <View style={s.amountRow}>
          <Text style={s.amountSign}>$</Text>
          <Text style={s.amount}>
            {amountPreset === "custom"
              ? customAmount || "0"
              : resolvedAmount.toLocaleString("en-US")}
          </Text>
        </View>
        <Text style={s.amountNote}>in USDC · {activeNote}</Text>

        <View style={s.grid}>
          {AMOUNT_PRESETS.map((p) => {
            const on = p.v === amountPreset;
            return (
              <Pressable
                key={p.v}
                onPress={() => setAmountPreset(p.v)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  s.preset,
                  {
                    backgroundColor: on ? C.bone : C.card,
                    borderColor: on ? C.bone : C.hairline,
                  },
                ]}
              >
                <Text
                  style={[s.presetLabel, { color: on ? C.buttonInk : C.bone }]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {amountPreset === "custom" && (
          <TextInput
            autoFocus
            value={customAmount}
            onChangeText={(t) => setCustomAmount(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Enter an amount"
            placeholderTextColor={C.inkMuted}
            style={s.customInput}
          />
        )}

        <View style={s.feeCard}>
          <View style={s.feeBadge}>
            <Text style={s.feeBadgeLabel}>%</Text>
          </View>
          <Text style={s.feeText}>
            Folio takes <Text style={s.feeStrong}>1%</Text> when you buy or
            sell, and <Text style={s.feeStrong}>5%</Text> of profit when you
            exit in the green. No monthly fee, no spread markup.
          </Text>
        </View>

        <View style={{ flexGrow: 1 }} />

        <PrimaryButton
          label="Continue"
          onPress={() => navigation.navigate("RiskBehaviour")}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  h1: {
    marginTop: 28,
    fontFamily: FONT.display800,
    fontSize: 32,
    lineHeight: 32,
    letterSpacing: -1.4,
    color: C.bone,
  },
  sub: {
    marginTop: 8,
    fontFamily: FONT.display400,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSecondary,
  },

  amountRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  amountSign: {
    fontFamily: FONT.display500,
    fontSize: 26,
    color: C.inkMuted,
    marginBottom: 6,
  },
  amount: {
    fontFamily: FONT.display800,
    fontSize: 64,
    letterSpacing: -3,
    color: C.bone,
  },
  amountNote: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: FONT.display400,
    fontSize: 13,
    color: C.inkMuted,
  },

  grid: {
    marginTop: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  preset: {
    width: "31%",
    height: 48,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetLabel: { fontFamily: FONT.display500, fontSize: 15 },

  customInput: {
    marginTop: 12,
    height: 48,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    fontFamily: FONT.mono500,
    fontSize: 16,
    color: C.bone,
  },

  feeCard: {
    marginTop: 28,
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    flexDirection: "row",
    gap: 12,
  },
  feeBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  feeBadgeLabel: { fontFamily: FONT.mono500, fontSize: 14, color: C.bone },
  feeText: {
    flex: 1,
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSecondary,
  },
  feeStrong: { fontFamily: FONT.display600, color: C.bone },
});
