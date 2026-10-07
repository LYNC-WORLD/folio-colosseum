// Question 2 (last question) — prototype #s-onb2 (mono amount on the left, note on the right)
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CAPITAL_DEFS, useOnboarding } from "../../context";
import { FONT, TYPE } from "../../theme";
import { Button, OptionCard, Rise } from "../../components/ui";
import {
  AFTER_HEADER,
  OnboardingScaffold,
} from "../../components/onboarding/OnboardingScaffold";
import type { OnboardingStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<OnboardingStackParamList, "StartingSize">;

export function StartingSizeScreen({ navigation }: Props) {
  const { capital, setCapital } = useOnboarding();

  return (
    <OnboardingScaffold
      step={2}
      label="QUESTION 2 OF 2"
      title={"What are you\nstarting with?"}
      body="There is no minimum. This only shapes what we show you first."
      footer={
        <Button
          title="See my profile"
          onPress={() => navigation.navigate("ProfileSummary")}
        />
      }
    >
      <View style={s.list}>
        {CAPITAL_DEFS.map((c, i) => (
          <Rise key={c.id} delay={AFTER_HEADER + i * 40} duration={420}>
            <OptionCard
              title={c.label}
              titleStyle={s.amount}
              selected={c.id === capital}
              onPress={() => setCapital(c.id)}
              right={<Text style={TYPE.sub}>{c.note}</Text>}
            />
          </Rise>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const s = StyleSheet.create({
  list: { gap: 10 },
  amount: {
    fontFamily: FONT.mono400,
    fontSize: 15,
    letterSpacing: 0,
    fontVariant: ["tabular-nums"],
  },
});
