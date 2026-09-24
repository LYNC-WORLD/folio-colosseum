import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { C, FONT } from "../theme";
import {
  HomeScreen,
  PreIpoScreen,
  StockDetail,
  StocksScreen,
} from "../screens";

export type HomeStackParamList = {
  HomeMain: undefined;
  Stocks: undefined;
  PreIPO: undefined;
  StockDetail: {
    symbol: string;
    category: "us-stock" | "pre-ipo";
  };
};
const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTintColor: C.bone,
        headerTitleStyle: { fontFamily: FONT.display600, fontSize: 17 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="StockDetail" component={StockDetail} />
      <Stack.Screen
        name="PreIPO"
        component={PreIpoScreen}
        options={{ title: "Pre-IPO" }}
      />
    </Stack.Navigator>
  );
}
