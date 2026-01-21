"use client";

import { useState, useEffect } from "react";
import { Save, Palette, Type, MessageSquare, PenTool, Scan, Loader2, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BubbleToolbar } from "./bubble-toolbar";
import { cn } from "@/lib/utils";
import type { panels, EnhancedSpeechBubble, EnhancedBubblePosition, DetectedTextBox } from "@/lib/schema";

type Panel = typeof panels.$inferSelect;

interface PropertiesPanelProps {
  panel: Panel;
  comicId: string;
  panels: Panel[];
  onPanelChange: (panel: Panel) => void;
  onSave?: () => void;
  onRegenerate?: (includeContext: boolean) => void;
  regenerating?: boolean;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isPublic?: boolean;
  onVisibilityChange?: (isPublic: boolean) => void;
  drawingMode?: boolean;
  drawingColor?: string;
  brushSize?: number;
  eraserSize?: number;
  isEraser?: boolean;
  onDrawingModeChange?: (enabled: boolean) => void;
  onDrawingColorChange?: (color: string) => void;
  onBrushSizeChange?: (size: number) => void;
  onEraserSizeChange?: (size: number) => void;
  onIsEraserChange?: (isEraser: boolean) => void;
  onDrawingUndo?: () => void;
  canUndo?: boolean;
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
  selectedBubbleId?: string | null;
  onSelectedBubbleChange?: (id: string | null) => void;
}

