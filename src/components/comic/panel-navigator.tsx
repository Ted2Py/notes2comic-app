"use client";

import { useState, useCallback } from "react";
import { ChevronUp, ChevronDown, Copy, Trash2, Grid, List, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { panels } from "@/lib/schema";
import { AddPanelDialog } from "./add-panel-dialog";

type Panel = typeof panels.$inferSelect;

const MAX_PANELS = 12;

interface PanelNavigatorProps {
  panels: Panel[];
  selectedPanelId: string;
  artStyle: string;
  tone: string;
  addingPanel?: boolean;
  characterReference?: string;
  onSelectPanel: (panelId: string) => void;
  onDuplicatePanel?: (panelId: string) => void;
  onDeletePanel?: (panelId: string) => void;
  onAddPanel?: (prompt: string) => void;
  onMovePanelUp?: (panelId: string) => void;
  onMovePanelDown?: (panelId: string) => void;
}

type ViewMode = "grid" | "strip";

export function PanelNavigator({
  panels,
  selectedPanelId,
  artStyle,
  tone,
  addingPanel = false,
  characterReference,
  onSelectPanel,
  onDuplicatePanel,
  onDeletePanel,
  onAddPanel,
  onMovePanelUp,
  onMovePanelDown,
}: PanelNavigatorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("strip");
  const [hoveredPanelId, setHoveredPanelId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const canAddMore = panels.length < MAX_PANELS;

  const handleAddPanel = useCallback(() => {
    if (canAddMore) {
      setAddDialogOpen(true);
    }
  }, [canAddMore]);

  const handleAddPanelSubmit = useCallback((prompt: string) => {
    onAddPanel?.(prompt);
    setAddDialogOpen(false);
  }, [onAddPanel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, panel: Panel) => {
    const currentIndex = panels.findIndex(p => p.id === panel.id);
    if (currentIndex === -1) return;

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        const prevPanel = panels[currentIndex - 1];
        if (currentIndex > 0 && prevPanel) {
          onSelectPanel(prevPanel.id);
        }
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        const nextPanel = panels[currentIndex + 1];
        if (currentIndex < panels.length - 1 && nextPanel) {
          onSelectPanel(nextPanel.id);
        }
        break;
      case "Delete":
        e.preventDefault();
        onDeletePanel?.(panel.id);
        break;
    }
  }, [panels, onSelectPanel, onDeletePanel]);

  if (viewMode === "grid") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
          <h2 className="font-semibold text-sm">Panels ({panels.length}/{MAX_PANELS})</h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => setViewMode("strip")}
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "outline"}
              className="h-7 px-2"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          <div className="grid grid-cols-2 gap-2">
            {panels.map((panel, index) => (
              <div
                key={panel.id}
                className={cn(
                  "relative group rounded-lg border-2 transition-all cursor-pointer overflow-hidden",
                  selectedPanelId === panel.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => onSelectPanel(panel.id)}
                onMouseEnter={() => setHoveredPanelId(panel.id)}
                onMouseLeave={() => setHoveredPanelId(null)}
                onKeyDown={(e) => handleKeyDown(e, panel)}
                tabIndex={0}
                role="button"
                aria-label={`Panel ${panel.panelNumber}`}
                aria-selected={selectedPanelId === panel.id}
              >
                <div className="relative aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={panel.imageUrl}
                    alt={`Panel ${panel.panelNumber}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                    {panel.panelNumber}
                  </div>

                  {/* Delete button in top right corner */}
                  {onDeletePanel && panels.length > 1 && (
                    <button
                      className="absolute top-1 right-1 h-6 w-6 bg-destructive text-destructive-foreground rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePanel(panel.id);
                      }}
                      title="Delete panel"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Hover actions */}
                {hoveredPanelId === panel.id && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="flex items-center justify-center gap-2 pointer-events-auto">
                    {onMovePanelUp && index > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMovePanelUp(panel.id);
                        }}
                        title="Move panel up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    )}
                    {onMovePanelDown && index < panels.length - 1 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMovePanelDown(panel.id);
                        }}
                        title="Move panel down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    )}
                    {onDuplicatePanel && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePanel(panel.id);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {onAddPanel && (
            <Button
              variant="outline"
              className="w-full mt-3 border-dashed"
              onClick={handleAddPanel}
              disabled={!canAddMore || addingPanel}
            >
              {addingPanel ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Panel
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
        <h2 className="font-semibold text-sm">Panels ({panels.length})</h2>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewMode === "strip" ? "default" : "outline"}
            className="h-7 px-2"
            onClick={() => setViewMode("strip")}
          >
            <List className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {panels.map((panel, index) => (
          <div
            key={panel.id}
            className={cn(
              "w-full p-3 border-b transition-all text-left relative group cursor-pointer",
              selectedPanelId === panel.id
                ? "bg-primary/10 border-l-4 border-l-primary"
                : "hover:bg-muted/50 border-l-4 border-l-transparent"
            )}
            onClick={() => onSelectPanel(panel.id)}
            onMouseEnter={() => setHoveredPanelId(panel.id)}
            onMouseLeave={() => setHoveredPanelId(null)}
            onKeyDown={(e) => handleKeyDown(e, panel)}
            role="button"
            tabIndex={0}
            aria-label={`Panel ${panel.panelNumber}`}
            aria-selected={selectedPanelId === panel.id}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={panel.imageUrl}
                  alt={`Panel ${panel.panelNumber}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Panel {panel.panelNumber}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {panel.textBox || panel.caption || "No description"}
                </div>
              </div>

              {/* Hover actions - positioned to avoid overlap with navigation hints */}
              {hoveredPanelId === panel.id && (
                <div className="flex items-center gap-1.5 opacity-100 transition-opacity flex-shrink-0">
                  {onMovePanelUp && index > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePanelUp(panel.id);
                      }}
                      title="Move panel up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  )}
                  {onMovePanelDown && index < panels.length - 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePanelDown(panel.id);
                      }}
                      title="Move panel down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                  {onDuplicatePanel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicatePanel(panel.id);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {onDeletePanel && panels.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePanel(panel.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Navigation hint - shown on group hover when not directly hovered */}
            <div className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity",
              hoveredPanelId === panel.id ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100 pointer-events-auto"
            )}>
              {(() => {
                const prevPanel = index > 0 ? panels[index - 1] : null;
                if (!prevPanel) return null;
                return (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPanel(prevPanel.id);
                    }}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                );
              })()}
              {(() => {
                const nextPanel = index < panels.length - 1 ? panels[index + 1] : null;
                if (!nextPanel) return null;
                return (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPanel(nextPanel.id);
                    }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                );
              })()}
            </div>
          </div>
        ))}

        {onAddPanel && (
          <div className="p-3 border-b">
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={handleAddPanel}
              disabled={!canAddMore || addingPanel}
            >
              {addingPanel ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Panel
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <AddPanelDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddPanelSubmit}
        currentPanelCount={panels.length}
        maxPanels={MAX_PANELS}
        artStyle={artStyle}
        tone={tone}
        {...(characterReference && { characterReference })}
      />
    </div>
  );
}
