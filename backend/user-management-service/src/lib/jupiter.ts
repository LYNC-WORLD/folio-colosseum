import { env } from "../config/env";
import { privy } from "./privy";

const BASE = "https://api.jup.ag";

export type SwapFailureKind =
  | "insufficient_funds"
  | "insufficient_sol"
  | "below_gasless_minimum"
  | "rate_limited"
  | "no_route"
  | "unconfirmed"
  | "failed";

export type SwapResult = {
  succeeded: boolean;
  kind?: SwapFailureKind;
  signature?: string;
  code?: number;
  error?: string;
  inputAmount?: string;
  outputAmount?: string;
  requestId?: string;
  router?: string;
  inAmount?: string;
  outAmount?: string;
};

type OrderResponse = {
  transaction: string | null;
  requestId: string;
  inAmount?: string;
  outAmount?: string;
  router?: string;
  priceImpact?: number;
  errorCode?: number;
  errorMessage?: string;
  error?: string;
};

const MAX_PRICE_IMPACT_PCT = 5;

type ExecuteResponse = {
  status: "Success" | "Failed";
  signature?: string;
  code: number;
  totalInputAmount?: string;
  totalOutputAmount?: string;
  error?: string;
};

const NOT_LANDED_EXECUTE_CODES = new Set([-1, -1000, -1004, -2000, -2003, -2004]);
const UNKNOWN_EXECUTE_CODES = new Set([-1001, -2001]);
const EXECUTE_ATTEMPTS = 3;

export function isRetryable(result: SwapResult) {
  return (
    result.kind === "rate_limited" ||
    (result.code !== undefined && NOT_LANDED_EXECUTE_CODES.has(result.code))
  );
}

export function fromRawAmount(raw: string | undefined, decimals: number) {
  if (!raw) return 0;
  return Number(raw) / 10 ** decimals;
}

async function jupiterFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 5000,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "x-api-key": env.JUPITER_API_KEY!,
      ...init?.headers,
    },
  });
  if (res.status === 429) {
    throw Object.assign(new Error("Rate limited"), {
      kind: "rate_limited" as const,
    });
  }
  if (!res.ok) {
    const raw = await res.text();
    let body: { message?: string; error?: string } = { message: raw };
    try {
      body = raw ? JSON.parse(raw) : body;
    } catch {}
    throw new Error(`HTTP_${res.status}: ${body.message || body.error || "no body"}`);
  }
  return res.json() as Promise<T>;
}

function orderFailureKind(errorCode?: number): SwapFailureKind {
  if (errorCode === 1) return "insufficient_funds";
  if (errorCode === 2) return "insufficient_sol";
  if (errorCode === 3) return "below_gasless_minimum";
  return "no_route";
}

async function fetchOrder(params: Record<string, string>) {
  const get = (p: Record<string, string>) =>
    jupiterFetch<OrderResponse>(
      `/swap/v2/order?${new URLSearchParams(p)}`,
      undefined,
      5000,
    );
  const withoutRfq = { ...params, excludeRouters: "jupiterz" };
  let order: OrderResponse;
  try {
    order = await get(params);
  } catch (error) {
    if (!(error as Error).message?.includes("market maker")) throw error;
    order = await get(withoutRfq);
  }
  if (order.router === "jupiterz" && (order.errorCode === 2 || order.errorCode === 3)) {
    order = await get(withoutRfq);
  }
  if (Number(order.priceImpact) < -MAX_PRICE_IMPACT_PCT) {
    throw new Error(
      `Price impact too high (${Number(order.priceImpact).toFixed(2)}% via ${order.router})`,
    );
  }
  return order;
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
): Promise<SwapResult | undefined> {
  try {
    const order = await fetchOrder({ inputMint, outputMint, amount });
    if (order.error) {
      console.error("Jupiter order error:", order.error);
      return;
    }
    return {
      succeeded: true,
      inAmount: order.inAmount,
      outAmount: order.outAmount,
      requestId: order.requestId,
      router: order.router,
    };
  } catch (error) {
    console.error(error);
    return;
  }
}

async function orderAndSign(
  walletId: string,
  taker: string,
  inputMint: string,
  outputMint: string,
  amount: string,
): Promise<
  | { failure: SwapResult }
  | { order: OrderResponse; signedTransaction: string }
> {
  const order = await fetchOrder({ inputMint, outputMint, amount, taker });

  if (!order.transaction) {
    console.error("Jupiter order not executable:", {
      router: order.router,
      errorCode: order.errorCode,
      errorMessage: order.errorMessage,
      requestId: order.requestId,
    });
    return {
      failure: {
        succeeded: false,
        kind: orderFailureKind(order.errorCode),
        error: order.errorMessage ?? order.error,
        requestId: order.requestId,
        router: order.router,
        code: order.errorCode,
      },
    };
  }

  const signed = await privy.wallets().solana().signTransaction(walletId, {
    transaction: order.transaction,
    authorization_context: {
      authorization_private_keys: [env.PRIVY_AUTH_KEY!],
    },
  });
  return { order, signedTransaction: signed.signed_transaction };
}

export async function swap(
  walletId: string,
  taker: string,
  inputMint: string,
  outputMint: string,
  amount: string,
): Promise<SwapResult> {
  try {
    const prepared = await orderAndSign(
      walletId,
      taker,
      inputMint,
      outputMint,
      amount,
    );
    if ("failure" in prepared) return prepared.failure;
    const { order, signedTransaction } = prepared;

    const executeOnce = () =>
      jupiterFetch<ExecuteResponse>(
        "/swap/v2/execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedTransaction,
            requestId: order.requestId,
          }),
        },
        30000,
      );

    let executed: ExecuteResponse | undefined;
    for (let attempt = 1; attempt <= EXECUTE_ATTEMPTS && !executed; attempt++) {
      try {
        executed = await executeOnce();
      } catch (error) {
        console.error("Jupiter execute network error:", {
          requestId: order.requestId,
          attempt,
          error,
        });
      }
    }
    if (!executed) {
      return {
        succeeded: false,
        kind: "unconfirmed",
        error: "Swap submitted but its result could not be confirmed",
        requestId: order.requestId,
        router: order.router,
      };
    }

    console.log("Jupiter swap:", {
      requestId: order.requestId,
      router: order.router,
      code: executed.code,
      status: executed.status,
      signature: executed.signature,
    });

    if (executed.status === "Success" && executed.code === 0) {
      return {
        succeeded: true,
        signature: executed.signature,
        code: executed.code,
        inputAmount: executed.totalInputAmount,
        outputAmount: executed.totalOutputAmount,
        requestId: order.requestId,
        router: order.router,
      };
    }

    return {
      succeeded: false,
      kind: UNKNOWN_EXECUTE_CODES.has(executed.code) ? "unconfirmed" : "failed",
      signature: executed.signature,
      code: executed.code,
      error: executed.error,
      requestId: order.requestId,
      router: order.router,
    };
  } catch (error: unknown) {
    const err = error as { kind?: SwapFailureKind; message?: string };
    if (err.kind === "rate_limited") {
      return { succeeded: false, kind: "rate_limited", error: err.message };
    }
    console.error(error);
    return {
      succeeded: false,
      kind: "failed",
      error: err.message ?? "swap failed",
    };
  }
}
