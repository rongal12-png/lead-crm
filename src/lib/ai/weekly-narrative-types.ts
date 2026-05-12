export type NarrativeLang = "he" | "en";

export type NarrativeContent = {
  headline: string;
  executiveSummary: string;
  leadAcquisition: string;
  pipelineProgress: string;
  tasksWork: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
};

export type WeeklyNarrative = {
  he: NarrativeContent;
  en: NarrativeContent;
  model: string;
  generatedAt: string;
};

export function parseNarrative(raw: string | null | undefined): WeeklyNarrative | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.he && parsed.en) {
      return parsed as WeeklyNarrative;
    }
  } catch {
    return null;
  }
  return null;
}
