import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LeadersScreen } from "../screens";
import { InvestorScreen } from "../screens/InvestorScreen";
import { stackOptions } from "./stackOptions";

export type LeadersStackParamList = {
  LeadersMain: undefined;
  Investor: { id: string };
};

const Stack = createNativeStackNavigator<LeadersStackParamList>();

export function LeadersStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="LeadersMain" component={LeadersScreen} />
      <Stack.Screen name="Investor" component={InvestorScreen} />
    </Stack.Navigator>
  );
}
