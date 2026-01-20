"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const examples = [
  {
    id: 1,
    title: "Physics: Newton's Laws",
    before: "A 10kg object accelerates at 5m/s² when a force is applied. Calculate the force using F=ma.",
    after: "A comic panel showing a character pushing a box, with the formula F=ma displayed dramatically",
  },
  {
    id: 2,
    title: "History: World War II",
    before: "The Axis powers Germany, Italy, and Japan fought against the Allies from 1939-1945",
    after: "A multi-panel comic showing the timeline of key events with illustrated maps and leaders",
  },
  {
    id: 3,
    title: "Biology: Photosynthesis",
    before: "Plants convert CO₂ + H₂O + sunlight into glucose and oxygen using chlorophyll",
    after: "A colorful comic showing a happy sun, plant drinking water, and oxygen bubbles floating up",
  },
];

export function ExampleShowcase() {
  const [activeExample, setActiveExample] = useState(0);

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Example selector */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold mb-6">Choose a subject to see the transformation:</h3>
        {examples.map((example, index) => (
          <motion.button
            key={example.id}
            onClick={() => setActiveExample(index)}
            className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
              activeExample === index
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">{example.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {example.before}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Visualization */}
      <motion.div
        key={activeExample}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-8"
      >
        <div className="border-2 border-primary/20 rounded-xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
          {/* Before section */}
          <div className="p-6 border-b border-border/50 bg-muted/30">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Boring Text Notes
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {examples[activeExample]!.before}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center py-4 bg-muted/20">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-primary"
            >
              <ArrowRight className="h-6 w-6" strokeWidth={3} />
            </motion.div>
          </div>

          {/* After section */}
          <div className="p-6 bg-background">
            <h4 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">
              Engaging Comic!
            </h4>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 flex items-center justify-center"
            >
              <p className="text-center text-sm p-4 text-foreground/80">
                {examples[activeExample]!.after}
              </p>
            </motion.div>
          </div>
        </div>

        <motion.p
          key={activeExample}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground text-center mt-4"
        >
          Turn dry notes into visual stories that stick in your memory!
        </motion.p>
      </motion.div>
    </div>
  );
}
