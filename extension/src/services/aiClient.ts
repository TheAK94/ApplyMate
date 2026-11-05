import type { FormField } from "../content/extractor";
import type { UserProfile } from "../types/profile";

export interface AIFieldMatch {
  fieldId: string;
  action: "profile_match" | "generate_answer" | "manual_input" | "ignore";
  profileKey: string | null;
  value: string | null;
  confidence: number;
  reason: string;
}

interface AIAnalysisResponse {
  success: boolean;
  matches: AIFieldMatch[];
  message?: string;
}

const API_URL = "http://localhost:5000/api/ai/analyze";

export async function analyzeFieldsWithAI(
  fields: FormField[],
  profile: UserProfile
): Promise<AIFieldMatch[]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields,
      profile
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed (${response.status}).`);
  }

  const data: AIAnalysisResponse = await response.json();

  if (!data.success || !Array.isArray(data.matches)) {
    throw new Error(data.message || "Invalid AI response.");
  }

  return data.matches;
}