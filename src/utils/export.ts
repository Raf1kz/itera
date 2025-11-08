import type { FSRSCard } from "../schemas";
import type { Flashcard } from "../types/flashcards";
import { validateAndNormalizeCards } from "./validation";

export function exportToJson(deck: Flashcard[], fsrsData: Map<string, FSRSCard>) {
  const data = {
    deck,
    fsrs: Array.from(fsrsData.entries()),
    exportedAt: new Date().toISOString(),
    version: "1.0"
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `studyflash-${Date.now()}.json`
  });
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(deck: Flashcard[]) {
  const csv = [
    "Question,Answer,Type,Category,Difficulty,Hint",
    ...deck.map(c =>
      [
        `"${(c.question ?? "").replace(/"/g, '""')}"`,
        `"${(c.answer ?? "").replace(/"/g, '""')}"`,
        `"${(c.type ?? "").replace(/"/g, '""')}"`,
        `"${(c.category ?? "").replace(/"/g, '""')}"`,
        c.difficulty ?? "",
        `"${(c.hint ?? "").replace(/"/g, '""')}"`
      ].join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `studyflash-${Date.now()}.csv`
  });
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromJson(
  file: File
): Promise<{ deck: Flashcard[]; fsrs: [string, FSRSCard][] } | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as {
      deck?: unknown;
      fsrs?: [string, FSRSCard][];
    };

    if (!Array.isArray(data.deck)) {
      throw new Error("Invalid format: missing deck");
    }

    const normalizedDeck = validateAndNormalizeCards(data.deck);

    return {
      deck: normalizedDeck,
      fsrs: Array.isArray(data.fsrs) ? data.fsrs : []
    };
  } catch (error) {
    console.error("Failed to import JSON:", error);
    return null;
  }
}
