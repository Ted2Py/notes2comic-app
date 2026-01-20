import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { getModel, GEMINI_PRO_MODEL, GEMINI_VISION_MODEL, GEMINI_IMAGE_MODEL } from "./gemini";
import { extractTextFromPDF } from "./pdf-extractor";
import { comics, panels } from "./schema";
import { upload } from "./storage";

// Types
export interface GenerationOptions {
  subject: string;
  artStyle: "retro" | "manga" | "minimal" | "pixel";
  tone: "funny" | "serious" | "friendly";
  length: "short" | "medium" | "long";
  outputFormat?: "strip" | "separate" | "fullpage";
  pageSize?: "letter" | "a4" | "tabloid" | "a3";
  requestedPanelCount?: number;
}

export interface PanelScript {
  panelNumber: number;
  description: string;
  dialogue: string;
  visualElements: string;
}

export interface ContentAnalysis {
  keyConcepts: string[];
  narrativeStructure: string;
  suggestedPanelCount: number;
}

// Content extraction
export async function extractContent(
  inputUrl: string,
  inputType: string
): Promise<string> {
  // Construct full URL for relative paths
  let fullUrl = inputUrl;
  if (inputUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${inputUrl}`;

    // For local files, try reading from filesystem first (more reliable)
    if (process.env.NODE_ENV === "development") {
      try {
        const { readFile } = await import("fs/promises");
        const { join } = await import("path");
        const filePath = join(process.cwd(), "public", inputUrl);
        const buffer = await readFile(filePath);

        if (inputType === "pdf") {
          return await extractTextFromPDF(buffer);
        } else if (inputType === "text") {
          return buffer.toString("utf-8");
        } else if (inputType === "image") {
          // For images, we need to use fetch with the full URL for Gemini
          return await extractTextFromImage(fullUrl);
        }
      } catch (fsError) {
        console.error("Filesystem read failed, falling back to fetch:", fsError);
      }
    }
  }

  switch (inputType) {
    case "text":
      const response = await fetch(fullUrl);
      return await response.text();

    case "pdf":
      const pdfBuffer = await fetch(fullUrl).then((r) => r.arrayBuffer());
      return await extractTextFromPDF(Buffer.from(pdfBuffer));

    case "image":
      return await extractTextFromImage(fullUrl);

    case "video":
      return await extractTextFromVideo();

    default:
      throw new Error(`Unsupported input type: ${inputType}`);
  }
}

// OCR for images using Gemini Vision
export async function extractTextFromImage(imageUrl: string): Promise<string> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Extract all text from this image. Include handwritten notes, printed text, and any labels. Preserve the structure and organization of the content.`;

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/png",
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  return response.text() || "";
}

// Video processing (not yet implemented)
export async function extractTextFromVideo(): Promise<string> {
  throw new Error(
    "Video processing is not yet supported. Please use text, PDF, or image input instead."
  );
}

// Extract character reference from first panel for consistency
async function extractCharacterReference(firstPanelUrl: string): Promise<string> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Analyze this comic panel image and provide a detailed character reference.

Describe:
1. Main character(s) appearance (hair, clothing, features)
2. Art style characteristics
3. Color palette
4. Proportions and poses

This reference will be used to maintain character consistency across all panels.
Respond in JSON format: { "characterReference": "detailed description" }`;

  // Convert relative URL to full URL
  let fullUrl = firstPanelUrl;
  if (firstPanelUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${firstPanelUrl}`;
  }

  const imageResponse = await fetch(fullUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/png",
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text() || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.characterReference || "";
    }
  } catch (e) {
    console.error("Failed to parse character reference:", e);
  }

  return "";
}

