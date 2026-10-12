import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { checkDepositStatus, depositSpotToPerp } from "../services/wallet";

export type DepositPhase =
  | "idle"
  | "depositing" 
  | "confirming"
  | "done"
  | "error";

const POLL_INTERVAL_MS = 30_000;
const MAX_POLLS = 10;

export function useSpotToPerpDeposit() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<DepositPhase>("idle");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    },
    [],
  );

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!idToken) return;
    pollCount.current += 1;
    try {
      const res = await checkDepositStatus(idToken);
      const status = res.data?.status;
      if (status === "completed") {
        stopPolling();
        if (!alive.current) return;
        queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
        setPhase("done");
        return;
      }
      if (status === "failed") {
        stopPolling();
        if (!alive.current) return;
        setError("The transfer failed. Try again.");
        setPhase("error");
        return;
      }
      if (pollCount.current >= MAX_POLLS) {
        stopPolling();
        if (!alive.current) return;
        setError("Still processing — this is taking longer than usual.");
        setPhase("error");
      }
    } catch (e) {
      if (pollCount.current >= MAX_POLLS) {
        stopPolling();
        if (!alive.current) return;
        setError(
          e instanceof Error ? e.message : "Couldn't confirm the transfer.",
        );
        setPhase("error");
      }
    }
  }, [idToken, queryClient, stopPolling]);

  const startPolling = useCallback(() => {
    pollCount.current = 0;
    stopPolling();
    pollOnce(); // check once immediately, then every 30s
    pollTimer.current = setInterval(pollOnce, POLL_INTERVAL_MS);
  }, [pollOnce, stopPolling]);

  const deposit = useCallback(
    async (amt: number) => {
      if (!idToken) throw new Error("Sign in first");
      setError(null);
      setAmount(amt);
      setPhase("depositing");
      try {
        await depositSpotToPerp(String(amt), idToken);
        if (!alive.current) return;
        setPhase("confirming");
        startPolling();
      } catch (e) {
        if (!alive.current) return;
        setError(
          e instanceof Error ? e.message : "Couldn't start the transfer.",
        );
        setPhase("error");
        throw e;
      }
    },
    [idToken, startPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    pollCount.current = 0;
    setPhase("idle");
    setAmount(0);
    setError(null);
  }, [stopPolling]);

  return { phase, amount, error, deposit, reset };
}