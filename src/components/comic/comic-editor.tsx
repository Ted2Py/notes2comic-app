"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, ArrowLeftToLine, Loader2 } from "lucide-react";
import type { comics, panels } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { SpeechBubbleOverlay } from "./speech-bubble-overlay";
import { PanelNavigator } from "./panel-navigator";
import { PropertiesPanel } from "./properties-panel";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";

type Comic = typeof comics.$inferSelect;
type Panel = typeof panels.$inferSelect;

interface ComicEditorProps {
  comic: Comic & { panels: Panel[] };
}

export function ComicEditor({ comic }: ComicEditorProps) {
  const router = useRouter();
  const [panels, setPanels] = useState<Panel[]>(comic.panels);
  const [selectedPanelId, setSelectedPanelId] = useState(panels[0]?.id ?? "");
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("style");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPublic, setIsPublic] = useState(comic.isPublic);
  const [regenerating, setRegenerating] = useState(false);
  const [addingPanel, setAddingPanel] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState("#ff0000");
  const [brushSize, setBrushSize] = useState(3);
  const [brushSizeForPen, setBrushSizeForPen] = useState(3);
  const [eraserSize, setEraserSize] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [drawingHistory, setDrawingHistory] = useState<Record<string, string[]>>({});

  // Find selected panel
  const selectedPanel = useMemo(
    () => panels.find((p) => p.id === selectedPanelId),
    [panels, selectedPanelId]
  );

  // Reset bubble selection when switching panels
  useEffect(() => {
    setSelectedBubbleId(null);
  }, [selectedPanelId]);

  // Save before switching panels
  const selectPanelWithSave = useCallback(async (panelId: string) => {
    // Small delay to allow blur events to fire and pending changes to propagate
    await new Promise(resolve => setTimeout(resolve, 50));

    // Always save - ensures we capture any pending changes from text edits or drawings
    await handleSave();

    setSelectedPanelId(panelId);
  }, []);

  // Wrapper for onSelectPanel that saves before switching
  const handleSelectPanel = useCallback(async (panelId: string) => {
    await selectPanelWithSave(panelId);
  }, [selectPanelWithSave]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(timer);
  }, [panels, hasUnsavedChanges]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: "ArrowLeft",
        description: "Previous panel",
        action: () => navigatePanel(-1),
      },
      {
        key: "ArrowRight",
        description: "Next panel",
        action: () => navigatePanel(1),
      },
      {
        key: "Home",
        description: "First panel",
        action: async () => {
          const firstPanel = panels[0];
          if (firstPanel) await selectPanelWithSave(firstPanel.id);
        },
      },
      {
        key: "End",
        description: "Last panel",
        action: async () => {
          const lastPanel = panels[panels.length - 1];
          if (lastPanel) await selectPanelWithSave(lastPanel.id);
        },
      },
      {
        key: "s",
        ctrlKey: true,
        description: "Save",
        action: () => handleSave(),
      },
      {
        key: "z",
        ctrlKey: true,
        description: "Undo",
        action: () => handleDrawingUndo(),
      },
    ],
    true
  );

  const navigatePanel = useCallback(async (direction: number) => {
    const currentIndex = panels.findIndex((p) => p.id === selectedPanelId);
    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;
    const targetPanel = panels[newIndex];
    if (newIndex >= 0 && newIndex < panels.length && targetPanel) {
      await selectPanelWithSave(targetPanel.id);
    }
  }, [panels, selectedPanelId, selectPanelWithSave]);

  const handleSave = async (panelsToSave = panels) => {
    setSaving(true);
    try {
      await fetch(`/api/comics/${comic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels: panelsToSave }),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePanelChange = (updatedPanel: Panel) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === updatedPanel.id ? updatedPanel : p))
    );
    setHasUnsavedChanges(true);
  };

  const handleBubbleEdit = (panelId: string, bubbleId: string, text: string) => {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === panelId) {
          return {
            ...panel,
            speechBubbles: panel.speechBubbles?.map((b) =>
              b.id === bubbleId ? { ...b, text } : b
            ) || [],
          };
        }
        return panel;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleBubblePositionChange = (panelId: string, positionId: string, newPosition: { x: number; y: number }) => {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === panelId) {
          return {
            ...panel,
            bubblePositions: panel.bubblePositions?.map((p) =>
              p.bubbleId === positionId ? { ...p, ...newPosition } : p
            ) || [],
          };
        }
        return panel;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleBubbleRotationChange = (panelId: string, positionId: string, rotation: number) => {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === panelId) {
          return {
            ...panel,
            bubblePositions: panel.bubblePositions?.map((p) =>
              p.bubbleId === positionId ? { ...p, rotation } as any : p
            ) || [],
          };
        }
        return panel;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleBubbleSizeChange = (panelId: string, positionId: string, size: { width: number; height: number }) => {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === panelId) {
          return {
            ...panel,
            bubblePositions: panel.bubblePositions?.map((p) =>
              p.bubbleId === positionId ? { ...p, width: size.width, height: size.height } as any : p
            ) || [],
          };
        }
        return panel;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleBubbleDelete = (panelId: string, bubbleId: string) => {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === panelId) {
          return {
            ...panel,
            speechBubbles: panel.speechBubbles?.filter((b) => b.id !== bubbleId) || [],
            bubblePositions: panel.bubblePositions?.filter((p) => p.bubbleId !== bubbleId) || [],
          };
        }
        return panel;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleDrawingStrokeStart = () => {
    // Save current state to history before starting a new stroke
    if (!selectedPanel) return;

    if (selectedPanel.drawingData) {
      setDrawingHistory((prev) => ({
        ...prev,
        [selectedPanel.id]: [...(prev[selectedPanel.id] || []), selectedPanel.drawingData ?? ""],
      }));
    }
  };

  const handleDrawingChange = (panelId: string, drawingData: string | null) => {
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === panelId) {
          return { ...panel, drawingData };
        }
        return panel;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleDrawingUndo = () => {
    if (!selectedPanel) return;

    const panelHistory = drawingHistory[selectedPanel.id];
    if (!panelHistory || panelHistory.length === 0) return;

    // Get the previous state
    const previousState = panelHistory[panelHistory.length - 1];

    // Update panel with previous state
    setPanels((prev) =>
      prev.map((panel) => {
        if (panel.id === selectedPanel.id) {
          return { ...panel, drawingData: previousState ?? null };
        }
        return panel;
      })
    );

    // Remove the used state from history
    setDrawingHistory((prev) => ({
      ...prev,
      [selectedPanel.id]: panelHistory.slice(0, -1),
    }));

    setHasUnsavedChanges(true);
  };

  const handleBubbleSelect = (bubbleId: string | null) => {
    setSelectedBubbleId(bubbleId);
    if (bubbleId) {
      setActiveTab("bubbles");
    }
  };

  const handleIsEraserChange = (newIsEraser: boolean) => {
    if (newIsEraser) {
      // Save current brush size before switching to eraser
      setBrushSizeForPen(brushSize);
      setBrushSize(eraserSize);
    } else {
      // Restore pen brush size when switching back to pen
      setBrushSize(brushSizeForPen);
    }
    setIsEraser(newIsEraser);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if shift key is pressed
    if (!e.shiftKey) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleRegenerate = async (includeContext: boolean = true) => {
    if (!selectedPanel) return;

    setRegenerating(true);
    try {
      const response = await fetch(`/api/comics/${comic.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: selectedPanel.id,
          preserveBubbles: true,
          includeContext,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          setPanels((prev) =>
            prev.map((p) =>
              p.id === selectedPanel.id
                ? { ...p, imageUrl: data.imageUrl, regenerationCount: (p.regenerationCount || 0) + 1 }
                : p
            )
          );
        }
      } else {
        console.error("Regenerate failed:", await response.text());
      }
    } catch (error) {
      console.error("Regenerate failed:", error);
    } finally {
      setRegenerating(false);
    }
  };

  const handleVisibilityChange = async (checked: boolean) => {
    const previousValue = isPublic;
    setIsPublic(checked);

    try {
      const response = await fetch(`/api/comics/${comic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: checked }),
      });
      if (!response.ok) {
        setIsPublic(previousValue);
        console.error("Failed to update visibility");
      }
    } catch (error) {
      setIsPublic(previousValue);
      console.error("Failed to update visibility:", error);
    }
  };

  const handleDuplicatePanel = async (panelId: string) => {
    // Save current changes before duplicating
    if (hasUnsavedChanges) {
      await handleSave();
    }

    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return;

    const newPanel: Panel = {
      ...panel,
      id: `panel-${Date.now()}`,
      panelNumber: panels.length + 1,
      caption: `Copy of ${panel.caption}`,
    };

    const newIndex = panels.findIndex((p) => p.id === panelId) + 1;
    const newPanels = [...panels];
    newPanels.splice(newIndex, 0, newPanel);

    // Renumber panels
    newPanels.forEach((p, i) => (p.panelNumber = i + 1));

    setPanels(newPanels);
    setSelectedPanelId(newPanel.id);
    setHasUnsavedChanges(true);

    // Save immediately with the new panels (passing directly to avoid stale state)
    await handleSave(newPanels);
  };

  const handleDeletePanel = async (panelId: string) => {
    if (panels.length <= 1) return;

    const newPanels = panels.filter((p) => p.id !== panelId);
    // Renumber panels
    newPanels.forEach((p, i) => (p.panelNumber = i + 1));

    setPanels(newPanels);
    if (selectedPanelId === panelId) {
      const firstPanel = newPanels[0];
      if (firstPanel) {
        setSelectedPanelId(firstPanel.id);
      }
    }
    setHasUnsavedChanges(true);

    // Save immediately with the new panels (passing directly to avoid stale state)
    await handleSave(newPanels);
  };

  const handleMovePanelUp = async (panelId: string) => {
    const currentIndex = panels.findIndex((p) => p.id === panelId);
    if (currentIndex <= 0) return;

    const newPanels = [...panels];
    const prevPanel = newPanels[currentIndex - 1];
    const currPanel = newPanels[currentIndex];

    if (prevPanel && currPanel) {
      newPanels[currentIndex - 1] = currPanel;
      newPanels[currentIndex] = prevPanel;
    }

    // Renumber panels
    newPanels.forEach((p, i) => (p.panelNumber = i + 1));

    setPanels(newPanels);
    setHasUnsavedChanges(true);

    // Save immediately with the new panels (passing directly to avoid stale state)
    await handleSave(newPanels);
  };

  const handleMovePanelDown = async (panelId: string) => {
    const currentIndex = panels.findIndex((p) => p.id === panelId);
    if (currentIndex === -1 || currentIndex >= panels.length - 1) return;

    const newPanels = [...panels];
    const currPanel = newPanels[currentIndex];
    const nextPanel = newPanels[currentIndex + 1];

    if (currPanel && nextPanel) {
      newPanels[currentIndex] = nextPanel;
      newPanels[currentIndex + 1] = currPanel;
    }

    // Renumber panels
    newPanels.forEach((p, i) => (p.panelNumber = i + 1));

    setPanels(newPanels);
    setHasUnsavedChanges(true);

    // Save immediately with the new panels (passing directly to avoid stale state)
    await handleSave(newPanels);
  };

  const handleAddPanel = async (prompt: string) => {
    // Save current changes before adding new panel
    if (hasUnsavedChanges) {
      await handleSave();
    }

    setAddingPanel(true);
    try {
      const response = await fetch(`/api/comics/${comic.id}/panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.panel) {
          setPanels((prev) => {
            const newPanels = [...prev, data.panel];
            // Renumber panels sequentially to match the display count
            newPanels.forEach((p, i) => (p.panelNumber = i + 1));
            return newPanels;
          });
          setSelectedPanelId(data.panel.id);
          setHasUnsavedChanges(true);
        }
      } else {
        const error = await response.json();
        console.error("Add panel failed:", error.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error("Add panel failed:", error);
      // You could show a toast notification here
    } finally {
      setAddingPanel(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/comics/${comic.id}`)}
          >
            <ArrowLeftToLine className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{comic.title}</h1>
            <p className="text-xs text-muted-foreground">
              {hasUnsavedChanges && (
                <span className="text-orange-500">Unsaved changes • </span>
              )}
              {panels.length} panel{panels.length !== 1 ? "s" : ""}
              {addingPanel && (
                <span className="ml-2 text-blue-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating new panel...
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/comics/${comic.id}`)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: comic.title,
                  url: `/comics/${comic.id}`,
                });
              } else {
                // Fallback: copy URL to clipboard
                navigator.clipboard.writeText(`${window.location.origin}/comics/${comic.id}`);
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Panel Navigator */}
        <div className="w-64 flex-shrink-0 border-r">
          <PanelNavigator
            panels={panels}
            selectedPanelId={selectedPanelId}
            artStyle={comic.artStyle}
            tone={comic.tone}
            addingPanel={addingPanel}
            {...(comic.characterReference && { characterReference: comic.characterReference })}
            onSelectPanel={handleSelectPanel}
            onDuplicatePanel={handleDuplicatePanel}
            onDeletePanel={handleDeletePanel}
            onAddPanel={handleAddPanel}
            onMovePanelUp={handleMovePanelUp}
            onMovePanelDown={handleMovePanelDown}
          />
        </div>

        {/* Center - Main Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedPanel ? (
            <>
              {/* Selected panel indicator */}
              <div className="text-center py-2 px-4 border-b">
                <span className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">
                  Editing Panel {selectedPanel.panelNumber}
                </span>
              </div>

              {/* Single panel editor */}
              <div className="flex-1 p-4 min-h-0 relative flex items-center justify-center" onWheel={handleWheel}>
                <div
                  className="transition-transform duration-100 ease-out origin-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <div className="border-2 border-primary rounded-lg overflow-hidden shadow-lg aspect-square" style={{ width: "500px" }}>
                    <SpeechBubbleOverlay
                      key={selectedPanel.id}
                      imageUrl={selectedPanel.imageUrl}
                      bubbles={selectedPanel.speechBubbles || []}
                      positions={selectedPanel.bubblePositions || []}
                      panelId={selectedPanel.id}
                      editable={true}
                      drawingMode={drawingMode}
                      drawingData={selectedPanel.drawingData ?? null}
                      drawingColor={drawingColor}
                      brushSize={brushSize}
                      isEraser={isEraser}
                      selectedBubbleId={selectedBubbleId}
                      onBubbleEdit={handleBubbleEdit}
                      onBubblePositionChange={(id, pos) => handleBubblePositionChange(selectedPanel.id, id, pos)}
                      onBubbleSizeChange={(id, size) => handleBubbleSizeChange(selectedPanel.id, id, size)}
                      onBubbleRotationChange={(id, rotation) => handleBubbleRotationChange(selectedPanel.id, id, rotation)}
                      onBubbleDelete={(id) => handleBubbleDelete(selectedPanel.id, id)}
                      onBubbleSelect={handleBubbleSelect}
                      onDrawingChange={(data) => handleDrawingChange(selectedPanel.id, data)}
                      onDrawingStrokeStart={handleDrawingStrokeStart}
                    />
                  </div>
                </div>
                {zoomLevel !== 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium border shadow-lg z-10">
                    {Math.round(zoomLevel * 100)}% - Shift+Scroll to zoom
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No panel selected</p>
            </div>
          )}
        </div>

        {/* Right sidebar - Properties Panel */}
        <div className="w-80 flex-shrink-0 border-l">
          {selectedPanel ? (
            <PropertiesPanel
              panel={selectedPanel}
              comicId={comic.id}
              panels={panels}
              onPanelChange={handlePanelChange}
              onSave={handleSave}
              onRegenerate={handleRegenerate}
              regenerating={regenerating}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={saving}
              isPublic={isPublic}
              onVisibilityChange={handleVisibilityChange}
              drawingMode={drawingMode}
              drawingColor={drawingColor}
              brushSize={brushSize}
              eraserSize={eraserSize}
              isEraser={isEraser}
              onDrawingModeChange={setDrawingMode}
              onDrawingColorChange={setDrawingColor}
              onBrushSizeChange={setBrushSize}
              onEraserSizeChange={setEraserSize}
              onIsEraserChange={handleIsEraserChange}
              onDrawingUndo={handleDrawingUndo}
              canUndo={(drawingHistory[selectedPanel.id]?.length ?? 0) > 0}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              selectedBubbleId={selectedBubbleId}
              onSelectedBubbleChange={setSelectedBubbleId}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No panel selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
