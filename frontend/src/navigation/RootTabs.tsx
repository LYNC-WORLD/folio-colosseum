import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { C } from "../theme";
import {
  LeadersScreen,
  PortfolioScreen,
  ProfileScreen,
  SignalsScreen,
} from "../screens";
import { HomeStack, HomeStackParamList } from "./HomeStack";
export type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Portfolio: undefined;
  Signals: undefined;
  Leaders: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Portfolio: "pie-chart-outline",
  Signals: "pulse-outline",
  Leaders: "podium-outline",
  Profile: "person-outline",
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size, focused }) => (
          <View>
            <Ionicons
              name={ICONS[route.name as keyof TabParamList]}
              size={size}
              color={color}
            />
            {focused && (
              <View
                style={{
                  position: "absolute",
                  bottom: -8,
                  alignSelf: "center",
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: C.bone,
                }}
              />
            )}
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
        component={ProfileScreen}
        options={{ tabBarLabel: "You" }}
      />
    </Tab.Navigator>
  );
}
