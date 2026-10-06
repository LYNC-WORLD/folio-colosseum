// "Unlock perps" flow. The backend holds each user's agent key and signs on their
// behalf, so onboarding is just: check whether the backend-held agent is approved,
// and if not, ask the backend to create + confirm one. No client wallet or address
// is involved anywhere in this flow.

import { useCallback, useEffect, useState } from "react";
import { tradeService, unwrap } from "../../services/perps/tradeService";
import { errMsg } from "../../services/hyperliquid/format";
export function usePerpsOnboarding(opts: { idToken?: string | null }) {
  const { idToken } = opts;
  const [agentOk, setAgentOk] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"idle" | "agent" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!idToken) {
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const status = await unwrap(tradeService.getAgentStatus(idToken));
      setAgentOk(!!status?.approved);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setChecking(false);
    }
  }, [idToken]);

  useEffect(() => {
    check();
  }, [check]);

  /** Asks the backend to create + confirm its own agent key. No signature needed. */
  const unlock = useCallback(async () => {
    if (!idToken) throw new Error("Sign in first");
    if (agentOk) {
      setStep("done");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setStep("agent");
      await unwrap(tradeService.createAgent(idToken));
      await unwrap(tradeService.confirmAgent(idToken));
      setAgentOk(true);
      setStep("done");
    } catch (e) {
      setError(errMsg(e));
      setStep("idle");
      throw e;
    } finally {
      setBusy(false);
    }
  }, [idToken, agentOk]);

  return {
    ready: agentOk,
    agentOk,
    checking,
    busy,
    step,
    error,
    unlock,
    recheck: check,
  };
}