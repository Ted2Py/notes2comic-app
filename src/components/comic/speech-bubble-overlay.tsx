"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { SpeechBubble, BubblePosition, EnhancedSpeechBubble, EnhancedBubblePosition } from "@/lib/schema";
import { cn } from "@/lib/utils";

interface SpeechBubbleOverlayProps {
  imageUrl: string;
  bubbles: (SpeechBubble | EnhancedSpeechBubble)[];
  positions: (BubblePosition | EnhancedBubblePosition)[];
  panelId?: string;
  editable?: boolean;
  drawingMode?: boolean;
  drawingData?: string | null;
  drawingColor?: string;
  brushSize?: number;
  isEraser?: boolean;
  selectedBubbleId?: string | null;
  onBubbleEdit?: (panelId: string, bubbleId: string, text: string) => void;
  onBubblePositionChange?: (id: string, position: { x: number; y: number }) => void;
  onBubbleSizeChange?: (id: string, size: { width: number; height: number }) => void;
  onBubbleRotationChange?: (id: string, rotation: number) => void;
  onBubbleDelete?: (id: string) => void;
  onBubbleSelect?: (id: string | null) => void;
  onDrawingChange?: (data: string | null) => void;
  onDrawingStrokeStart?: () => void;
}

// Helper to check if a bubble is enhanced
function isEnhancedBubble(bubble: SpeechBubble | EnhancedSpeechBubble): bubble is EnhancedSpeechBubble {
  return "backgroundColor" in bubble && bubble.backgroundColor !== undefined;
}

// Helper to check if a position is enhanced
function isEnhancedPosition(position: BubblePosition | EnhancedBubblePosition): position is EnhancedBubblePosition {
  return "rotation" in position && position.rotation !== undefined;
}

// Clamp position to keep bubbles within bounds
function clampPosition(pos: BubblePosition | EnhancedBubblePosition): BubblePosition | EnhancedBubblePosition {
  // Ensure width/height don't exceed 90% of container
  const clampedWidth = Math.min(pos.width, 90);
  const clampedHeight = Math.min(pos.height || 20, 90);

  // Calculate max position so bubble stays within container
  const maxX = 100 - clampedWidth;
  const maxY = 100 - clampedHeight;

  return {
    ...pos,
    x: Math.max(0, Math.min(pos.x, maxX)),
    y: Math.max(0, Math.min(pos.y, maxY)),
    width: clampedWidth,
    height: clampedHeight,
  };
}

// Get tail CSS based on bubble type (automatic)
function getTailStyle(pos: BubblePosition | EnhancedBubblePosition, bubble: SpeechBubble | EnhancedSpeechBubble) {
  // Determine bubble type
  const bubbleType = isEnhancedBubble(bubble) ? (bubble.type || "dialogue") : "dialogue";

  // Only dialogue-type bubbles get tails
  // dialogue, shout, whisper get tails
  // thought, whisper-thought, narration, box, rounded-box don't get tails
  const bubblesWithTails = ["dialogue", "shout", "whisper"];
  if (!bubblesWithTails.includes(bubbleType)) {
    return null;
  }

  // Fixed tail size in pixels (50px = 10% of 500px reference width)
  const tailLengthPx = 50;

  // Bubble position and size (in percentages of panel)
  const bubbleX = pos.x;
  const bubbleY = pos.y;
  const bubbleW = pos.width;
  const bubbleH = pos.height || 20;

  // Get the border color for the tail
  const borderColor = isEnhancedBubble(bubble) ? (bubble.borderColor || "#000000") : "#000000";

  // Base styles for the tail
  const base: React.CSSProperties = {
    position: "absolute",
    width: "0",
    height: "0",
  };

  // Helper to create triangle borders
  const createTriangle = (
    primarySide: "top" | "bottom" | "left" | "right",
    color: string
  ): React.CSSProperties => {
    const sizes: Record<string, string> = {
      borderTopWidth: primarySide === "top" ? `${tailLengthPx}px` : `${tailLengthPx / 2}px`,
      borderBottomWidth: primarySide === "bottom" ? `${tailLengthPx}px` : `${tailLengthPx / 2}px`,
      borderLeftWidth: primarySide === "left" ? `${tailLengthPx}px` : `${tailLengthPx / 2}px`,
      borderRightWidth: primarySide === "right" ? `${tailLengthPx}px` : `${tailLengthPx / 2}px`,
      borderTopStyle: "solid",
      borderBottomStyle: "solid",
      borderLeftStyle: "solid",
      borderRightStyle: "solid",
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
    };
    sizes[`${primarySide}Color`] = color;
    return sizes;
  };

  // Return tail style - always point down from bottom-center for dialogue bubbles
  return {
    ...base,
    left: `calc(${bubbleX + bubbleW / 2}% - ${tailLengthPx / 2}px)`,
    top: `calc(${bubbleY + bubbleH}%)`,
    ...createTriangle("top", borderColor),
  };
}

