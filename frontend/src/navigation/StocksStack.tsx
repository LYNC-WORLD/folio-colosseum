import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { StocksStackParamList } from "./types";
import { StockDetail, StocksScreen } from "../screens";

const Stack = createNativeStackNavigator<StocksStackParamList>();

export default function StocksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="StockDetail" component={StockDetail} />
    </Stack.Navigator>
  );
}
