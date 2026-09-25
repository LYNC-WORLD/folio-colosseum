// Bottom tabs: Home · Groups · Folio · Leaderboard · AI Analyst
//
// Route names are unchanged (Home, Portfolio, Signals, Leaders, Profile) so
// every existing navigate("…") call keeps working. "Profile" is still a tab
// route but has no button — it opens from the gear on Folio, like the
// prototype's Account screen, and highlights Folio while open.

import { Easing, View } from "react-native";
import { createBottomTabNavigator, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeadersScreen, PortfolioScreen, SignalsScreen } from "../screens";
import { GroupsScreen } from "../screens/GroupsScreen";
import { IconButton } from "../components/ui/IconButton";
import { GearIcon } from "../components/Icons";

import { HomeStack, type HomeStackParamList } from "./HomeStack";
import { ProfileStack } from "./ProfileStack";
import { TabBar } from "./TabBar";

export type TabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Groups: undefined;
  Portfolio: undefined;
  Signals: undefined;
  Leaders: undefined;
  Profile: undefined;
  UserRecords: {
    initialTab?: "transactions" | "recurring";
  };
};

const Tab = createBottomTabNavigator<TabParamList>();

// Until Step 7 rebuilds Folio, add the prototype's settings gear on top of the
// current Portfolio screen so Account (sign out, etc.) stays reachable.
function FolioTab(props: BottomTabScreenProps<TabParamList, "Portfolio">) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <PortfolioScreen {...(props as any)} />
      <View style={{ position: "absolute", top: insets.top + 10, right: 16 }}>
        <IconButton label="Settings" onPress={() => props.navigation.navigate("Profile")}>
          <GearIcon />
        </IconButton>
      </View>
    </View>
  );
}

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
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Portfolio" component={FolioTab} />
      <Tab.Screen name="Leaders" component={LeadersScreen} />
      <Tab.Screen name="Signals" component={SignalsScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
