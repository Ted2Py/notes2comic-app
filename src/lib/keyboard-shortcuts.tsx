"use client";

import { useEffect, useCallback } from "react";

export interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

export const SHORTCUTS = {
  // Navigation
  ARROW_LEFT: { key: "ArrowLeft", description: "Previous panel" },
  ARROW_RIGHT: { key: "ArrowRight", description: "Next panel" },
  HOME: { key: "Home", description: "First panel" },
  END: { key: "End", description: "Last panel" },

  // Editing
  CTRL_Z: { key: "z", ctrlKey: true, description: "Undo" },
  CTRL_Y: { key: "y", ctrlKey: true, description: "Redo" },
  CTRL_S: { key: "s", ctrlKey: true, description: "Save" },
  DELETE: { key: "Delete", description: "Delete selected" },
  BACKSPACE: { key: "Backspace", description: "Delete selected" },

  // Tools
  T: { key: "t", description: "Text tool" },
  B: { key: "b", description: "Bubble tool" },
  P: { key: "p", description: "Pen tool" },
  E: { key: "e", description: "Eraser tool" },
  V: { key: "v", description: "Select/Move tool" },

  // View
  EQUALS: { key: "=", description: "Zoom in" },
  MINUS: { key: "-", description: "Zoom out" },
  DIGIT_0: { key: "0", description: "Fit to screen" },
  F: { key: "f", description: "Toggle fullscreen" },

  // Panels
  CTRL_1: { key: "1", ctrlKey: true, description: "Go to panel 1" },
  CTRL_2: { key: "2", ctrlKey: true, description: "Go to panel 2" },
  CTRL_3: { key: "3", ctrlKey: true, description: "Go to panel 3" },
  CTRL_4: { key: "4", ctrlKey: true, description: "Go to panel 4" },
  CTRL_5: { key: "5", ctrlKey: true, description: "Go to panel 5" },
  CTRL_6: { key: "6", ctrlKey: true, description: "Go to panel 6" },
  CTRL_7: { key: "7", ctrlKey: true, description: "Go to panel 7" },
  CTRL_8: { key: "8", ctrlKey: true, description: "Go to panel 8" },
  CTRL_9: { key: "9", ctrlKey: true, description: "Go to panel 9" },
} as const;

export type ShortcutKey = keyof typeof SHORTCUTS;

export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const matchesShift = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.altKey ? event.altKey : !event.altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function getShortcutDisplay(shortcut: ShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) {
    parts.push(navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl");
  }
  if (shortcut.shiftKey) {
    parts.push("Shift");
  }
  if (shortcut.altKey) {
    parts.push("Alt");
  }

  // Format the key nicely
  let key = shortcut.key;
  if (key === "ArrowLeft") key = "←";
  if (key === "ArrowRight") key = "→";
  if (key === "ArrowUp") key = "↑";
  if (key === "ArrowDown") key = "↓";
  if (key === " ") key = "Space";

  parts.push(key);

  return parts.join("+");
}

export function ShortcutHelp({ shortcuts }: { shortcuts: ShortcutConfig[] }) {
  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    const parts = shortcut.description.split(" ");
    const category = parts[0] || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, categoryShortcuts]) => (
        <div key={category}>
          <h4 className="font-medium text-sm mb-2">{category}</h4>
          <div className="space-y-1">
            {categoryShortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">
                  {getShortcutDisplay(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
