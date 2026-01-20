"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { comics, panels, SpeechBubble } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { SpeechBubbleOverlay } from "./speech-bubble-overlay";

type Comic = typeof comics.$inferSelect;
type Panel = typeof panels.$inferSelect;

export function ComicEditor({ comic }: { comic: Comic & { panels: Panel[] } }) {
  const router = useRouter();
  const [panels, setPanels] = useState(comic.panels);
  const [selectedPanelId, setSelectedPanelId] = useState(panels[0]?.id);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPublic, setIsPublic] = useState(comic.isPublic);

  const selectedPanel = panels.find(p => p.id === selectedPanelId);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/comics/${comic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels }),
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleBubbleEdit = (panelId: string, bubbleId: string, text: string) => {
    setPanels(prev => prev.map(panel => {
      if (panel.id === panelId) {
        return {
          ...panel,
          speechBubbles: panel.speechBubbles?.map(b =>
            b.id === bubbleId ? { ...b, text } : b
          ) || [],
        };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddBubble = () => {
    if (!selectedPanel) return;

    const newBubble: SpeechBubble = {
      id: `bubble-${Date.now()}`,
      text: "New dialogue",
      type: "dialogue",
    };

    const newPosition = {
      bubbleId: newBubble.id,
      x: 30,
      y: 20,
      width: 40,
      height: 15,
    };

    setPanels(prev => prev.map(panel => {
      if (panel.id === selectedPanel.id) {
        return {
          ...panel,
          speechBubbles: [...(panel.speechBubbles || []), newBubble],
          bubblePositions: [...(panel.bubblePositions || []), newPosition],
        };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleTextBoxChange = (value: string) => {
    if (!selectedPanel) return;

    setPanels(prev => prev.map(panel => {
      if (panel.id === selectedPanel.id) {
        return { ...panel, textBox: value };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveBubble = (bubbleId: string) => {
    if (!selectedPanel) return;

    setPanels(prev => prev.map(panel => {
      if (panel.id === selectedPanel.id) {
        return {
          ...panel,
          speechBubbles: (panel.speechBubbles || []).filter(b => b.id !== bubbleId),
          bubblePositions: (panel.bubblePositions || []).filter(p => p.bubbleId !== bubbleId),
        };
      }
      return panel;
    }));
    setHasUnsavedChanges(true);
  };

  const handleRegenerate = async () => {
    if (!selectedPanel) return;

    try {
      await fetch(`/api/comics/${comic.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId: selectedPanel.id,
          preserveBubbles: true,
        }),
      });

      router.refresh();
    } catch (error) {
      console.error("Regenerate failed:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - Panel List */}
      <div className="w-64 border-r p-4 overflow-y-auto bg-muted/20">
        <h2 className="font-semibold mb-4">Panels</h2>
        {panels.map(panel => (
          <button
            key={panel.id}
            onClick={() => setSelectedPanelId(panel.id)}
            className={cn(
              "w-full p-3 mb-2 rounded border text-left transition-all",
              selectedPanelId === panel.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="font-medium">Panel {panel.panelNumber}</div>
            <div className="text-xs text-muted-foreground truncate">
              {panel.textBox?.substring(0, 50)}...
            </div>
          </button>
        ))}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => router.push(`/comics/${comic.id}`)}
        >
          Back to View
        </Button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedPanel && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Panel Preview */}
            <div className="border rounded-lg p-4 bg-card">
              <SpeechBubbleOverlay
                imageUrl={selectedPanel.imageUrl}
                bubbles={selectedPanel.speechBubbles || []}
                positions={selectedPanel.bubblePositions || []}
                editable
                onBubbleEdit={(id, text) => handleBubbleEdit(selectedPanel.id, id, text)}
              />
            </div>

            {/* Text Box Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Box (Scene Description)</label>
              <Textarea
                value={selectedPanel.textBox || ""}
                onChange={(e) => handleTextBoxChange(e.target.value)}
                placeholder="Describe the scene..."
                rows={3}
              />
            </div>

            {/* Speech Bubbles List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Speech Bubbles</label>
                <Button size="sm" onClick={handleAddBubble}>
                  + Add Bubble
                </Button>
              </div>
              {(selectedPanel.speechBubbles || []).map(bubble => (
                <div key={bubble.id} className="flex gap-2 items-start p-3 border rounded">
                  <Input
                    value={bubble.text}
                    onChange={(e) => handleBubbleEdit(selectedPanel.id, bubble.id, e.target.value)}
                    placeholder="Dialogue text..."
                    className="flex-1"
                  />
                  <select
                    value={bubble.type}
                    onChange={(e) => {
                      setPanels(prev => prev.map(panel => {
                        if (panel.id === selectedPanel.id) {
                          return {
                            ...panel,
                            speechBubbles: panel.speechBubbles?.map(b =>
                              b.id === bubble.id ? { ...b, type: e.target.value as any } : b
                            ) || [],
                          };
                        }
                        return panel;
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    className="h-10 px-3 border rounded"
                  >
                    <option value="dialogue">Dialogue</option>
                    <option value="thought">Thought</option>
                    <option value="narration">Narration</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveBubble(bubble.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            {/* Regenerate Button */}
            <Button variant="outline" onClick={handleRegenerate}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Regenerate This Panel
            </Button>
          </div>
        )}
      </div>

      {/* Right Sidebar - Actions */}
      <div className="w-72 border-l p-4 space-y-4">
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || saving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>

        <div className="p-4 bg-muted/50 rounded space-y-3">
          <p className="font-medium">Visibility</p>
          <div className="flex items-center justify-between">
            <span className="text-sm">Public</span>
            <Switch
              checked={isPublic}
              onCheckedChange={async (checked) => {
                const previousValue = isPublic;
                // Optimistically update UI
                setIsPublic(checked);

                try {
                  const response = await fetch(`/api/comics/${comic.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isPublic: checked }),
                  });
                  if (!response.ok) {
                    // Revert on error
                    setIsPublic(previousValue);
                    console.error("Failed to update visibility");
                  }
                } catch (error) {
                  // Revert on error
                  setIsPublic(previousValue);
                  console.error("Failed to update visibility:", error);
                }
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPublic ? "Visible in public gallery" : "Private - only you can see"}
          </p>
        </div>

        <div className="p-4 bg-muted/50 rounded text-sm">
          <p className="font-medium mb-2">Tips:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Click bubbles to edit text</li>
            <li>• Add bubbles for dialogue</li>
            <li>• Regenerate to redo image</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
