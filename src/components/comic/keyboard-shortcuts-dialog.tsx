"use client";

import { useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutItem {
  key: string;
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "← / →", description: "Previous / Next panel" },
      { key: "Home / End", description: "First / Last panel" },
      { key: "Ctrl + 1-9", description: "Jump to panel" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { key: "Ctrl + Z", description: "Undo" },
      { key: "Ctrl + Y", description: "Redo" },
      { key: "Ctrl + S", description: "Save" },
      { key: "Delete", description: "Delete selected" },
    ],
  },
  {
    title: "Tools",
    shortcuts: [
      { key: "V", description: "Select / Move tool" },
      { key: "T", description: "Text tool" },
      { key: "B", description: "Bubble tool" },
      { key: "P", description: "Pen tool" },
      { key: "E", description: "Eraser tool" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { key: "+ / -", description: "Zoom in / out" },
      { key: "0", description: "Fit to screen" },
      { key: "F", description: "Toggle fullscreen" },
      { key: "?", description: "Show this help" },
    ],
  },
];

function formatKey(key: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return key
    .replace("Ctrl", isMac ? "⌘" : "Ctrl")
    .replace("ArrowLeft", "←")
    .replace("ArrowRight", "→")
    .replace("ArrowUp", "↑")
    .replace("ArrowDown", "↓");
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick keyboard commands for faster editing
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 mt-4">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.title}>
              <h4 className="font-semibold text-sm mb-2">{category.title}</h4>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                      {formatKey(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShortcutTriggerButtonProps {
  onClick?: () => void;
}

export function ShortcutTriggerButton({ onClick: _onClick }: ShortcutTriggerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Keyboard className="h-4 w-4" />
        <span className="hidden sm:inline">Shortcuts</span>
      </Button>
      <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
