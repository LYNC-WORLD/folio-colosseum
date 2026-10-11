import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { usePerps } from "../../data/perpsStore";
import { tradeStyles } from "../../screens/TradeScreen";

export function PerpToast() {
  const { toast: t } = usePerps();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<typeof t>(null);
  useEffect(() => {
    if (!t) return;
    setShown(t);
    const id = setTimeout(() => setShown(null), 2900);
    return () => clearTimeout(id);
  }, [t?.id]); // eslint-disable-line
  if (!shown) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      style={[tradeStyles.toast, { top: insets.top + 10 }]}
    >
      <Text style={tradeStyles.toastT}>{shown.title}</Text>
      {shown.sub ? <Text style={tradeStyles.toastS}>{shown.sub}</Text> : null}
    </Animated.View>
  );
}
