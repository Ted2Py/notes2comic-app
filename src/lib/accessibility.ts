"use client";

import { useEffect, useRef } from "react";

/**
 * Accessibility utilities and React hooks
 */

/**
 * Use live announce for screen reader announcements
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!announceRef.current && typeof document !== "undefined") {
      const liveRegion = document.createElement("div");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.setAttribute("role", "status");
      liveRegion.className = "sr-only";
      liveRegion.style.position = "absolute";
      liveRegion.style.left = "-10000px";
      liveRegion.style.width = "1px";
      liveRegion.style.height = "1px";
      liveRegion.style.overflow = "hidden";
      document.body.appendChild(liveRegion);
      announceRef.current = liveRegion;
    }

    return () => {
      if (announceRef.current && announceRef.current.parentNode) {
        announceRef.current.parentNode.removeChild(announceRef.current);
      }
    };
  }, []);

  const announce = (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = "";
        }
      }, 1000);
    }
  };

  return announce;
}

/**
 * Hook to manage focus trap within a container
 */
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener("keydown", handleTab);
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Generate a unique ID for accessibility purposes
 */
let idCounter = 0;
export function generateId(prefix: string = "id"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Get ARIA attributes for common UI patterns
 */
export function getAriaProps(props: {
  label?: string;
  describedBy?: string;
  expanded?: boolean;
  pressed?: boolean;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
}): Record<string, string | boolean | undefined> {
  const ariaProps: Record<string, string | boolean | undefined> = {};

  if (props.label) {
    ariaProps["aria-label"] = props.label;
  }
  if (props.describedBy) {
    ariaProps["aria-describedby"] = props.describedBy;
  }
  if (props.expanded !== undefined) {
    ariaProps["aria-expanded"] = props.expanded;
  }
  if (props.pressed !== undefined) {
    ariaProps["aria-pressed"] = props.pressed;
  }
  if (props.checked !== undefined) {
    ariaProps["aria-checked"] = props.checked;
  }
  if (props.disabled !== undefined) {
    ariaProps["aria-disabled"] = props.disabled;
  }
  if (props.required !== undefined) {
    ariaProps["aria-required"] = props.required;
  }
  if (props.invalid !== undefined) {
    ariaProps["aria-invalid"] = props.invalid;
  }

  return ariaProps;
}

/**
 * Get role and ARIA attributes for clickable div
 */
export function getClickableProps(options: {
  label?: string;
  disabled?: boolean;
  pressed?: boolean;
  expanded?: boolean;
}): React.HTMLAttributes<HTMLDivElement> {
  return {
    role: "button",
    tabIndex: options.disabled ? -1 : 0,
    "aria-label": options.label,
    "aria-disabled": options.disabled,
    "aria-pressed": options.pressed,
    "aria-expanded": options.expanded,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        (e.currentTarget as HTMLElement).click();
      }
    },
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-contrast: high)").matches;
}

/**
 * Get keyboard navigation props for a list item
 */
export function getListItemProps(index: number, total: number, isSelected: boolean): {
  role: string;
  tabIndex: number;
  "aria-selected": boolean;
  "aria-posinset": number;
  "aria-setsize": number;
} {
  return {
    role: "option",
    tabIndex: isSelected ? 0 : -1,
    "aria-selected": isSelected,
    "aria-posinset": index + 1,
    "aria-setsize": total,
  };
}

/**
 * Get dialog ARIA props
 */
export function getDialogProps(labelId: string, descriptionId?: string): {
  role: string;
  "aria-labelledby": string;
  "aria-describedby": string | undefined;
  "aria-modal": boolean;
} {
  return {
    role: "dialog",
    "aria-labelledby": labelId,
    "aria-describedby": descriptionId,
    "aria-modal": true,
  };
}

/**
 * Announce to screen readers that content has changed
 */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite"): void {
  if (typeof document === "undefined") return;

  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.setAttribute("role", "status");
  announcement.className = "sr-only";
  announcement.style.position = "absolute";
  announcement.style.left = "-10000px";
  announcement.style.width = "1px";
  announcement.style.height = "1px";
  announcement.style.overflow = "hidden";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Validate color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(foreground: string, background: string): number {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1] || "0", 16),
          g: parseInt(result[2] || "0", 16),
          b: parseInt(result[3] || "0", 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return (a[0] || 0) * 0.2126 + (a[1] || 0) * 0.7152 + (a[2] || 0) * 0.0722;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsWCAG_AA(foreground: string, background: string, largeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color contrast meets WCAG AAA standards
 */
export function meetsWCAG_AAA(foreground: string, background: string, largeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}
