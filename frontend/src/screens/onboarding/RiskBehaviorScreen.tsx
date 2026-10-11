// Question 3 — prototype #s-onb3
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RISK_DEFS, useOnboarding } from "../../context";
import { C, FONT } from "../../theme";
import { Button, OptionCard, Rise } from "../../components/ui";
import { AFTER_HEADER, OnboardingScaffold, Wash } from "../../components/onboarding/OnboardingScaffold";
import type { OnboardingStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<OnboardingStackParamList, "RiskBehaviour">;

export function RiskBehaviorScreen({ navigation }: Props) {
  const { risk, setRisk } = useOnboarding();

  return (
    <OnboardingScaffold
      step={3}
      label="QUESTION 3 OF 4"
      title={"Your position\ndrops 20% in\na week."}
      body="Be honest — this decides how much volatility we put in front of you."
      footer={<Button title="Continue" onPress={() => navigation.navigate("HoldingPeriod")} />}
    >
      <View style={s.list}>
        {RISK_DEFS.map((d, i) => (
          <Rise key={d.id} delay={AFTER_HEADER + i * 40} duration={420}>
            <OptionCard title={d.label} selected={d.id === risk} onPress={() => setRisk(d.id)} />
          </Rise>
        ))}

        <Rise delay={AFTER_HEADER + RISK_DEFS.length * 40} duration={420} style={s.noteWrap}>
          <Wash>
            <View style={s.note}>
              <Text style={s.dot}>●</Text>
              <Text style={s.noteText}>
                Pre-IPOs can fall further than this and cannot be sold on demand. We say so every time one
                appears.
              </Text>
            </View>
          </Wash>
        </Rise>
      </View>
    </OnboardingScaffold>
  );
}

const s = StyleSheet.create({
  list: { gap: 10 },
  noteWrap: { marginTop: 6 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { color: C.mint, fontSize: 13, lineHeight: 17 },
  noteText: { flex: 1, fontFamily: FONT.sans400, fontSize: 12.5, lineHeight: 19, color: C.ink2 },
});
