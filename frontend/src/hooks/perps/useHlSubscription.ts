import { useEffect, useRef, useState } from "react";
import { hlSocket, subKey, type HlSubscription, type SocketStatus } from "../../services/hyperliquid/ws";

/** Subscribe to a Hyperliquid WebSocket feed for the lifetime of the component. Pass null to skip. */
export function useHlSubscription<T>(sub: HlSubscription | null, onData: (data: T) => void) {
  const cb = useRef(onData);
  cb.current = onData;
  const key = sub ? subKey(sub) : null;

  useEffect(() => {
    if (!sub) return;
    return hlSocket.subscribe(sub, (d: T) => cb.current(d));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** "open" | "connecting" | "closed": use it to dim prices while reconnecting. */
export function useSocketStatus(): SocketStatus {
  const [s, set] = useState<SocketStatus>(hlSocket.status);
  useEffect(() => hlSocket.onStatus(set), []);
  return s;
}
