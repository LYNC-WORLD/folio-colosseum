import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GroupsScreen } from "../screens/GroupsScreen";
import { GroupScreen } from "../screens/GroupScreen";
import { stackOptions } from "./stackOptions";

export type GroupsStackParamList = {
  GroupsMain: undefined;
  Group: { id: string };
};

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Screen name="GroupsMain" component={GroupsScreen} />
      <Stack.Screen name="Group" component={GroupScreen} />
    </Stack.Navigator>
  );
}
