"use client";

import { motion } from "framer-motion";
import { Upload, Wand2, BookOpen } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Notes",
    description:
      "Drag and drop text, PDFs, images, or even videos. We support all common formats up to 10MB.",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Wand2,
    title: "AI Creates Magic",
    description:
      "Our AI powered by Google Cloud Gemini analyzes your content and generates engaging comic panels that explain concepts visually.",
    color: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: BookOpen,
    title: "Learn & Remember",
    description:
      "Customize art style and tone, regenerate panels, export to PDF. Learning has never been this fun and memorable!",
    color: "from-green-500/20 to-green-600/10",
    iconColor: "text-green-600 dark:text-green-400",
  },
];

export function HowItWorks() {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ delay: index * 0.15, duration: 0.5 }}
          whileHover={{ y: -5 }}
          className="relative"
        >
          <div className={`h-full rounded-xl border bg-gradient-to-br ${step.color} p-6 text-center`}>
            <motion.div
              className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-md mb-4"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <step.icon className={`h-8 w-8 ${step.iconColor}`} strokeWidth={2} />
            </motion.div>
            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>

            {/* Step number badge */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: index * 0.15 + 0.3, type: "spring" }}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg"
            >
              {index + 1}
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
