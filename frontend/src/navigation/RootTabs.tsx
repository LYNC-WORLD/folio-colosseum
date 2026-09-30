// Bottom tabs: Home · Groups · Folio · Leaderboard · AI Analyst
//
// Route names are unchanged (Home, Portfolio, Signals, Leaders, Profile) so
// every existing navigate("…") call keeps working. "Profile" is still a tab
// route but has no button — it opens from the gear on Folio, like the
// prototype's Account screen, and highlights Folio while open.

import { Easing } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";

import { PortfolioScreen, SignalsScreen } from "../screens";
import { GroupsStack, type GroupsStackParamList } from "./GroupsStack";

import { HomeStack, type HomeStackParamList } from "./HomeStack";
import { ProfileStack } from "./ProfileStack";
import { LeadersStack, type LeadersStackParamList } from "./LeadersStack";
import { TabBar } from "./TabBar";
import { TradeScreen } from "../screens/TradeScreen";

export type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Groups: NavigatorScreenParams<GroupsStackParamList> | undefined;
  Portfolio: undefined;
  Signals: undefined;
  Leaders: NavigatorScreenParams<LeadersStackParamList> | undefined;
  Profile: undefined;
  Trade: { symbol?: string } | undefined;
  UserRecords: {
    initialTab?: "transactions" | "recurring";
  };
};

const Tab = createBottomTabNavigator<TabParamList>();

export function RootTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        // tab switches crossfade (prototype: 'fade' = opacity .28s linear)
        animation: "fade",
        transitionSpec: {
          animation: "timing",
          config: { duration: 280, easing: Easing.linear },
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Groups" component={GroupsStack} />
      <Tab.Screen name="Trade" component={TradeScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Leaders" component={LeadersStack} />
      <Tab.Screen name="Signals" component={SignalsScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
