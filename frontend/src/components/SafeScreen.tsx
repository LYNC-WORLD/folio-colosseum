import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { StyleSheet } from "react-native";
import { C } from "../theme";

type ScreenProps = {
  children: React.ReactNode;
  edges?: Edge[];
};

export function SafeScreen({ children, edges = ["top"] }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.container}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
