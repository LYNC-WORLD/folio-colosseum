import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../../components/onboarding/OnboardingButton";
import { HORIZON_DEFS, useOnboarding } from "../../context";
import { C, RADIUS, FONT } from "../../theme";

import type { OnboardingStackParamList } from "../../navigation";
import { ProgressBar } from "../../components";

type Props = NativeStackScreenProps<OnboardingStackParamList, "HoldingPeriod">;

export function HoldingPeriodScreen({ navigation }: Props) {
  const { horizon, setHorizon } = useOnboarding();
  const active = HORIZON_DEFS.find((d) => d.id === horizon) ?? HORIZON_DEFS[2];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <ProgressBar step={4} />

        <Text style={s.h1}>How long do you expect to hold?</Text>
        <Text style={s.sub}>
          This sets the timeframe on every chart and filters the signals you
          see.
        </Text>

        <View style={s.list}>
          {HORIZON_DEFS.map((d) => {
            const on = d.id === horizon;
            return (
              <Pressable
                key={d.id}
                onPress={() => setHorizon(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  s.option,
                  {
                    backgroundColor: on ? C.raised : C.card,
                    borderColor: on ? C.bone : C.hairline,
                  },
                ]}
              >
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: on ? C.bone : "transparent",
                      borderColor: on ? C.bone : "#453D37",
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.optionLabel}>{d.label}</Text>
                  <Text style={s.optionNote}>{d.note}</Text>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.barFill,
                        {
                          width: d.w,
                          backgroundColor: on ? C.bone : "#453D37",
                        },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.consequenceCard}>
          <Text style={s.consequenceHeading}>DEFAULT CHART TIMEFRAME</Text>
          <Text style={s.consequenceText}>{active.consequence}</Text>
        </View>

        <View style={{ flexGrow: 1 }} />

        <PrimaryButton
          label="See my profile"
          onPress={() => navigation.navigate("ProfileSummary")}
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
    lineHeight: 33,
    letterSpacing: -1.4,
    color: C.bone,
  },
  sub: {
    marginTop: 8,
    marginBottom: 22,
    fontFamily: FONT.display400,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSecondary,
  },

  list: { gap: 12 },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dot: {
    marginTop: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionLabel: { fontFamily: FONT.display600, fontSize: 16, color: C.bone },
  optionNote: {
    marginTop: 4,
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 18,
    color: C.inkMuted,
  },
  barTrack: {
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.hairline,
  },
  barFill: { height: 4, borderRadius: 2 },

  consequenceCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  consequenceHeading: {
    fontFamily: FONT.display600,
    fontSize: 10,
    letterSpacing: 1.6,
    color: C.inkMuted,
  },
  consequenceText: {
    marginTop: 8,
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSecondary,
  },
});
