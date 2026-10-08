// Question 1 — prototype #s-onb1 (multi-select, square dots)
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ASSET_DEFS, useOnboarding } from "../../context";
import { Button, OptionCard, Rise } from "../../components/ui";
import {
  AFTER_HEADER,
  OnboardingScaffold,
} from "../../components/onboarding/OnboardingScaffold";
import type { OnboardingStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<OnboardingStackParamList, "WhatToOwn">;

export function WhatToOwnScreen({ navigation }: Props) {
  const { picked, pickedCount, togglePicked } = useOnboarding();

  return (
    <OnboardingScaffold
      step={1}
      label="QUESTION 1 OF 2"
      title={"What do you\nwant to own?"}
      body="Pick as many as you like. You can change this later."
      footer={
        <Button
          title="Continue"
          disabled={pickedCount === 0}
          onPress={() => navigation.navigate("StartingSize")}
        />
      }
    >
      <View style={s.list}>
        {ASSET_DEFS.map((d, i) => (
          <Rise key={d.id} delay={AFTER_HEADER + i * 40} duration={420}>
            <OptionCard
              shape="square"
              title={d.label}
              subtitle={d.note}
              selected={picked[d.id]}
              onPress={() => togglePicked(d.id)}
            />
          </Rise>
        ))}
      </View>
    </OnboardingScaffold>
  );
}

const s = StyleSheet.create({
  list: { gap: 10 },
});
