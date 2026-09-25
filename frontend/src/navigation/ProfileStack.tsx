import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { StockCategory } from "../services";
import {
  ProfileScreen,
  TransactionsScreen,
  RecurringBuysScreen,
} from "../screens";
import { RecurringNewScreen } from "../screens/RecurringNewScreen";
import { stackOptions } from "./stackOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  Transactions: undefined;
  RecurringBuys: undefined;
  RecurringNew: {
    symbol: string;
    name: string;
    tokenAddress: string;
    price: number;
    category: StockCategory;
  };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// Transactions and Standing orders now draw their own "‹ Back" link.
// Profile keeps its current layout until Step 12.
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
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RecurringBuys"
        component={RecurringBuysScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RecurringNew"
        component={RecurringNewScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
