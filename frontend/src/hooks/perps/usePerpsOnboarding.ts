// "Unlock perps" flow for UnlockSheet. Checks and, if needed, runs the two one-time
// signatures from the user's own wallet: approveAgent (our backend agent) and approveBuilderFee.

import { useCallback, useEffect, useState } from "react";
import { BUILDER_ADDRESS, BUILDER_MAX_FEE } from "../../services/hyperliquid/config";
import { errMsg, feePctToTenthBps } from "../../services/hyperliquid/format";
import { hlInfo } from "../../services/hyperliquid/info";
import type { Address } from "../../services/hyperliquid/types";
import { tradeService, unwrap } from "../../services/perps/tradeService";
import { walletService, type UserWallet } from "../../services/perps/walletService";

const REQUIRED_FEE = feePctToTenthBps(BUILDER_MAX_FEE);

export function usePerpsOnboarding(opts: { address?: Address | null; wallet?: UserWallet | null; idToken?: string | null }) {
  const { address, wallet, idToken } = opts;
  const [agentOk, setAgentOk] = useState(false);
  const [builderOk, setBuilderOk] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"idle" | "agent" | "builder" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!address || !idToken) {
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const [agent, fee] = await Promise.all([
        unwrap(tradeService.getAgentStatus(idToken)),
        hlInfo.maxBuilderFee(address, BUILDER_ADDRESS),
      ]);
      setAgentOk(!!agent?.approved);
      setBuilderOk(fee >= REQUIRED_FEE);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setChecking(false);
    }
  }, [address, idToken]);

  useEffect(() => {
    check();
  }, [check]);

  /** Prompts the wallet for up to two signatures. Resolves when trading is ready. */
  const unlock = useCallback(async () => {
    if (!wallet || !idToken) throw new Error("Connect your wallet first");
    setBusy(true);
    setError(null);
    try {
      if (!agentOk) {
        setStep("agent");
        const { agentAddress, agentName } = await unwrap(tradeService.createAgent(idToken));
        await walletService.approveAgent(wallet, agentAddress, agentName);
        await unwrap(tradeService.confirmAgent(idToken));
        setAgentOk(true);
      }
      if (!builderOk) {
        setStep("builder");
        await walletService.approveBuilderFee(wallet);
        setBuilderOk(true);
      }
      setStep("done");
    } catch (e) {
      setError(errMsg(e));
      setStep("idle");
      throw e;
    } finally {
      setBusy(false);
    }
  }, [wallet, idToken, agentOk, builderOk]);

  return { ready: agentOk && builderOk, agentOk, builderOk, checking, busy, step, error, unlock, recheck: check };
}
