import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { C } from "../theme/colors";
import StocksStack from "./StocksStack";
import PreIpoScreen from "../screens/PreIpoScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Stocks: "trending-up-outline",
  PreIPO: "rocket-outline",
  Profile: "person-outline",
};

export default function RootTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.ring,
          borderTopWidth: 0.5,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
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
                  backgroundColor: C.accent,
                }}
              />
            )}
          </View>
        ),
      })}
    >
      <Tab.Screen name="Stocks" component={StocksStack} />
      <Tab.Screen
        name="PreIPO"
        component={PreIpoScreen}
        options={{ title: "Pre-IPO" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
