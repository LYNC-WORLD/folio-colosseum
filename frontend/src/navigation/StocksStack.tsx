import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { StocksStackParamList } from "./types";
import { StocksScreen } from "../screens/StocksScreen";
import StockDetailScreen from "../screens/StockDetailScreen";

const Stack = createNativeStackNavigator<StocksStackParamList>();

export default function StocksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="StockDetail" component={StockDetailScreen} />
    </Stack.Navigator>
  );
}
