"use client";

import { cn } from "@/lib/utils";

interface OutputFormatSelectorProps {
  value: "strip" | "separate";
  onChange: (value: "strip" | "separate") => void;
}

const FORMATS = [
  { id: "strip", label: "Comic Strip", description: "Panels connected with borders" },
  { id: "separate", label: "Separate Panels", description: "Individual standalone images" }
];

export function OutputFormatSelector({ value, onChange }: OutputFormatSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {FORMATS.map((format) => (
        <button
          key={format.id}
          onClick={() => onChange(format.id as any)}
          className={cn(
            "p-4 border-2 rounded-lg text-left transition-all",
            value === format.id
              ? "border-primary bg-primary/10"
              : "border-muted hover:border-primary/50"
          )}
        >
          <div className="font-medium">{format.label}</div>
          <div className="text-sm text-muted-foreground">{format.description}</div>
        </button>
      ))}
    </div>
  );
}
