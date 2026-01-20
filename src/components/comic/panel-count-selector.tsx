"use client";

import { cn } from "@/lib/utils";

interface PanelCountSelectorProps {
  value: number;
  suggestedCount?: number;
  onChange: (value: number) => void;
}

export function PanelCountSelector({ value, suggestedCount, onChange }: PanelCountSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Number of Panels</span>
        {suggestedCount && (
          <span className="text-xs text-muted-foreground">
            AI suggests: {suggestedCount}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={cn(
              "py-2 px-3 rounded border text-sm transition-all",
              value === num
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted hover:border-primary/50"
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
