import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { getModel, GEMINI_PRO_MODEL, GEMINI_VISION_MODEL, GEMINI_IMAGE_MODEL } from "./gemini";
import { processImageBufferToDimensions } from "./image-processor";
import { extractTextFromPDF } from "./pdf-extractor";
import { comics, panels, type DetectedTextBox } from "./schema";
import { upload } from "./storage";

// Types
export interface GenerationOptions {
  subject: string;
  artStyle: "retro" | "manga" | "minimal" | "pixel" | "noir" | "watercolor" | "anime" | "popart";
  tone: "funny" | "serious" | "friendly" | "adventure" | "romantic" | "horror";
  length: "short" | "medium" | "long";
  outputFormat?: "strip" | "separate";
  pageSize?: "letter" | "a4" | "tabloid" | "a3";
  requestedPanelCount?: number;
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy";
  showCaptions?: boolean;
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

// AI text box detection for editable overlays using Gemini Vision
export async function detectTextBoxes(imageUrl: string): Promise<DetectedTextBox[]> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `You are a comic text analyzer. Carefully examine this comic panel image and identify EVERY single text element.

Look for and include:
1. Speech bubbles (dialogue inside rounded/oval shapes with tails)
2. Thought bubbles (cloud-shaped or disconnected bubbles)
3. Narration/caption boxes (rectangular text boxes, often at top/bottom)
4. Sound effects text (stylized words like "POW!", "WHOOSH!", etc.)
5. Title text or headers
6. Any handwritten or printed text anywhere in the image
7. Text on signs, labels, or objects in the background
8. Small text, faint text, or partially obscured text

CRITICAL DETECTION RULES:
- Be THOROUGH - don't miss any text, no matter how small or subtle
- If you see multiple text areas, list ALL of them
- For speech bubbles with multiple lines, capture the complete text
- Include sound effects and onomatopoeia
- Include narrator text in caption boxes
- Even if text is stylized or artistic, extract it

For each text region, provide:
- text: The EXACT text content as written in the image (don't paraphrase or correct)
- x: Left edge position as percentage (0-100)
- y: Top edge position as percentage (0-100)
- width: Width as percentage (0-100)
- height: Height as percentage (0-100)
- confidence: Your confidence in this detection (0.0-1.0)

IMPORTANT:
- Return ALL coordinates as percentages (0-100), never pixels
- If you see NO text at all, return an empty array for textBoxes
- List every text element you find, even if you're uncertain

Respond ONLY in valid JSON format:
{
  "textBoxes": [
    {
      "text": "exact text from image",
      "x": 10.5,
      "y": 20.3,
      "width": 30.2,
      "height": 15.8,
      "confidence": 0.95
    }
  ]
}`;

