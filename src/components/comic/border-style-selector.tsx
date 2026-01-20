"use client";

import { Card } from "@/components/ui/card";

interface BorderStyleSelectorProps {
  value: "straight" | "jagged" | "zigzag" | "wavy";
  onChange: (value: "straight" | "jagged" | "zigzag" | "wavy") => void;
}

const BORDER_STYLES = [
  { id: "straight", label: "Straight", description: "Clean straight borders" },
  { id: "jagged", label: "Jagged", description: "Rough torn paper edges" },
  { id: "zigzag", label: "Zigzag", description: "Angular zigzag pattern" },
  { id: "wavy", label: "Wavy", description: "Flowing wavy borders" },
];

export function BorderStyleSelector({ value, onChange }: BorderStyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {BORDER_STYLES.map((style) => (
        <Card
          key={style.id}
          className={`p-3 cursor-pointer transition-all ${
            value === style.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
          }`}
          onClick={() => onChange(style.id as any)}
        >
          <div className="text-center">
            <div className="font-medium text-sm">{style.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
