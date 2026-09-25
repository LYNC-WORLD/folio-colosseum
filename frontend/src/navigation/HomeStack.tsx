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

// Every Home screen now draws its own "‹ Back" link, like the prototype.
export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="PreIPO" component={PreIpoScreen} />
      <Stack.Screen name="StockDetail" component={StockDetail} />
    </Stack.Navigator>
  );
}