  // Convert relative URL to full URL
  let fullUrl = imageUrl;
  if (imageUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${imageUrl}`;
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
      if (parsed.textBoxes && Array.isArray(parsed.textBoxes)) {
        return parsed.textBoxes.map((box: any, index: number) => ({
          id: `detected-${Date.now()}-${index}`,
          text: box.text || "",
          x: box.x || 0,
          y: box.y || 0,
          width: box.width || 10,
          height: box.height || 5,
          confidence: box.confidence || 0.5,
        }));
      }
    }
  } catch (e) {
    console.error("Failed to parse text detection response:", e);
  }

  return [];
}

// Extract character reference from source image BEFORE panel generation
async function extractCharacterReferenceFromSource(
  sourceImageUrl: string
): Promise<string> {
  const model = getModel(GEMINI_VISION_MODEL);

  const prompt = `Analyze this image and provide a detailed character reference for comic creation.

If there are characters/people in the image, describe:
1. Main character(s) appearance (hair, clothing, features, age, gender)
2. Facial features and expressions
3. Body proportions and poses
4. Clothing style and accessories
5. Art style characteristics

If there are no characters, describe:
1. The overall visual style
2. Color palette
3. Key visual elements that should be consistent

This reference will be used to maintain visual consistency across all comic panels.
Respond in JSON format: { "characterReference": "detailed description" }`;

  let fullUrl = sourceImageUrl;
  if (sourceImageUrl.startsWith("/uploads/")) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fullUrl = `${baseUrl}${sourceImageUrl}`;
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

  const prompt = `You are creating a ${options.artStyle} style comic with ${targetPanelCount} panels about ${options.subject}.
The tone should be ${options.tone}.

CONTENT TO ADAPT:
${analysis.narrativeStructure}

KEY CONCEPTS TO COVER:
${analysis.keyConcepts.join(", ")}

CRITICAL INSTRUCTIONS FOR DIALOGUE GENERATION:
1. Keep dialogue NATURAL and CONCISE - no more than 15-20 words per speech bubble
2. Include speaker labels when appropriate: "Narrator:" for narration, "Character:" for dialogue
3. NEVER add parenthetical labels like "(caption)", "(dialogue)", "(narration)" after speaker names
4. Each panel should have exactly ONE main dialogue or narration line

For example:
- BAD: "Narrator (caption): Photosynthesis converts light energy"
- GOOD: "Narrator: Photosynthesis converts light energy into chemical fuel!"
- BAD: "Character 1 (dialogue): This is how it works"
- GOOD: "Character 1: This is how it works!"

CHARACTER CONSISTENCY INSTRUCTIONS:
1. Establish consistent character appearance from the first panel
2. Keep the same main character(s) throughout all panels
3. Note distinctive features (hair style, clothing, accessories) for consistency
4. Use consistent color palette for each character across panels

Respond in JSON format as an array of panels:
[
  {
    "panelNumber": 1,
    "description": "Detailed visual description of the scene including character appearance, pose, expression, setting, and action",
    "dialogue": "Dialogue with speaker label (e.g., 'Narrator: text' or 'Character: text') but WITHOUT parenthetical notes",
    "visualElements": "Key props, background elements, color scheme, and artistic details"
  }
]`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text() || "";

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scripts = JSON.parse(jsonMatch[0]);
      // Clean up dialogue - remove any speaker labels or parenthetical notes
      return scripts.map((script: PanelScript) => ({
        ...script,
        dialogue: cleanDialogueText(script.dialogue)
      }));
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

// Helper function to clean dialogue text - only removes parenthetical labels
function cleanDialogueText(dialogue: string): string {
  return dialogue
    // Remove parenthetical labels like "(caption)", "(dialogue)", "(narration)", "(thought)"
    .replace(/\s*\(caption\)|\(dialogue\)|\(narration\)|\(thought\)\s*/gi, "")
    .trim();
}

// Panel image generation using Gemini 3 Pro Image Preview
export async function generatePanelImage(
  script: PanelScript,
  artStyle: string,
  characterContext?: string,
  outputFormat?: "strip" | "separate" | "fullpage",
  _pageSize?: "letter" | "a4" | "tabloid" | "a3",
  borderStyle?: "straight" | "jagged" | "zigzag" | "wavy",
  includeCaptions?: boolean,
  adjacentContext?: string  // NEW: adjacent panels context for narrative continuity
): Promise<string> {
  // All panels are generated as SQUARE (1024x1024) for consistent grid layout
  // The outputFormat and pageSize are used for layout during export, not generation

  const prompt = `CRITICAL SIZE REQUIREMENT: This panel MUST be exactly 1024x1024 pixels (square format). ALL other panels in this comic are 1024x1024 - you MUST match this size EXACTLY. Do not vary dimensions under any circumstances.

Create a ${artStyle} style SQUARE comic panel illustration.

PANEL SCENE: ${script.description}

DIALOGUE FOR SPEECH BUBBLE: "${script.dialogue}"

VISUAL ELEMENTS: ${script.visualElements}

${characterContext ? `CHARACTER REFERENCE (CRITICAL - Maintain consistency): ${characterContext}

STRICT CHARACTER CONSISTENCY RULES:
- If a character reference is provided above, MATCH the exact appearance described
- Use same hair style, hair color, facial features, body type, and clothing
- Keep consistent proportions and poses
- Use the same color palette for clothing and features
- If no reference yet, establish a clear character design that can be replicated` : "ESTABLISH A CLEAR CHARACTER DESIGN in this first panel that can be consistently replicated in future panels."}

${adjacentContext ? `ADJACENT PANELS CONTEXT (for narrative continuity):
${adjacentContext}

Use this context to ensure the scene flows naturally with surrounding panels while maintaining the specific scene description above.` : ""}

ARTISTIC STYLE REQUIREMENTS:
- ${artStyle} art style with bold, clean lines
- Vibrant colors suitable for educational comics
- Expressive character poses and facial expressions
- Dynamic composition with clear focal points
- Professional comic book quality

CRITICAL COMPOSITION INSTRUCTIONS - PREVENT CUTOFFS:
- DO NOT include any borders or frames - this will be added later
- MANDATORY: Keep ALL important content (characters, speech bubbles, text) well WITHIN the image frame
- CRITICAL: Maintain at least 15% padding (150+ pixels) from ALL edges (top, bottom, left, right)
- ABSOLUTELY NO cutoffs: Ensure NO heads, hands, feet, text, speech bubbles, or important elements are cut off at ANY edge
- CRAM THE SCENE INWARD: Frame characters and action centrally with generous margins on all sides
- WIDE SHOT FRAMING: Use slightly wider framing than needed - zoom out slightly to ensure full visibility
- NEVER position characters at the very top edge - always leave significant headroom above heads
- NEVER position characters at the very bottom edge - always leave space below feet/body
- Center the main subject with equal margins on all sides
- If a character's head is near the top, move them DOWN and zoom OUT
- If a character's feet are near the bottom, move them UP and zoom OUT

CRITICAL SPEECH BUBBLE INSTRUCTIONS:
- Include a LARGE, clearly visible speech bubble containing exactly: "${script.dialogue}"
- Speech bubble must be white/light colored with black text for maximum readability
- Use comic-style rounded speech bubble with tail pointing to the speaker
- Position bubble in an uncluttered area, NOT overlapping important visual elements
- Text inside bubble must be large and legible (at least 24pt equivalent)
- CRITICAL: Position bubble well away from edges - at least 150 pixels from any edge
- NEVER position speech bubble at the very top or very bottom of the image
- Keep entire bubble WITHIN frame - no part of bubble should be cut off
- If no character is visible, use a rectangular caption/narration box instead

${borderStyle && outputFormat === "strip" ? `LAYOUT NOTE: This panel will be part of a 4x3 grid comic strip with borders added between panels by CSS. Focus on the panel content only - no borders needed.` : ""}

${outputFormat === "separate" && includeCaptions ? `NOTE: This panel will be displayed separately with the text "${script.dialogue}" shown below it. Focus on the visual scene - the dialogue will also appear as external caption text.` : ""}

QUALITY REQUIREMENTS:
- High detail, professional illustration quality
- Sharp, clean lines and edges
- Proper contrast and lighting
- Suitable for both print and digital display`;

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

      // Process image to square dimensions for consistent grid layout
      // All panels are processed as 1024x1024 squares regardless of format
      const processedBuffer = await processImageBufferToDimensions(
        buffer,
        'separate', // Use 'separate' for square individual panels
        'separate'
      );

      const uploadResult = await upload(processedBuffer, `panel-${Date.now()}.png`, "panels");
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

    // Log extracted content for debugging
    console.log(`[Comic ${comicId}] Extracted content length: ${content.length} characters`);
    console.log(`[Comic ${comicId}] Content preview: ${content.substring(0, 200)}...`);
    console.log(`[Comic ${comicId}] Content type: ${inputType}`);

    // Step 2: Analyze content
    const analysis = await analyzeContent(content, options.subject);

    // Step 3: Generate panel scripts
    const scripts = await generatePanelScripts(analysis, options);

    // Step 3.5: Extract character reference from source image BEFORE generating panels
    let characterReference = "";
    if (inputType === "image") {
      characterReference = await extractCharacterReferenceFromSource(inputUrl);
      await db.update(comics).set({ characterReference }).where(eq(comics.id, comicId));
    }

    // Set panelCount in metadata early so UI shows correct progress
    await db
      .update(comics)
      .set({
        metadata: {
          panelCount: scripts.length,
        },
      })
      .where(eq(comics.id, comicId));

    // Step 4: Generate images for each panel sequentially to maintain character context
    let characterContext = characterReference ? `Character reference: ${characterReference}` : "";

    for (const script of scripts) {
      const imageUrl = await generatePanelImage(
        script,
        options.artStyle,
        characterContext,
        options.outputFormat,
        options.pageSize,
        options.borderStyle,
        options.showCaptions
      );

      // Extract character reference after first panel (only if not already extracted from source)
      if (script.panelNumber === 1 && !characterReference) {
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

    // Update status to completed with final metadata
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