// Draggable bubble component
function DraggableBubble({
  bubble,
  position,
  getBubbleClass,
  getBubbleStyle,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
  isSelected,
  onRotationChange,
  onSizeChange,
}: {
  bubble: SpeechBubble | EnhancedSpeechBubble;
  position: BubblePosition | EnhancedBubblePosition;
  getBubbleClass: (bubble: SpeechBubble | EnhancedSpeechBubble) => string;
  getBubbleStyle: (bubble: SpeechBubble | EnhancedSpeechBubble, pos: BubblePosition | EnhancedBubblePosition) => React.CSSProperties;
  onDragStart: (e: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onClick: (text?: string) => void;
  isSelected: boolean;
  onRotationChange?: (rotation: number) => void;
  onSizeChange?: (x: number, y: number, width: number, height: number) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const rotation = isEnhancedPosition(position) ? position.rotation || 0 : 0;

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Text editing state
  const [isEditing, setIsEditing] = useState(false);

  // Use key pattern: reset edited text when bubble.id or bubble.text changes
  // The component will re-render with new props, and editedText resets on blur
  const [editedText, setEditedText] = useState(bubble.text);

  // Auto-focus and select text when editing starts
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const handleTextClick = (e: React.MouseEvent) => {
    // Only handle click if not editing - when editing, let the text handle cursor positioning
    if (!isEditing) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    // Double click enables editing
    e.stopPropagation();
    if (isSelected && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (editedText !== bubble.text) {
      onClick(editedText); // Trigger the edit callback with edited text
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditedText(bubble.text);
      textRef.current?.blur();
    }
  };

  const getResizeCursor = (direction: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'): string => {
    const cursors: Record<string, string> = {
      'nw': 'nwse-resize',
      'n': 'ns-resize',
      'ne': 'nesw-resize',
      'e': 'ew-resize',
      'se': 'nwse-resize',
      's': 'ns-resize',
      'sw': 'nesw-resize',
      'w': 'ew-resize',
    };
    return cursors[direction] ?? 'move';
  };

  const handleResizeStart = (direction: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w', e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height || 20,
      posX: position.x,
      posY: position.y,
    });
    onClick();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing || !resizeDirection || !bubbleRef.current?.parentElement) return;

    const container = bubbleRef.current.parentElement;
    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;

    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newX = resizeStart.posX;
    let newY = resizeStart.posY;
    const minSize = 5;
    const maxSize = 90;

    // Handle each direction
    if (resizeDirection.includes('e')) {
      newWidth = Math.min(maxSize, Math.max(minSize, resizeStart.width + deltaX));
    }
    if (resizeDirection.includes('w')) {
      newWidth = Math.min(maxSize, Math.max(minSize, resizeStart.width - deltaX));
      newX = resizeStart.posX + (resizeStart.width - newWidth);
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.min(maxSize, Math.max(minSize, (resizeStart.height || 20) + deltaY));
    }
    if (resizeDirection.includes('n')) {
      newHeight = Math.min(maxSize, Math.max(minSize, (resizeStart.height || 20) - deltaY));
      newY = resizeStart.posY + ((resizeStart.height || 20) - newHeight);
    }

    // Clamp position to keep bubble within container
    newX = Math.max(0, Math.min(100 - newWidth, newX));
    newY = Math.max(0, Math.min(100 - newHeight, newY));

    // Call the size change callback
    onSizeChange?.(newX, newY, newWidth, newHeight);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeDirection(null);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).classList.contains("resize-handle")) return;
    if (isEditing) return;
    onDragStart(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isResizing) {
      handleResizeMove(e);
      return;
    }
    if (!isEditing) {
      onDragMove(e);
    }
  };

  const handlePointerUp = () => {
    onDragEnd();
    handleResizeEnd();
  };

  return (
    <div
      ref={bubbleRef}
      className={cn(getBubbleClass(bubble), "cursor-move select-none touch-none group pointer-events-auto")}
      style={getBubbleStyle(bubble, position)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* ContentEditable text */}
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          "block outline-none min-h-[1em]",
          isEditing && "cursor-text select-text",
          !isEditing && "pointer-events-auto select-none"
        )}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
        onClick={handleTextClick}
        onDoubleClick={handleTextDoubleClick}
        onBlur={handleTextBlur}
        onKeyDown={handleTextKeyDown}
        onInput={(e) => setEditedText(e.currentTarget.textContent || "")}
      >
        {bubble.text}
      </div>

      {isSelected && (
        <>
          <div className="absolute inset-0 ring-2 ring-primary pointer-events-none rounded" />
          {/* Small rotation input - appears above bubble when selected */}
          {onRotationChange && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded shadow-lg p-1 pointer-events-auto">
              <span className="text-[10px] text-muted-foreground">°</span>
              <input
                type="number"
                min="-180"
                max="180"
                value={rotation}
                onChange={(e) => onRotationChange(Number(e.target.value))}
                className="w-12 h-5 px-1 text-xs border-0 bg-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          {/* 8 Resize Handles */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner handles */}
            <div
              className="resize-handle absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('nw') }}
              onPointerDown={(e) => handleResizeStart('nw', e)}
            />
            <div
              className="resize-handle absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('ne') }}
              onPointerDown={(e) => handleResizeStart('ne', e)}
            />
            <div
              className="resize-handle absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('sw') }}
              onPointerDown={(e) => handleResizeStart('sw', e)}
            />
            <div
              className="resize-handle absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('se') }}
              onPointerDown={(e) => handleResizeStart('se', e)}
            />
            {/* Edge handles */}
            <div
              className="resize-handle absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('n') }}
              onPointerDown={(e) => handleResizeStart('n', e)}
            />
            <div
              className="resize-handle absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('s') }}
              onPointerDown={(e) => handleResizeStart('s', e)}
            />
            <div
              className="resize-handle absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('w') }}
              onPointerDown={(e) => handleResizeStart('w', e)}
            />
            <div
              className="resize-handle absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-primary rounded-full pointer-events-auto z-10"
              style={{ cursor: getResizeCursor('e') }}
              onPointerDown={(e) => handleResizeStart('e', e)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function SpeechBubbleOverlay({
  imageUrl,
  bubbles,
  positions,
  panelId,
  editable = false,
  drawingMode = false,
  drawingData,
  drawingColor = "#ff0000",
  brushSize = 3,
  isEraser = false,
  selectedBubbleId: externalSelectedBubbleId,
  onBubbleEdit,
  onBubblePositionChange,
  onBubbleSizeChange,
  onBubbleRotationChange,
  onBubbleDelete,
  onBubbleSelect,
  onDrawingChange,
  onDrawingStrokeStart,
}: SpeechBubbleOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasInitializedRef = useRef(false);
  const [dragState, setDragState] = useState<{
    bubbleId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({ bubbleId: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  // Use external selection state if provided, otherwise use local state
  const [localSelectedBubbleId, setLocalSelectedBubbleId] = useState<string | null>(null);
  const selectedBubbleId = externalSelectedBubbleId ?? localSelectedBubbleId;
  const setSelectedBubbleId = onBubbleSelect ?? setLocalSelectedBubbleId;
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  const getBubbleClass = useCallback((bubble: SpeechBubble | EnhancedSpeechBubble) => {
    const classes = [
      "absolute border-2 p-3 font-comic text-sm leading-tight shadow-md",
      "overflow-hidden",
    ];

    // Add hover ring for discoverability
    if (editable) {
      classes.push("hover:ring-2 hover:ring-primary/50");
    }

    // Add shape-specific classes
    const bubbleType = isEnhancedBubble(bubble) && bubble.type ? bubble.type : "dialogue";

    switch (bubbleType) {
      case "thought":
        classes.push("rounded-full border-dashed");
        break;
      case "shout":
        // clip-path will be applied via inline style
        break;
      case "whisper":
        classes.push("rounded-lg border-dashed");
        break;
      case "box":
        classes.push("rounded-none");
        break;
      case "rounded-box":
        classes.push("rounded-2xl");
        break;
      case "whisper-thought":
        classes.push("rounded-[60%_40%_30%_70%/_60%_30%_70%_40%] border-dashed");
        break;
      default:
        classes.push("rounded-lg");
    }

    return cn(classes);
  }, [editable]);

  const getBubbleStyle = useCallback((
    bubble: SpeechBubble | EnhancedSpeechBubble,
    pos: BubblePosition | EnhancedBubblePosition
  ) => {
    // Clamp position to keep bubbles within bounds
    const clampedPos = clampPosition(pos);

    const bubbleType = isEnhancedBubble(bubble) && bubble.type ? bubble.type : "dialogue";

    const style: React.CSSProperties = {
      left: `${clampedPos.x}%`,
      top: `${clampedPos.y}%`,
      width: `${clampedPos.width}%`,
      // When height is set, use it as a fixed height. Otherwise let it auto-size.
      minHeight: '3em', // Minimum height to prevent collapse
      height: clampedPos.height ? `${clampedPos.height}%` : 'auto',
      maxHeight: clampedPos.height ? undefined : '50%', // Only limit max when auto-sizing
      maxWidth: "90%",
      wordWrap: "break-word",
      overflowWrap: "break-word",
      hyphens: "auto",
      boxSizing: "border-box",
      // Allow text to wrap and expand naturally
      display: "inline-block",
      whiteSpace: "pre-wrap",
    };

    if (isEnhancedBubble(bubble)) {
      style.backgroundColor = bubble.backgroundColor || "#ffffff";
      style.borderColor = bubble.borderColor || "#000000";
      style.borderWidth = `${bubble.borderWidth || 2}px`;
      style.color = bubble.textColor || "#000000";
      style.fontFamily = bubble.fontFamily || "Comic Sans MS";
      style.fontSize = `${Math.min(bubble.fontSize || 16, 24)}px`;
      style.fontWeight = bubble.fontWeight || "normal";

      // Add clip-path for shout type (jagged/starburst edge)
      if (bubbleType === "shout") {
        style.clipPath = "polygon(0% 0%, 100% 0%, 95% 10%, 100% 20%, 90% 30%, 100% 40%, 85% 50%, 100% 60%, 90% 70%, 100% 80%, 95% 90%, 100% 100%, 0% 100%, 5% 90%, 0% 80%, 10% 70%, 0% 60%, 15% 50%, 0% 40%, 10% 30%, 0% 20%, 5% 10%)";
      }

      // Add text shadow for better readability
      if (!bubble.shadow?.enabled) {
        style.textShadow = "1px 1px 0 rgba(255,255,255,0.5), -1px -1px 0 rgba(255,255,255,0.5)";
      }

      if (bubble.shadow?.enabled) {
        style.boxShadow = `${bubble.shadow.offsetX || 0}px ${bubble.shadow.offsetY || 0}px ${bubble.shadow.blur || 4}px ${bubble.shadow.color || "rgba(0,0,0,0.3)"}`;
      }
    } else {
      style.backgroundColor = "#ffffff";
      style.borderColor = "#000000";
      style.color = "#000000";
      style.textShadow = "1px 1px 0 rgba(255,255,255,0.5), -1px -1px 0 rgba(255,255,255,0.5)";
    }

    if (isEnhancedPosition(pos) && pos.rotation) {
      style.transform = `rotate(${pos.rotation}deg)`;
    }

    return style;
  }, []);

  const handleDragStart = useCallback((bubbleId: string, e: React.PointerEvent) => {
    if (!editable || !onBubblePositionChange) return;

    const pos = positions.find(p => p.bubbleId === bubbleId);
    if (!pos) return;

    e.stopPropagation();
    e.preventDefault();

    setDragState({
      bubbleId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    });
    setSelectedBubbleId(bubbleId);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [positions, editable, onBubblePositionChange, setSelectedBubbleId]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.bubbleId || !onBubblePositionChange) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

    const pos = positions.find(p => p.bubbleId === dragState.bubbleId);
    if (!pos) return;

    // Clamp position to keep bubble within bounds
    const maxX = 100 - pos.width;
    const maxY = 100 - (pos.height || 20);
    const newX = Math.max(0, Math.min(maxX, dragState.initialX + deltaX));
    const newY = Math.max(0, Math.min(maxY, dragState.initialY + deltaY));

    onBubblePositionChange(dragState.bubbleId, { x: newX, y: newY });
  }, [dragState, positions, onBubblePositionChange]);

  const handleDragEnd = useCallback(() => {
    setDragState({ bubbleId: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  }, []);

  const handleBubbleClick = useCallback((bubbleId: string, text: string) => {
    if (!editable) return;
    setSelectedBubbleId(bubbleId);
    if (text !== undefined) {
      onBubbleEdit?.(panelId ?? '', bubbleId, text);
    }
  }, [editable, onBubbleEdit, panelId, setSelectedBubbleId]);

  const handleSizeChange = useCallback((bubbleId: string, x: number, y: number, width: number, height: number) => {
    if (!editable || !onBubblePositionChange) return;
    // Update both position (x, y) and size (width, height)
    onBubblePositionChange(bubbleId, { x, y });
    onBubbleSizeChange?.(bubbleId, { width, height });
  }, [editable, onBubblePositionChange, onBubbleSizeChange]);

  // Canvas drawing handlers
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load existing drawing data
    if (drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = drawingData;
    }

    canvasInitializedRef.current = true;
  }, [drawingData]);

  // Initialize canvas when drawing mode is enabled or when component mounts
  useEffect(() => {
    if (drawingMode) {
      setupCanvas();
    }
  }, [drawingMode, setupCanvas]);

  // Handle Delete key to remove selected bubble
  const selectedBubbleIdRef = useRef(selectedBubbleId);
  useEffect(() => {
    selectedBubbleIdRef.current = selectedBubbleId;
  }, [selectedBubbleId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedBubbleIdRef.current && editable && onBubbleDelete) {
        onBubbleDelete(selectedBubbleIdRef.current);
        setSelectedBubbleId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editable, onBubbleDelete, setSelectedBubbleId]);

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;
    e.preventDefault();

    // Save current state to history before starting a new stroke
    onDrawingStrokeStart?.();

    const point = getCanvasPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setLastPoint(point);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure context properties are properly reset before drawing
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Set composite operation for eraser or normal drawing
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = drawingColor;
    ctx.fill();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }, [drawingMode, getCanvasPoint, brushSize, drawingColor, isEraser, onDrawingStrokeStart]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingMode || !isDrawing) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    if (!point || !lastPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set composite operation for eraser or normal drawing
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

    // Ensure smooth lines
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = drawingColor;
    ctx.stroke();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    setLastPoint(point);
  }, [drawingMode, isDrawing, getCanvasPoint, lastPoint, drawingColor, brushSize, isEraser]);

  const handleCanvasPointerUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);

    // Save drawing data only when the stroke is complete
    const canvas = canvasRef.current;
    if (canvas && onDrawingChange) {
      onDrawingChange(canvas.toDataURL());
    }
  }, [onDrawingChange]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-lg bg-muted"
      style={{ pointerEvents: drawingMode ? 'none' : 'auto' }}
      onClick={() => {
        // Deselect when clicking outside bubbles (only when not drawing)
        if (editable && selectedBubbleId && !drawingMode) {
          setSelectedBubbleId(null);
        }
      }}
    >
      {/* Image container */}
      <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: drawingMode ? 'none' : 'auto' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Comic panel"
          className="w-full h-full object-contain pointer-events-none"
          style={{ maxHeight: "100%", maxWidth: "100%" }}
        />
      </div>

      {/* Bubbles layer - supports dragging */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: drawingMode ? 1 : 10, pointerEvents: drawingMode ? 'none' : 'auto' }}>
        {bubbles.map((bubble) => {
          const pos = positions.find(p => p.bubbleId === bubble.id);
          if (!pos) return null;

          const tailStyle = getTailStyle(pos, bubble);

          return (
            <div key={bubble.id} className="absolute inset-0" style={{ pointerEvents: drawingMode ? 'none' : 'auto' }}>
              {/* Render tail first so it appears behind the bubble */}
              {tailStyle && <div style={tailStyle} className="pointer-events-none" />}
              <DraggableBubble
                bubble={bubble}
                position={pos}
                getBubbleClass={getBubbleClass}
                getBubbleStyle={getBubbleStyle}
                onDragStart={(e) => handleDragStart(bubble.id, e)}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onClick={(text) => handleBubbleClick(bubble.id, text ?? bubble.text)}
                isSelected={selectedBubbleId === bubble.id}
                onRotationChange={(rotation) => onBubbleRotationChange?.(bubble.id, rotation)}
                onSizeChange={(x, y, w, h) => handleSizeChange(bubble.id, x, y, w, h)}
              />
            </div>
          );
        })}
      </div>

      {/* Drawing canvas overlay */}
      {drawingMode && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
          style={{ touchAction: "none", zIndex: 20, pointerEvents: 'auto' }}
        />
      )}
    </div>
  );
}
