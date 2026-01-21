"use client";

import type { panels } from "@/lib/schema";
import { SpeechBubbleOverlay } from "./speech-bubble-overlay";

type Panel = typeof panels.$inferSelect;

interface ComicStripViewProps {
  panels: Panel[];
  outputFormat: "strip" | "separate";
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy";
  showCaptions?: boolean;
}

export function ComicStripView({ panels, outputFormat, borderStyle: _borderStyle, showCaptions }: ComicStripViewProps) {
  const sortedPanels = [...panels].sort((a, b) => a.panelNumber - b.panelNumber);

  if (outputFormat === "separate") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedPanels.map((panel) => (
          <div key={panel.id} className="border rounded-lg p-4 bg-card">
            <div className="text-sm font-medium mb-2">Panel {panel.panelNumber}</div>
            <div className="aspect-square">
              <SpeechBubbleOverlay
                imageUrl={panel.imageUrl}
                bubbles={panel.speechBubbles || []}
                positions={panel.bubblePositions || []}
              />
            </div>
            {showCaptions && panel.textBox && (
              <div className="mt-3 p-3 bg-muted/50 rounded text-sm border border-border">
                <div className="font-medium text-xs text-muted-foreground mb-1">
                  Narrator:
                </div>
                {panel.textBox}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Strip format - responsive grid with proper comic strip borders and footer
  return (
    <div className="w-full bg-white p-4 border-4 border-black rounded">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 w-full">
        {sortedPanels.map((panel) => (
          <div key={panel.id} className="border-r border-b border-black last:border-r-0 aspect-square">
            <SpeechBubbleOverlay
              imageUrl={panel.imageUrl}
              bubbles={panel.speechBubbles || []}
              positions={panel.bubblePositions || []}
            />
          </div>
        ))}
      </div>
      <div className="w-full mt-3 pt-2 border-t-2 border-black text-center">
        <p className="text-sm font-medium text-gray-700">Created by Notes2Comic</p>
      </div>
    </div>
  );
}
