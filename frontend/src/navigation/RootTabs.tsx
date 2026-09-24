import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { C } from "../theme";

import { LeadersScreen, PortfolioScreen, SignalsScreen } from "../screens";

import { HomeStack, HomeStackParamList } from "./HomeStack";
import { ProfileStack } from "./ProfileStack";

export type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Portfolio: undefined;
  Signals: undefined;
  Leaders: undefined;
  Profile: undefined;
  UserRecords: {
    initialTab?: "transactions" | "recurring";
  };
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Portfolio: "pie-chart-outline",
  Signals: "pulse-outline",
  Leaders: "podium-outline",
  Profile: "person-outline",
  UserRecords: "add-circle",
};

export function RootTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.bone,
        tabBarInactiveTintColor: C.inkMuted,

        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.hairline,
          borderTopWidth: 0.5,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },

        tabBarIcon: ({ color, size }) => (
          <View>
            <Ionicons name={ICONS[route.name]} size={size} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />

      <Tab.Screen name="Portfolio" component={PortfolioScreen} />

      <Tab.Screen name="Signals" component={SignalsScreen} />

      <Tab.Screen name="Leaders" component={LeadersScreen} />

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: "You" }}
      />
    </Tab.Navigator>
  );
}
