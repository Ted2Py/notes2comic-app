"use client";

import type { SpeechBubble, BubblePosition } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface SpeechBubbleOverlayProps {
  imageUrl: string;
  bubbles: SpeechBubble[];
  positions: BubblePosition[];
  editable?: boolean;
  onBubbleEdit?: (id: string, text: string) => void;
}

export function SpeechBubbleOverlay({
  imageUrl,
  bubbles,
  positions,
  editable = false,
  onBubbleEdit
}: SpeechBubbleOverlayProps) {
  return (
    <div className="relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Comic panel" className="w-full" />

      {bubbles.map((bubble) => {
        const pos = positions.find(p => p.bubbleId === bubble.id);
        if (!pos) return null;

        return (
          <div
            key={bubble.id}
            className={cn(
              "absolute border-2 border-black bg-white rounded-lg p-3",
              "font-comic text-sm leading-tight shadow-md",
              editable && "cursor-pointer hover:ring-2 hover:ring-primary"
            )}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${pos.width}%`,
              minHeight: `${pos.height}%`,
            }}
            onClick={() => editable && onBubbleEdit?.(bubble.id, bubble.text)}
          >
            {bubble.text}
          </div>
        );
      })}
    </div>
  );
}
