import type { panels } from "@/lib/schema";
import { SpeechBubbleOverlay } from "./speech-bubble-overlay";

type Panel = typeof panels.$inferSelect;

interface ComicStripViewProps {
  panels: Panel[];
  outputFormat: "strip" | "separate" | "fullpage";
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
            <SpeechBubbleOverlay
              imageUrl={panel.imageUrl}
              bubbles={panel.speechBubbles || []}
              positions={panel.bubblePositions || []}
            />
            {showCaptions && panel.textBox && (
              <div className="mt-3 p-3 bg-muted/50 rounded text-sm border border-border">
                <div className="font-medium text-xs text-muted-foreground mb-1">
                  Caption:
                </div>
                {panel.textBox}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (outputFormat === "strip") {
    return (
      <div className="flex flex-wrap gap-1 justify-center border-4 border-black p-2 bg-white">
        {sortedPanels.map((panel) => (
          <div key={panel.id} className="relative flex-1 min-w-[200px] border-r-2 border-black last:border-r-0">
            <SpeechBubbleOverlay
              imageUrl={panel.imageUrl}
              bubbles={panel.speechBubbles || []}
              positions={panel.bubblePositions || []}
            />
          </div>
        ))}
      </div>
    );
  }

  // fullpage - grid layout
  return (
    <div className="grid grid-cols-3 gap-1 border-4 border-black p-2 bg-white">
      {sortedPanels.map((panel) => (
        <div key={panel.id} className="relative border border-black">
          <SpeechBubbleOverlay
            imageUrl={panel.imageUrl}
            bubbles={panel.speechBubbles || []}
            positions={panel.bubblePositions || []}
          />
        </div>
      ))}
    </div>
  );
}
