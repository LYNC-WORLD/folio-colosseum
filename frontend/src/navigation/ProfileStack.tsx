import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { C, FONT } from "../theme";

import {
  ProfileScreen,
  TransactionsScreen,
  RecurringBuysScreen,
} from "../screens";

export type ProfileStackParamList = {
  Profile: undefined;
  Transactions: undefined;
  RecurringBuys: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: C.bg,
        },
        headerShadowVisible: false,
        headerTintColor: C.bone,
        headerTitleStyle: {
          fontFamily: FONT.display600,
          fontSize: 17,
        },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: {
          backgroundColor: C.bg,
        },
      }}
    >
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: "Transactions",
        }}
      />

      <Stack.Screen
        name="RecurringBuys"
        component={RecurringBuysScreen}
        options={{
          title: "Recurring Buys",
        }}
      />
    </Stack.Navigator>
  );
}
