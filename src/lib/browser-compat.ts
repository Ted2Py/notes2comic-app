"use client";

/**
 * Cross-browser compatibility utilities
 */

/**
 * Get the correct vendor prefix for the current browser
 */
export function getVendorPrefix(): string {
  if (typeof window === "undefined") return "";

  const styles = window.getComputedStyle(document.documentElement, "");
  const match = (Array.prototype.slice
    .call(styles)
    .join("")
    .match(/-(moz|webkit|ms)-/));
  const pre = match ? match[1] : undefined;

  return pre ? `-${pre}-` : "";
}

/**
 * Check if the browser supports a specific CSS property
 */
export function supportsCssProperty(property: string): boolean {
  if (typeof window === "undefined") return false;

  const elem = document.createElement("div");
  const prefixes = ["", "webkit", "moz", "ms", "o"];

  for (const prefix of prefixes) {
    const prop = prefix ? `${prefix}${property}` : property;
    if (prop in (elem.style as unknown as CSSStyleDeclaration)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the browser supports Canvas API
 */
export function supportsCanvas(): boolean {
  if (typeof window === "undefined") return false;

  const elem = document.createElement("canvas");
  return !!(elem.getContext && elem.getContext("2d"));
}

/**
 * Check if the browser supports Pointer Events
 */
export function supportsPointerEvents(): boolean {
  if (typeof window === "undefined") return false;

  return !!(window as unknown as { PointerEvent?: unknown }).PointerEvent;
}

/**
 * Check if the browser supports Touch Events
 */
export function supportsTouchEvents(): boolean {
  if (typeof window === "undefined") return false;

  return "ontouchstart" in window;
}

/**
 * Get safe event type based on browser support
 */
export function getPointerEventType(): "pointer" | "mouse" | "touch" {
  if (supportsPointerEvents()) return "pointer";
  if (supportsTouchEvents()) return "touch";
  return "mouse";
}

/**
 * Normalize pointer/touch/mouse events
 */
export function normalizePointerEvent(
  event: MouseEvent | TouchEvent | PointerEvent
): { x: number; y: number; pressure: number } {
  if ("pointerType" in event) {
    // PointerEvent
    const pe = event as PointerEvent;
    return {
      x: pe.clientX,
      y: pe.clientY,
      pressure: pe.pressure || 0.5,
    };
  }

  if ("touches" in event) {
    // TouchEvent
    const te = event as TouchEvent;
    const touch = te.touches[0] || te.changedTouches[0];
    if (!touch) {
      return { x: 0, y: 0, pressure: 0.5 };
    }
    return {
      x: touch.clientX,
      y: touch.clientY,
      pressure: 0.5,
    };
  }

  // MouseEvent
  const me = event as MouseEvent;
  return {
    x: me.clientX,
    y: me.clientY,
    pressure: 0.5,
  };
}

/**
 * Check if the browser supports passive event listeners
 */
export function supportsPassiveEvents(): boolean {
  if (typeof window === "undefined") return false;

  let supports = false;

  try {
    const options = {
      get passive() {
        supports = true;
        return false;
      },
    };

    window.addEventListener("test", () => {
      // No-op
    }, options);
    window.removeEventListener("test", () => {
      // No-op
    }, options as unknown as boolean);
  } catch (e) {
    // Ignore
  }

  return supports;
}

/**
 * Get event listener options with passive support
 */
export function getPassiveEventListenerOptions(): AddEventListenerOptions {
  return supportsPassiveEvents()
    ? { passive: true }
    : {};
}

/**
 * Check if the browser supports File System Access API
 */
export function supportsFileSystemAccessAPI(): boolean {
  if (typeof window === "undefined") return false;

  return "showSaveFilePicker" in window;
}

/**
 * Check if the browser supports Intersection Observer
 */
export function supportsIntersectionObserver(): boolean {
  if (typeof window === "undefined") return false;

  return "IntersectionObserver" in window;
}

/**
 * Check if the browser supports Resize Observer
 */
export function supportsResizeObserver(): boolean {
  if (typeof window === "undefined") return false;

  return "ResizeObserver" in window;
}

/**
 * Get browser info
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  os: string;
} {
  if (typeof window === "undefined") {
    return { name: "unknown", version: "0", os: "unknown" };
  }

  const ua = navigator.userAgent;
  let name = "unknown";
  let version = "0";
  let os = "unknown";

  // Browser detection
  if (ua.indexOf("Firefox") > -1) {
    name = "Firefox";
    version = ua.match(/Firefox\/([\d.]+)/)?.[1] || "0";
  } else if (ua.indexOf("Chrome") > -1 && ua.indexOf("Edg") === -1) {
    name = "Chrome";
    version = ua.match(/Chrome\/([\d.]+)/)?.[1] || "0";
  } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
    name = "Safari";
    version = ua.match(/Version\/([\d.]+)/)?.[1] || "0";
  } else if (ua.indexOf("Edg") > -1) {
    name = "Edge";
    version = ua.match(/Edg\/([\d.]+)/)?.[1] || "0";
  }

  // OS detection
  if (ua.indexOf("Win") > -1) {
    os = "Windows";
  } else if (ua.indexOf("Mac") > -1) {
    os = "macOS";
  } else if (ua.indexOf("Linux") > -1) {
    os = "Linux";
  } else if (ua.indexOf("Android") > -1) {
    os = "Android";
  } else if (ua.indexOf("iOS") > -1 || ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) {
    os = "iOS";
  }

  return { name, version, os };
}

/**
 * Check if the browser is running on a mobile device
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get the device pixel ratio for high-DPI displays
 */
export function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1;

  return window.devicePixelRatio || 1;
}

/**
 * Request animation frame with fallback
 */
export function requestAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof window === "undefined") return 0;

  if (window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }

  const win = window as unknown as { webkitRequestAnimationFrame?: (cb: FrameRequestCallback) => number };
  if (win.webkitRequestAnimationFrame) {
    return win.webkitRequestAnimationFrame(callback);
  }

  return setTimeout(callback, 16) as unknown as number;
}

/**
 * Cancel animation frame with fallback
 */
export function cancelAnimationFrame(id: number): void {
  if (typeof window === "undefined") return;

  if (window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id);
    return;
  }

  const win = window as unknown as { webkitCancelAnimationFrame?: (id: number) => void };
  if (win.webkitCancelAnimationFrame) {
    win.webkitCancelAnimationFrame(id);
    return;
  }

  clearTimeout(id);
}
