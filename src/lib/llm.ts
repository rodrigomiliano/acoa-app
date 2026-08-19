import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-3.6-flash",
});

export interface GeminiResponse {
  text: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

export async function generateWithGemini(
  prompt: string,
  systemInstruction?: string
): Promise<GeminiResponse> {
  const model = systemInstruction
    ? genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        systemInstruction,
      })
    : geminiModel;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  return {
    text,
    usage: response.usageMetadata
      ? {
          promptTokenCount: response.usageMetadata.promptTokenCount || 0,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
        }
      : undefined,
  };
}

export async function generateJSON<T>(
  prompt: string,
  systemInstruction?: string
): Promise<T> {
  const response = await generateWithGemini(prompt, systemInstruction);
  
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : response.text;
  
  try {
    return JSON.parse(jsonStr.trim()) as T;
  } catch {
    // Try to find JSON object or array in the text
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    const match = objectMatch || arrayMatch;
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Failed to parse JSON response from Gemini");
  }
}
