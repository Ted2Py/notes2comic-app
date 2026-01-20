"use client";

import { cn } from "@/lib/utils";

export type PageSize = "a4" | "letter" | "tabloid" | "a3";

interface PageSizeSelectorProps {
  value: PageSize;
  onChange: (value: PageSize) => void;
}

const SIZES = [
  {
    id: "letter" as const,
    label: "Letter (8.5\"x11\")",
    description: "Standard US paper size",
    dimensions: { width: 11, height: 8.5 } // Landscape
  },
  {
    id: "a4" as const,
    label: "A4 (210mm×297mm)",
    description: "Standard international size",
    dimensions: { width: 11.69, height: 8.27 } // Landscape in inches
  },
  {
    id: "tabloid" as const,
    label: "Tabloid (11\"x17\")",
    description: "Larger format for more detail",
    dimensions: { width: 17, height: 11 } // Landscape
  },
  {
    id: "a3" as const,
    label: "A3 (297mm×420mm)",
    description: "Large international format",
    dimensions: { width: 16.54, height: 11.69 } // Landscape in inches
  }
];

export function PageSizeSelector({ value, onChange }: PageSizeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SIZES.map((size) => (
        <button
          key={size.id}
          onClick={() => onChange(size.id)}
          className={cn(
            "p-3 border-2 rounded-lg text-left transition-all",
            value === size.id
              ? "border-primary bg-primary/10"
              : "border-muted hover:border-primary/50"
          )}
        >
          <div className="font-medium text-sm">{size.label}</div>
          <div className="text-xs text-muted-foreground">{size.description}</div>
        </button>
      ))}
    </div>
  );
}
