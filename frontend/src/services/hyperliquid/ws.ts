// One shared WebSocket to Hyperliquid for the whole app.
// - Ref-counted subscriptions: many components can listen to the same feed, one server sub.
// - Auto reconnect with backoff, resubscribes everything on reconnect.
// - Ping every 50s (server drops idle sockets after 60s).
// - Closes when the app goes to background, reopens on foreground.

import { AppState, type AppStateStatus } from "react-native";
import { HL } from "./config";

export type HlSubscription = { type: string; [k: string]: unknown };
export type SocketStatus = "idle" | "connecting" | "open" | "closed";
type Listener = (data: any) => void;

// Subscription type -> channel name the server replies on (when different).
const CHANNEL: Record<string, string> = { userEvents: "user" };

const lc = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : v);

/** Does this message belong to this subscription? Server only tags messages by channel. */
function matches(sub: HlSubscription, data: any): boolean {
  switch (sub.type) {
    case "l2Book":
    case "activeAssetCtx":
    case "bbo":
      return data?.coin === sub.coin;
    case "trades":
      return Array.isArray(data) && data[0]?.coin === sub.coin;
    case "candle":
      return data?.s === sub.coin && data?.i === sub.interval;
    case "activeAssetData":
      return data?.coin === sub.coin && lc(data?.user) === lc(sub.user);
    case "allMids":
      return (data?.dex ?? "") === (sub.dex ?? "");
    case "clearinghouseState":
    case "openOrders":
      return lc(data?.user) === lc(sub.user) && (data?.dex ?? "") === (sub.dex ?? "");
    case "userFills":
    case "userFundings":
      return data?.user == null || lc(data.user) === lc(sub.user);
    default:
      return true; // orderUpdates, userEvents, notification: one per user
  }
}

export const subKey = (s: HlSubscription) =>
  JSON.stringify(
    Object.keys(s)
      .sort()
      .map((k) => [k, lc(s[k])]),
  );

class HlSocket {
  private ws: WebSocket | null = null;
  private entries = new Map<string, { sub: HlSubscription; listeners: Set<Listener> }>();
  private retry = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private statusListeners = new Set<(s: SocketStatus) => void>();
  status: SocketStatus = "idle";

  constructor() {
    AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") {
        this.paused = false;
        this.ensure();
      } else if (s === "background") {
        this.paused = true;
        this.teardown();
      }
    });
  }

  /** Returns an unsubscribe function. */
  subscribe(sub: HlSubscription, listener: Listener): () => void {
    const key = subKey(sub);
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { sub, listeners: new Set() };
      this.entries.set(key, entry);
      this.send({ method: "subscribe", subscription: sub }); // no-op if closed; onopen resubscribes
    }
    entry.listeners.add(listener);
    this.ensure();

    return () => {
      const cur = this.entries.get(key);
      if (!cur) return;
      cur.listeners.delete(listener);
      if (cur.listeners.size === 0) {
        this.entries.delete(key);
        this.send({ method: "unsubscribe", subscription: cur.sub });
      }
    };
  }

  onStatus(fn: (s: SocketStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private setStatus(s: SocketStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private ensure() {
    if (this.paused || this.entries.size === 0) return;
    const rs = this.ws?.readyState;
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
    this.connect();
  }

  private connect() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.setStatus("connecting");

    const ws = new WebSocket(HL.ws);
    this.ws = ws;

    ws.onopen = () => {
      this.retry = 0;
      this.setStatus("open");
      this.entries.forEach((e) => this.send({ method: "subscribe", subscription: e.sub }));
      this.pingTimer = setInterval(() => this.send({ method: "ping" }), 50_000);
    };

    ws.onmessage = (ev) => {
      let msg: { channel?: string; data?: unknown };
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      const ch = msg.channel;
      if (!ch || ch === "pong" || ch === "subscriptionResponse") return;
      if (ch === "error") {
        console.warn("[hyperliquid ws]", msg.data);
        return;
      }
      this.entries.forEach((e) => {
        if ((CHANNEL[e.sub.type] ?? e.sub.type) === ch && matches(e.sub, msg.data)) {
          e.listeners.forEach((l) => l(msg.data));
        }
      });
    };

    ws.onerror = () => {}; // onclose always follows

    ws.onclose = () => {
      if (this.ws !== ws) return; // closed on purpose by teardown()
      this.clearPing();
      this.ws = null;
      this.setStatus("closed");
      if (!this.paused && this.entries.size) {
        const delay = Math.min(30_000, 500 * 2 ** this.retry++);
        this.retryTimer = setTimeout(() => this.ensure(), delay);
      }
    };
  }

  private clearPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private teardown() {
    this.clearPing();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const ws = this.ws;
    this.ws = null;
    ws?.close();
    this.setStatus("closed");
  }
}

export const hlSocket = new HlSocket();
