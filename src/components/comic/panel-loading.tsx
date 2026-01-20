"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import Confetti from "react-confetti";
import { Card } from "@/components/ui/card";

interface PanelLoadingProps {
  comicId: string;
  onComplete: () => void;
  onError?: (error: string) => void;
}

export function PanelLoading({ comicId, onComplete, onError }: PanelLoadingProps) {
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [currentPanel, setCurrentPanel] = useState(0);
  const [totalPanels, setTotalPanels] = useState(4);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/comics/generate?comicId=${comicId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "completed") {
            setStatus("completed");
            setShowConfetti(true);
            setTimeout(() => {
              onComplete();
            }, 1500);
          } else if (data.status === "failed") {
            setStatus("failed");
            onError?.(data.error || "Generation failed. Please try again.");
          } else if (data.panels) {
            setCurrentPanel(data.panels.length);
            if (data.metadata?.panelCount) {
              setTotalPanels(data.metadata.panelCount);
            }
          }
        } else if (response.status === 404) {
          // Comic not found yet - keep waiting
        }
      } catch (error) {
        console.error("Poll error:", error);
        // Don't error out on network issues, keep polling
      }
    };

    // Poll immediately, then every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [comicId, onComplete, onError]);

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-flex"
        >
          <Sparkles className="h-12 w-12 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">
          {status === "generating"
            ? "Creating Your Comic..."
            : status === "completed"
            ? "Almost Done!"
            : "Generation Failed"}
        </h2>
        <p className="text-muted-foreground">
          {status === "generating"
            ? `Generating panel ${currentPanel + 1} of ${totalPanels}...`
            : status === "completed"
            ? "Your comic is ready!"
            : "Something went wrong. Please try again."}
        </p>
      </div>

      {/* Panel progress grid */}
      <div className="max-w-md mx-auto">
        <div className={`grid gap-3 ${totalPanels > 8 ? "grid-cols-4" : totalPanels > 4 ? "grid-cols-4" : "grid-cols-4"}`}>
          {Array.from({ length: totalPanels }).map((_, i) => {
            const isActive = i === currentPanel && status === "generating";
            const isComplete = i < currentPanel || status === "completed";

            return (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                  scale: isActive ? 1.05 : isComplete ? 1 : 0.9,
                  opacity: isComplete ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className={`aspect-square flex items-center justify-center relative overflow-hidden transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : isComplete
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-border"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-primary/5"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {isComplete ? (
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : isActive ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <span className="text-muted-foreground/50 text-sm">...</span>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{
              width: status === "completed" ? "100%" : `${(currentPanel / totalPanels) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Tips */}
      {status === "generating" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground space-y-2"
        >
          <p>Pro tip: You can customize each panel after generation!</p>
          <p className="text-xs">This usually takes 30-60 seconds...</p>
        </motion.div>
      )}

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            colors={["#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6"]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
