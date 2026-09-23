import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingProvider } from "../context";
import { C } from "../theme";
import {
  HoldingPeriodScreen,
  ProfileSummaryScreen,
  RiskBehaviorScreen,
  StartingSizeScreen,
  WhatToOwnScreen,
} from "../screens/onboarding";

export type OnboardingStackParamList = {
  WhatToOwn: undefined;
  StartingSize: undefined;
  RiskBehaviour: undefined;
  HoldingPeriod: undefined;
  ProfileSummary: { onComplete: () => void } | undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator({
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
