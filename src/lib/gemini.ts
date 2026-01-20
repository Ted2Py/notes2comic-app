import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY environment variable is required. Please set it in your .env file.\n" +
    "Get your API key from: https://makersuite.google.com/app/apikey"
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model constants
export const GEMINI_PRO_MODEL = "gemini-2.5-pro";
export const GEMINI_FLASH_MODEL = "gemini-2.0-flash-exp";
export const GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const GEMINI_VISION_MODEL = "gemini-2.5-pro";

// Helper function to get generative model
export function getModel(modelName: string) {
  return genAI.getGenerativeModel({ model: modelName });
}
