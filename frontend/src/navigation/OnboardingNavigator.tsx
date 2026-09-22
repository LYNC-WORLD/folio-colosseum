// src/navigation/OnboardingNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingProvider } from "../context/OnboardingContext";
import { C } from "../theme/colors";
import WhatToOwnScreen from "../screens/onboarding/WhatToOwnScreen";
import StartingSizeScreen from "../screens/onboarding/StartingSizeScreen";
import RiskBehaviorScreen from "../screens/onboarding/RiskBehaviorScreen";
import HoldingPeriodScreen from "../screens/onboarding/HoldingPeriodScreen";
import ProfileSummaryScreen from "../screens/onboarding/ProfileSummaryScreen";

export type OnboardingStackParamList = {
  WhatToOwn: undefined;
  StartingSize: undefined;
  RiskBehaviour: undefined;
  HoldingPeriod: undefined;
  ProfileSummary: { onComplete: () => void } | undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator({
  onComplete,
}: {
  onComplete: () => void;
}) {
  return (
    <OnboardingProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="WhatToOwn" component={WhatToOwnScreen} />
        <Stack.Screen name="StartingSize" component={StartingSizeScreen} />
        <Stack.Screen name="RiskBehaviour" component={RiskBehaviorScreen} />
        <Stack.Screen name="HoldingPeriod" component={HoldingPeriodScreen} />
        <Stack.Screen
          name="ProfileSummary"
          component={ProfileSummaryScreen}
          initialParams={{ onComplete }}
        />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}
