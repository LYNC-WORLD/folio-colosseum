import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  ProfileScreen,
  TransactionsScreen,
  RecurringBuysScreen,
} from "../screens";
import { stackOptions } from "./stackOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  Transactions: undefined;
  RecurringBuys: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: "Transactions" }}
      />
      <Stack.Screen
        name="RecurringBuys"
        component={RecurringBuysScreen}
        options={{ title: "Recurring Buys" }}
      />
    </Stack.Navigator>
  );
}