// Content analysis
export async function analyzeContent(
  content: string,
  subject: string
): Promise<ContentAnalysis> {
  const model = getModel(GEMINI_PRO_MODEL);

  const prompt = `You are analyzing educational content to create a comprehensive comic summary.

Subject: ${subject}

Full Content:
${content}

CRITICAL INSTRUCTIONS:
- This is the COMPLETE content - summarize ALL of it, not just the first section
- Capture the full scope of topics covered throughout the entire document
- Identify ALL main themes and key points from beginning to end
- Think about how many panels are needed to cover the ENTIRE content comprehensively

Provide:
1. Key concepts - extract ALL main topics and themes from the ENTIRE content (as a JSON array)
2. Narrative structure - a comprehensive summary that covers the FULL content from start to finish, organized in a way that would work well as a comic story
3. Suggested number of comic panels - based on how many panels are needed to cover the ENTIRE content (1-12)

Respond in JSON format with this structure:
{
  "keyConcepts": ["concept1", "concept2", "concept3", ...],
  "narrativeStructure": "A comprehensive summary covering all the main topics and themes from the entire content, organized for comic presentation",
  "suggestedPanelCount": 4
}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text() || "";

  // Parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse analysis response:", e);
  }

  // Fallback
  return {
    keyConcepts: ["Concept 1", "Concept 2", "Concept 3"],
    narrativeStructure: text,
    suggestedPanelCount: 4,
  };
}

// Panel script generation
export async function generatePanelScripts(
  analysis: ContentAnalysis,
  options: GenerationOptions
): Promise<PanelScript[]> {
  // Use requested count or suggested count
  const targetPanelCount = options.requestedPanelCount || analysis.suggestedPanelCount;

  const model = getModel(GEMINI_PRO_MODEL);

  const prompt = `Create a comic script with ${targetPanelCount} panels.

Subject: ${options.subject}
Tone: ${options.tone}
Art style: ${options.artStyle}

Content to explain:
${analysis.narrativeStructure}

Key concepts to cover:
${analysis.keyConcepts.join(", ")}

For each panel, provide:
- Panel number
- Visual description (what the scene looks like)
- Dialogue (what characters say)
- Key visual elements (props, backgrounds, etc.)

Respond in JSON format as an array of panels with this structure:
[
  {
    "panelNumber": 1,
    "description": "visual description of the scene",
    "dialogue": "what characters say in this panel",
    "visualElements": "key props and background elements"
  }
]`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text() || "";

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse script response:", e);
  }

  // Fallback
  return Array.from({ length: targetPanelCount }, (_, i) => ({
    panelNumber: i + 1,
    description: `Panel ${i + 1} explaining ${analysis.keyConcepts[i] || "concepts"}`,
    dialogue: `Let me explain about ${analysis.keyConcepts[i] || "this topic"}...`,
    visualElements: options.artStyle,
  }));
}

// Panel image generation using Gemini 3 Pro Image Preview
export async function generatePanelImage(
  script: PanelScript,
  artStyle: string,
  characterContext?: string,
  outputFormat?: "strip" | "separate" | "fullpage",
  pageSize?: "letter" | "a4" | "tabloid" | "a3"
): Promise<string> {
  // Determine dimensions based on format
  let dimensions = "";
  if (outputFormat === "separate") {
    // Separate panels: standard landscape (11x8.5 inches, 1056x816 pixels at 96 DPI)
    dimensions = "1056x816 pixels (landscape)";
  } else {
    // Strip and fullpage: based on selected page size (landscape)
    const sizeMap = {
      letter: "1056x816 pixels (11x8.5 inch landscape)",
      a4: "1123x794 pixels (11.69x8.27 inch landscape)",
      tabloid: "1632x1056 pixels (17x11 inch landscape)",
      a3: "1587x1123 pixels (16.54x11.69 inch landscape)"
    };
    dimensions = sizeMap[pageSize || "letter"];
  }

  const prompt = `Create a ${artStyle} style comic panel illustration at ${dimensions}.

Scene description: ${script.description}

Dialogue to include in speech bubbles: "${script.dialogue}"

Visual elements: ${script.visualElements}
${characterContext ? `Character context: ${characterContext}` : ""}

CRITICAL INSTRUCTIONS FOR SPEECH BUBBLES:
- INCLUDE FILLED speech bubbles with the actual dialogue text inside them
- The dialogue text "${script.dialogue}" must be visible inside speech bubbles in the image
- Position speech bubbles naturally near the speaking characters
- Use comic-style speech bubbles with tails pointing to speakers
- Make the text readable and clearly visible

Style and composition:
- The image should be in comic book style, colorful, engaging, and suitable for educational content
- Use dynamic angles and expressive characters
- Include the visual elements mentioned above`;

  try {
    // Use Gemini 3 Pro Image Preview for image generation
    const model = getModel(GEMINI_IMAGE_MODEL);

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "text/plain",
          data: Buffer.from(prompt).toString("base64"),
        },
      },
    ]);

    const response = await result.response;

    // Check if image was generated
    const candidate = response.candidates?.[0];
    let imageData: string | undefined;

    // Try different response structures for image generation
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
          imageData = part.inlineData.data;
          break;
        }
      }
    }

    if (imageData) {
      const buffer = Buffer.from(imageData, "base64");
      const uploadResult = await upload(buffer, `panel-${Date.now()}.png`, "panels");
      return uploadResult.url;
    }

    throw new Error("No image data in response");
  } catch (error) {
    console.error("Image generation error:", error);
    // Fallback to SVG placeholder on error
    const svgContent = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#f0f0f0"/>
        <rect x="20" y="20" width="760" height="560" fill="#ffffff" stroke="#000" stroke-width="4"/>
        <text x="400" y="150" font-family="Arial" font-size="24" text-anchor="middle" fill="#333">
          Panel ${script.panelNumber}
        </text>
        <text x="400" y="200" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">
          Style: ${artStyle}
        </text>
        <text x="50" y="280" font-family="Arial" font-size="16" fill="#333">
          ${script.description.substring(0, 100)}
        </text>
        <text x="50" y="350" font-family="Arial" font-size="14" fill="#666" font-style="italic">
          "${script.dialogue.substring(0, 150)}"
        </text>
        <text x="400" y="500" font-family="Arial" font-size="14" text-anchor="middle" fill="#999">
          AI image generation failed - using placeholder
        </text>
      </svg>
    `.trim();

    const buffer = Buffer.from(svgContent, "utf-8");
    const fallbackResult = await upload(buffer, `panel-${Date.now()}.svg`, "panels");
    return fallbackResult.url;
  }
}

