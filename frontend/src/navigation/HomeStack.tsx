import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  HomeScreen,
  PreIpoScreen,
  StockDetail,
  StocksScreen,
} from "../screens";
import { stackOptions } from "./stackOptions";

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
    <Stack.Navigator screenOptions={stackOptions}>
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
