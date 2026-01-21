"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { panels } from "@/lib/schema";

type Panel = typeof panels.$inferSelect;

interface TimelineNavigatorProps {
  panels: Panel[];
  selectedPanelId: string;
  onSelectPanel: (panelId: string) => void;
}

export function TimelineNavigator({
  panels,
  selectedPanelId,
  onSelectPanel,
}: TimelineNavigatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100); // Percentage of panel width
  const timelineRef = useRef<HTMLDivElement>(null);

  // Derive current index from selected panel ID
  const currentIndex = useMemo(
    () => panels.findIndex(p => p.id === selectedPanelId),
    [panels, selectedPanelId]
  );

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentIdx = panels.findIndex(p => p.id === selectedPanelId);
      if (currentIdx === -1 || panels.length === 0) return;
      const next = (currentIdx + 1) % panels.length;
      const nextPanel = panels[next];
      if (nextPanel) onSelectPanel(nextPanel.id);
    }, 2000); // 2 seconds per panel

    return () => clearInterval(interval);
  }, [isPlaying, panels, selectedPanelId, onSelectPanel]);

  const scrollSelectedIntoView = () => {
    if (!timelineRef.current) return;

    const selectedElement = timelineRef.current.querySelector(`[data-panel-id="${selectedPanelId}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  useEffect(() => {
    scrollSelectedIntoView();
  }, [selectedPanelId]);

  const handlePrevious = () => {
    if (panels.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : panels.length - 1;
    const targetPanel = panels[newIndex];
    if (targetPanel) onSelectPanel(targetPanel.id);
  };

  const handleNext = () => {
    if (panels.length === 0) return;
    const newIndex = (currentIndex + 1) % panels.length;
    const targetPanel = panels[newIndex];
    if (targetPanel) onSelectPanel(targetPanel.id);
  };

  const handleFirst = () => {
    const firstPanel = panels[0];
    if (firstPanel) onSelectPanel(firstPanel.id);
  };

  const handleLast = () => {
    const lastPanel = panels[panels.length - 1];
    if (lastPanel) onSelectPanel(lastPanel.id);
  };

  const panelWidth = Math.max(60, zoom); // Minimum 60px width

  return (
    <div className="border-t bg-muted/30">
      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleFirst}
          disabled={currentIndex === 0}
          aria-label="First panel"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handlePrevious}
          aria-label="Previous panel"
        >
          <span className="sr-only">Previous</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="9,0 9,12 2,6" />
          </svg>
        </Button>
        <Button
          size="sm"
          variant={isPlaying ? "default" : "outline"}
          className="h-9 w-9"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleNext}
          aria-label="Next panel"
        >
          <span className="sr-only">Next</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <polygon points="0,0 0,12 7,6" />
          </svg>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleLast}
          disabled={currentIndex === panels.length - 1}
          aria-label="Last panel"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => setZoom((z) => Math.max(60, z - 20))}
          disabled={zoom <= 60}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => setZoom((z) => Math.min(200, z + 20))}
          disabled={zoom >= 200}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-3 w-3" />
        </Button>

        <div className="ml-4 text-sm text-muted-foreground">
          Panel {currentIndex + 1} of {panels.length}
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="relative">
        <div
          ref={timelineRef}
          className="flex items-center gap-1 px-4 py-2 overflow-x-auto"
          style={{ minWidth: "100%" }}
        >
          {panels.map((panel, index) => {
            const isSelected = panel.id === selectedPanelId;
            const isPast = index < currentIndex;
            const isFuture = index > currentIndex;

            return (
              <button
                key={panel.id}
                data-panel-id={panel.id}
                className={cn(
                  "flex-shrink-0 relative rounded overflow-hidden border-2 transition-all",
                  "hover:ring-2 hover:ring-primary/50",
                  isSelected && "ring-2 ring-primary",
                  isPast && "opacity-60",
                  isFuture && "opacity-80"
                )}
                style={{ width: `${panelWidth}px` }}
                onClick={() => onSelectPanel(panel.id)}
                aria-label={`Go to panel ${panel.panelNumber}`}
                aria-selected={isSelected}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={panel.imageUrl}
                  alt={`Panel ${panel.panelNumber}`}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-0.5">
                  {panel.panelNumber}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
