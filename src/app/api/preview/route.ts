import { NextRequest, NextResponse } from "next/server";
import { getModel, GEMINI_IMAGE_MODEL } from "@/lib/gemini";
import { upload } from "@/lib/storage";

const EXAMPLE_PROMPTS = {
  "Physics: Newton's Laws": {
    prompt: "A comic panel showing a character pushing a box, with the formula F=ma displayed dramatically in a speech bubble",
    style: "retro",
  },
  "History: World War II": {
    prompt: "A multi-panel comic showing the timeline of key events with illustrated maps and leaders from World War II",
    style: "retro",
  },
  "Biology: Photosynthesis": {
    prompt: "A colorful comic showing a happy sun, plant drinking water, and oxygen bubbles floating up during photosynthesis",
    style: "minimal",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { exampleId } = await req.json();

    if (!exampleId) {
      return NextResponse.json({ error: "Example ID required" }, { status: 400 });
    }

    const example = EXAMPLE_PROMPTS[exampleId as keyof typeof EXAMPLE_PROMPTS];
    if (!example) {
      return NextResponse.json({ error: "Example not found" }, { status: 404 });
    }

    // Generate image using Gemini
    const model = getModel(GEMINI_IMAGE_MODEL);

    const prompt = `Create a ${example.style} style comic panel illustration showing: ${example.prompt}

CRITICAL COMPOSITION INSTRUCTIONS:
- DO NOT include any borders or frames
- MANDATORY: Keep ALL important content (characters, text) well WITHIN the image frame
- CRITICAL: Maintain at least 15% padding from ALL edges
- ABSOLUTELY NO cutoffs: Ensure NO heads, hands, feet, or text are cut off at ANY edge
- Center the main subject with equal margins on all sides
- Include a LARGE, clearly visible speech bubble with the text
- Speech bubble must be white/light colored with black text for maximum readability
- Position bubble well away from edges - at least 150 pixels from any edge`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "text/plain",
          data: Buffer.from(prompt).toString("base64"),
        },
      },
    ]);

    const response = await result.response;
    const candidate = response.candidates?.[0];
    let imageData: string | undefined;

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
      const uploadResult = await upload(buffer, `preview-${Date.now()}.png`, "previews");
      return NextResponse.json({ imageUrl: uploadResult.url });
    }

    throw new Error("No image data in response");
  } catch (error) {
    console.error("Preview generation error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