export function PropertiesPanel({
  panel,
  comicId: _comicId,
  panels,
  onPanelChange,
  onSave,
  onRegenerate,
  regenerating,
  hasUnsavedChanges,
  isSaving,
  isPublic,
  onVisibilityChange,
  drawingMode = false,
  drawingColor = "#ff0000",
  brushSize = 3,
  eraserSize = 10,
  isEraser = false,
  onDrawingModeChange,
  onDrawingColorChange,
  onBrushSizeChange,
  onEraserSizeChange,
  onIsEraserChange,
  onDrawingUndo,
  canUndo = false,
  activeTab: externalActiveTab,
  onActiveTabChange,
  selectedBubbleId: externalSelectedBubbleId,
  onSelectedBubbleChange,
}: PropertiesPanelProps) {
  // Use external state if provided, otherwise use local state
  const [localActiveTab, setLocalActiveTab] = useState("style");
  const activeTab = externalActiveTab ?? localActiveTab;
  const setActiveTab = onActiveTabChange ?? setLocalActiveTab;

  const [localSelectedBubbleId, setLocalSelectedBubbleId] = useState<string | null>(null);
  const selectedBubbleId = externalSelectedBubbleId ?? localSelectedBubbleId;
  const setSelectedBubbleId = onSelectedBubbleChange ?? setLocalSelectedBubbleId;

  const [includeContext, setIncludeContext] = useState(true);
  const [detectingText, setDetectingText] = useState(false);
  const [updatingPanel, setUpdatingPanel] = useState(false);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

  // Auto-disable drawing mode when leaving the Draw tab
  useEffect(() => {
    if (activeTab !== "drawing" && drawingMode) {
      onDrawingModeChange?.(false);
    }
  }, [activeTab, drawingMode, onDrawingModeChange]);

  const selectedBubble = panel.speechBubbles?.find(b => b.id === selectedBubbleId);
  const selectedPosition = panel.bubblePositions?.find(p => p.bubbleId === selectedBubbleId);

  const handleBubbleChange = (bubble: EnhancedSpeechBubble) => {
    if (!selectedBubbleId) return;
    onPanelChange({
      ...panel,
      speechBubbles: (panel.speechBubbles || []).map(b =>
        b.id === selectedBubbleId ? bubble : b
      ),
    });
  };

  const handlePositionChange = (position: EnhancedBubblePosition) => {
    if (!selectedBubbleId) return;
    onPanelChange({
      ...panel,
      bubblePositions: (panel.bubblePositions || []).map(p =>
        p.bubbleId === selectedBubbleId ? position : p
      ),
    });
  };

  const handleAddBubble = () => {
    const newBubble: EnhancedSpeechBubble = {
      id: `bubble-${Date.now()}`,
      text: "New dialogue",
      type: "dialogue",
      backgroundColor: "#ffffff",
      borderColor: "#000000",
      borderWidth: 2,
    };

    const newPosition: EnhancedBubblePosition = {
      bubbleId: newBubble.id,
      x: 30,
      y: 20,
      width: 40,
      height: 15,
      tailPosition: "none",
    };

    onPanelChange({
      ...panel,
      speechBubbles: [...(panel.speechBubbles || []), newBubble],
      bubblePositions: [...(panel.bubblePositions || []), newPosition],
    });
    setSelectedBubbleId(newBubble.id);
  };

  const handleRemoveBubble = (bubbleId: string) => {
    onPanelChange({
      ...panel,
      speechBubbles: (panel.speechBubbles || []).filter(b => b.id !== bubbleId),
      bubblePositions: (panel.bubblePositions || []).filter(p => p.bubbleId !== bubbleId),
    });
    if (selectedBubbleId === bubbleId) {
      setSelectedBubbleId(null);
    }
  };

  const handleTextBoxChange = (textBox: string) => {
    onPanelChange({ ...panel, textBox });
  };

  const handleDetectText = async () => {
    setDetectingText(true);
    try {
      const response = await fetch(
        `/api/comics/${_comicId}/panels/${panel.id}/detect-text`,
        { method: "POST" }
      );
      const data = await response.json();
      if (data.success) {
        onPanelChange({ ...panel, detectedTextBoxes: data.textBoxes });
        // Initialize edited texts with detected text
        const initialTexts: Record<string, string> = {};
        data.textBoxes.forEach((box: DetectedTextBox) => {
          initialTexts[box.id] = box.text;
        });
        setEditedTexts(initialTexts);
      }
    } catch (error) {
      console.error("Text detection failed:", error);
    } finally {
      setDetectingText(false);
    }
  };

  const handleTextChange = (boxId: string, newText: string) => {
    setEditedTexts((prev) => ({ ...prev, [boxId]: newText }));
    // Also update the panel's detectedTextBoxes
    const updatedBoxes = (panel.detectedTextBoxes || []).map((box) =>
      box.id === boxId ? { ...box, text: newText } : box
    );
    onPanelChange({ ...panel, detectedTextBoxes: updatedBoxes });
  };

  const handleUpdatePanel = async () => {
    setUpdatingPanel(true);
    try {
      // Create speech bubbles from detected text boxes with edited text
      const newBubbles = (panel.detectedTextBoxes || []).map((box) => ({
        id: `bubble-${box.id}`,
        text: editedTexts[box.id] ?? box.text,
        type: "dialogue" as const,
        backgroundColor: "#ffffff",
        borderColor: "#000000",
        borderWidth: 2,
      }));

      // Create positions for the bubbles based on detected text boxes
      const newPositions = (panel.detectedTextBoxes || []).map((box) => ({
        bubbleId: `bubble-${box.id}`,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        tailPosition: "none" as const,
      }));

      // Update the panel with new speech bubbles (no image regeneration)
      const updatedPanel = {
        ...panel,
        speechBubbles: newBubbles,
        bubblePositions: newPositions,
      };

      onPanelChange(updatedPanel);

      // Optionally trigger save to persist changes
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error("Panel update failed:", error);
    } finally {
      setUpdatingPanel(false);
    }
  };

  const getSelectedBubble = () => {
    if (!selectedBubbleId || !selectedBubble || !selectedPosition) return null;
    return { bubble: selectedBubble, position: selectedPosition };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with save button */}
      <div className="p-4 border-b space-y-3 flex-shrink-0">
        <Button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>

        {onVisibilityChange && (
          <div className="p-3 bg-muted/50 rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Public</span>
              <Switch
                checked={isPublic || false}
                onCheckedChange={onVisibilityChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPublic ? "Visible in public gallery" : "Private - only you can see"}
            </p>
          </div>
        )}
      </div>

      {/* Tabbed content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4 flex-shrink-0">
            <TabsList className="grid grid-cols-4 w-full h-auto">
              <TabsTrigger value="style" className="flex-col gap-1 h-auto py-2 px-1">
                <Palette className="h-4 w-4" />
                <span className="text-[10px] leading-none">Style</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-col gap-1 h-auto py-2 px-1">
                <Type className="h-4 w-4" />
                <span className="text-[10px] leading-none">Text</span>
              </TabsTrigger>
              <TabsTrigger value="bubbles" className="flex-col gap-1 h-auto py-2 px-1">
                <MessageSquare className="h-4 w-4" />
                <span className="text-[10px] leading-none">Bubbles</span>
              </TabsTrigger>
              <TabsTrigger value="drawing" className="flex-col gap-1 h-auto py-2 px-1">
                <PenTool className="h-4 w-4" />
                <span className="text-[10px] leading-none">Draw</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="scene-description">Scene Description</Label>
                <Textarea
                  id="scene-description"
                  value={panel.textBox || ""}
                  onChange={(e) => handleTextBoxChange(e.target.value)}
                  placeholder="Describe the scene..."
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(panel.textBox || "").length} / 500 characters
                </p>
              </div>

              <div>
                <Label>Panel Number</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {panel.panelNumber} of {panels.length}
                </p>
              </div>

              {onRegenerate && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="include-context"
                      checked={includeContext}
                      onCheckedChange={setIncludeContext}
                    />
                    <Label htmlFor="include-context" className="text-sm cursor-pointer">
                      Include adjacent panel context
                    </Label>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onRegenerate(includeContext)}
                    disabled={regenerating}
                  >
                    {regenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Panel"
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Detected Text Boxes</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDetectText}
                  disabled={detectingText}
                >
                  {detectingText ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Detect Text
                    </>
                  )}
                </Button>
              </div>
              {(panel.detectedTextBoxes || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No text boxes detected yet. Click "Detect Text" to scan the panel.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Edit the text below, then click "Update Text Overlay" to update the speech bubbles without regenerating the image.
                  </p>
                  {(panel.detectedTextBoxes || []).map((box, index) => (
                    <div
                      key={box.id}
                      className="p-3 border rounded bg-card space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Text Box {index + 1}</Label>
                        <span className="text-xs text-muted-foreground">
                          Confidence: {Math.round(box.confidence * 100)}%
                        </span>
                      </div>
                      <Textarea
                        value={editedTexts[box.id] ?? box.text}
                        onChange={(e) => handleTextChange(box.id, e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  ))}
                  <Button
                    className="w-full"
                    onClick={handleUpdatePanel}
                    disabled={updatingPanel || (panel.detectedTextBoxes || []).length === 0}
                  >
                    {updatingPanel ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Type className="h-4 w-4 mr-2" />
                        Update Text Overlay
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Bubbles Tab */}
            <TabsContent value="bubbles" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Speech Bubbles</h3>
                <Button size="sm" onClick={handleAddBubble}>
                  + Add Bubble
                </Button>
              </div>

              {selectedBubbleId && getSelectedBubble() ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm font-medium">Edit Bubble</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedBubbleId(null)}
                    >
                      Done
                    </Button>
                  </div>
                  <BubbleToolbar
                    bubble={getSelectedBubble()!.bubble}
                    position={getSelectedBubble()!.position}
                    onBubbleChange={handleBubbleChange}
                    onPositionChange={handlePositionChange}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {(panel.speechBubbles || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No speech bubbles yet. Click "Add Bubble" to create one.
                    </p>
                  ) : (
                    (panel.speechBubbles || []).map((bubble) => (
                      <div
                        key={bubble.id}
                        className={cn(
                          "p-3 border rounded hover:bg-muted/50 transition-colors cursor-pointer",
                          selectedBubbleId === bubble.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setSelectedBubbleId(bubble.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{bubble.text}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {bubble.type}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBubble(bubble.id);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            {/* Drawing Tab */}
            <TabsContent value="drawing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="text-center py-4">
                  <PenTool className={cn(
                    "h-12 w-12 mx-auto mb-3 transition-colors",
                    drawingMode ? "text-primary" : "text-muted-foreground"
                  )} />
                  <h3 className="font-medium mb-1">Drawing Mode</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {drawingMode ? "Drawing is enabled" : "Click to enable freehand drawing"}
                  </p>
                  <Button
                    variant={drawingMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => onDrawingModeChange?.(!drawingMode)}
                  >
                    {drawingMode ? "Disable Drawing" : "Enable Drawing"}
                  </Button>
                </div>

                {drawingMode && (
                  <>
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex gap-2">
                        <Button
                          variant={!isEraser ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => onIsEraserChange?.(false)}
                        >
                          ✏️ Pen
                        </Button>
                        <Button
                          variant={isEraser ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => onIsEraserChange?.(true)}
                        >
                          🧽 Eraser
                        </Button>
                      </div>

                      <div>
                        <Label>{isEraser ? "Eraser Size" : "Brush Size"}: {isEraser ? eraserSize : brushSize}px</Label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={isEraser ? eraserSize : brushSize}
                          onChange={(e) => {
                            const size = Number(e.target.value);
                            if (isEraser) {
                              onEraserSizeChange?.(size);
                            } else {
                              onBrushSizeChange?.(size);
                            }
                          }}
                          className="w-full mt-2"
                        />
                      </div>

                      {!isEraser && (
                        <div>
                          <Label>Brush Color</Label>
                          <div className="flex gap-2 mt-2">
                            {["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#000000", "#ffffff"].map((color) => (
                              <button
                                key={color}
                                className={cn(
                                  "w-8 h-8 rounded border-2 transition-all",
                                  drawingColor === color ? "border-primary scale-110" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => onDrawingColorChange?.(color)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={onDrawingUndo}
                          disabled={!canUndo}
                        >
                          <Undo className="h-4 w-4 mr-1" />
                          Undo
                        </Button>
                        {panel.drawingData && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              onPanelChange({ ...panel, drawingData: null });
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
