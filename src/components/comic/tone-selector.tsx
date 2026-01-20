"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ToneSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TONES = [
  { id: "funny", label: "Funny", emoji: "😄" },
  { id: "friendly", label: "Friendly", emoji: "🙂" },
  { id: "serious", label: "Serious", emoji: "📚" },
];

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="flex gap-4">
      {TONES.map((tone) => (
        <motion.div
          key={tone.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1"
        >
          <Button
            variant={value === tone.id ? "default" : "outline"}
            onClick={() => onChange(tone.id)}
            className="w-full"
          >
            <motion.span
              className="mr-2"
              animate={{ rotate: value === tone.id ? [0, -10, 10, -10, 0] : 0 }}
              transition={{ duration: 0.5 }}
            >
              {tone.emoji}
            </motion.span>
            {tone.label}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
