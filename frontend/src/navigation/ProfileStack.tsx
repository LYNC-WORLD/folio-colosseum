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

// Every screen here draws its own "‹ Back" link, like the prototype.
export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
      <Stack.Screen name="RecurringBuys" component={RecurringBuysScreen} />
      <Stack.Screen name="RecurringNew" component={RecurringNewScreen} />
    </Stack.Navigator>
  );
}
