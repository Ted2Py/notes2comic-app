"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const STYLES = [
  { id: "retro", label: "Retro", description: "Classic comic book style" },
  { id: "manga", label: "Manga", description: "Japanese manga style" },
  { id: "minimal", label: "Minimal", description: "Clean, simple lines" },
  { id: "pixel", label: "Pixel", description: "Retro pixel art" },
];

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STYLES.map((style) => (
        <motion.div
          key={style.id}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card
            className={`p-4 cursor-pointer transition-colors ${
              value === style.id
                ? "border-primary bg-primary/5 shadow-md shadow-primary/20"
                : "hover:border-primary/50"
            }`}
            onClick={() => onChange(style.id)}
          >
            <div className="text-center">
              <h3 className="font-semibold mb-1">{style.label}</h3>
              <p className="text-xs text-muted-foreground">
                {style.description}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
