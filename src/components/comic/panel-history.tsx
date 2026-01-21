"use client";

import { useState, useEffect } from "react";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PanelHistoryEntry {
  id: string;
  versionNumber: number;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

interface PanelHistoryProps {
  comicId: string;
  panelId: string;
  onRestore: (panelData: {
    imageUrl: string;
    caption: string;
    textBox?: string;
    speechBubbles?: any[];
    bubblePositions?: any[];
    detectedTextBoxes?: any[];
    drawingLayers?: any[];
    metadata?: any;
  }) => void;
}

export function PanelHistory({ comicId, panelId, onRestore }: PanelHistoryProps) {
  const [history, setHistory] = useState<PanelHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [comicId, panelId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/comics/${comicId}/panels/${panelId}/history`);
      const data = await response.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to load panel history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (historyId: string) => {
    setRestoring(historyId);
    try {
      const response = await fetch(`/api/comics/${comicId}/panels/${panelId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onRestore(data.panel);
          // Reload history to include the current state that was saved
          await loadHistory();
        }
      }
    } catch (error) {
      console.error("Failed to restore panel:", error);
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium mb-1">No History Yet</h3>
        <p className="text-sm text-muted-foreground">
          Panel history will be saved here when you regenerate or make changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Version History</h3>
        <span className="text-xs text-muted-foreground">{history.length} version(s)</span>
      </div>
      <div className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors",
              restoring === entry.id && "opacity-50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                <img
                  src={entry.imageUrl}
                  alt={`Version ${entry.versionNumber}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium">Version {entry.versionNumber}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => handleRestore(entry.id)}
                    disabled={restoring !== null}
                  >
                    {restoring === entry.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground truncate">{entry.caption}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(entry.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
