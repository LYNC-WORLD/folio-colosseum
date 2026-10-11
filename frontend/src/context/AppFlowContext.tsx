// App-level actions screens can trigger without knowing how App.tsx is wired.
import { createContext, useContext } from "react";

type AppFlow = {
  /** clear the onboarding flag and show the four questions again */
  retakeOnboarding: () => void;
};

export const AppFlowContext = createContext<AppFlow>({
  retakeOnboarding: () => {},
});
export const useAppFlow = () => useContext(AppFlowContext);