// Main orchestration function
export async function generateComic(
  comicId: string,
  inputUrl: string,
  inputType: string,
  options: GenerationOptions
): Promise<void> {
  try {
    // Update status to generating
    await db
      .update(comics)
      .set({ status: "generating" })
      .where(eq(comics.id, comicId));

    // Step 1: Extract content
    const content = await extractContent(inputUrl, inputType);

    // Step 2: Analyze content
    const analysis = await analyzeContent(content, options.subject);

    // Step 3: Generate panel scripts
    const scripts = await generatePanelScripts(analysis, options);

    // Step 4: Generate images for each panel sequentially to maintain character context
    let characterReference = "";
    let characterContext = "";

    for (const script of scripts) {
      const imageUrl = await generatePanelImage(script, options.artStyle, characterContext, options.outputFormat, options.pageSize);

      // Extract character reference after first panel
      if (script.panelNumber === 1) {
        characterReference = await extractCharacterReference(imageUrl);
        await db.update(comics).set({ characterReference }).where(eq(comics.id, comicId));
        characterContext = `Character reference: ${characterReference}`;
      }

      // Store panel
      await db.insert(panels).values({
        id: randomUUID(),
        comicId,
        panelNumber: script.panelNumber,
        imageUrl,
        caption: script.dialogue,
        textBox: script.description, // Store scene description
        speechBubbles: [], // Initialize empty - will be populated by editor
        bubblePositions: [], // Initialize empty
        regenerationCount: 0,
        metadata: {
          generationPrompt: script.description,
          characterContext,
        },
      });

      // Update character context for consistency
      characterContext += ` | Panel ${script.panelNumber}: ${script.description}`;
    }

    // Update status to completed
    await db
      .update(comics)
      .set({
        status: "completed",
        metadata: {
          panelCount: scripts.length,
          generationTime: Date.now(),
        },
      })
      .where(eq(comics.id, comicId));
  } catch (error) {
    console.error("Comic generation error:", error);
    await db
      .update(comics)
      .set({ status: "failed" })
      .where(eq(comics.id, comicId));
    throw error;
  }
}
