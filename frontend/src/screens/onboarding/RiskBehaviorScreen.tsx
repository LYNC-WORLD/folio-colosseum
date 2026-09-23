import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../../components";
import { RISK_DEFS, useOnboarding } from "../../context";
import { C, RADIUS, FONT } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation";
import { ProgressBar } from "../../components";

type Props = NativeStackScreenProps<OnboardingStackParamList, "RiskBehaviour">;

export function RiskBehaviorScreen({ navigation }: Props) {
  const { risk, setRisk } = useOnboarding();
  const active = RISK_DEFS.find((d) => d.id === risk) ?? RISK_DEFS[1];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <ProgressBar step={3} />

        <Text style={s.h1}>
          A position you hold falls 20% in a week. What do you do?
        </Text>
        <Text style={s.sub}>
          Be honest — this sets how loud your alerts get, not how good an
          investor you are.
        </Text>

        <View style={s.list}>
          {RISK_DEFS.map((d) => {
            const on = d.id === risk;
            return (
              <Pressable
                key={d.id}
                onPress={() => setRisk(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  s.option,
                  {
                    backgroundColor: on ? C.raised : C.card,
                    borderColor: on ? d.color : C.hairline,
                  },
                ]}
              >
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: on ? d.color : "transparent",
                      borderColor: on ? d.color : "#453D37",
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.optionLabel}>{d.label}</Text>
                  <Text style={s.optionNote}>{d.note}</Text>
                </View>
                <View
                  style={[s.tag, { borderColor: on ? d.color : "#3A332E" }]}
                >
                  <Text
                    style={[s.tagLabel, { color: on ? d.color : C.inkMuted }]}
                  >
                    {d.tag}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.consequenceCard}>
          <Text style={s.consequenceHeading}>WHAT THIS CHANGES</Text>
          <Text style={s.consequenceText}>{active.consequence}</Text>
        </View>

        <View style={{ flexGrow: 1 }} />

        <PrimaryButton
          label="Continue"
          onPress={() => navigation.navigate("HoldingPeriod")}
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
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -1.2,
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
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  optionLabel: { fontFamily: FONT.display600, fontSize: 16, color: C.bone },
  optionNote: {
    marginTop: 4,
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 18,
    color: C.inkMuted,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  tagLabel: { fontFamily: FONT.mono400, fontSize: 11, letterSpacing: 0.4 },

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
