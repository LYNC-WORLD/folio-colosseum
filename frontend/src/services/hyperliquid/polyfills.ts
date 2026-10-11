// Minimal Event / EventTarget / CustomEvent for React Native.
// The Hyperliquid SDK defines classes that extend these at import time; without them the
// whole app crashes on load with "ReferenceError: Property 'Event' doesn't exist".
// Only installed when the runtime doesn't already provide them.

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any;

if (typeof g.Event === "undefined") {
  g.Event = class Event {
    type: string;
    defaultPrevented = false;
    target: unknown = null;
    currentTarget: unknown = null;
    constructor(type: string, _init?: unknown) {
      this.type = type;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
    stopPropagation() {}
    stopImmediatePropagation() {}
  };
}

if (typeof g.EventTarget === "undefined") {
  type L = { fn: any; once: boolean };
  g.EventTarget = class EventTarget {
    private __l = new Map<string, L[]>();
    addEventListener(type: string, fn: any, opts?: boolean | { once?: boolean; signal?: any }) {
      if (!fn) return;
      const once = typeof opts === "object" && !!opts?.once;
      const list = this.__l.get(type) ?? [];
      if (list.some((x) => x.fn === fn)) return;
      list.push({ fn, once });
      this.__l.set(type, list);
      const signal = typeof opts === "object" ? opts?.signal : undefined;
      signal?.addEventListener?.("abort", () => this.removeEventListener(type, fn), { once: true });
    }
    removeEventListener(type: string, fn: any) {
      const list = this.__l.get(type);
      if (list) this.__l.set(type, list.filter((x) => x.fn !== fn));
    }
    dispatchEvent(event: any): boolean {
      const list = (this.__l.get(event.type) ?? []).slice();
      try {
        event.target = this;
        event.currentTarget = this;
      } catch {}
      for (const l of list) {
        if (l.once) this.removeEventListener(event.type, l.fn);
        try {
          typeof l.fn === "function" ? l.fn.call(this, event) : l.fn.handleEvent?.(event);
        } catch (e) {
          setTimeout(() => {
            throw e;
          });
        }
      }
      return !event.defaultPrevented;
    }
  };
}

if (typeof g.CustomEvent === "undefined") {
  g.CustomEvent = class CustomEvent extends g.Event {
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      super(type, init);
      this.detail = init?.detail ?? null;
    }
  };
}

export {};
