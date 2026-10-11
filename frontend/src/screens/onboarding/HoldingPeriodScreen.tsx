// Question 4 — prototype #s-onb4 (2 × 2 grid of tall tiles)
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HORIZON_DEFS, useOnboarding } from "../../context";
import { FONT, em } from "../../theme";
import { Button, OptionCard, Rise } from "../../components/ui";
import { AFTER_HEADER, OnboardingScaffold } from "../../components/onboarding/OnboardingScaffold";
import type { OnboardingStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<OnboardingStackParamList, "HoldingPeriod">;

export function HoldingPeriodScreen({ navigation }: Props) {
  const { horizon, setHorizon } = useOnboarding();

  return (
    <OnboardingScaffold
      step={4}
      label="QUESTION 4 OF 4"
      title={"How long are\nyou holding?"}
      body="Pre-IPOs stay locked until the company lists or is acquired."
      footer={<Button title="See my profile" onPress={() => navigation.navigate("ProfileSummary")} />}
    >
      <View style={s.grid}>
        {HORIZON_DEFS.map((d, i) => (
          <Rise key={d.id} delay={AFTER_HEADER + i * 40} duration={420} style={s.cell}>
            <OptionCard
              layout="tile"
              title={d.label}
              titleStyle={s.title}
              subtitle={d.note}
              selected={d.id === horizon}
              onPress={() => setHorizon(d.id)}
            />
          </Rise>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  // two columns: (100% − 10 gap) / 2
  cell: { flexBasis: "47%", flexGrow: 1 },
  // prototype: .h2 at 17px
  title: { fontFamily: FONT.sans800, fontSize: 17, letterSpacing: em(17, -0.04) },
});
