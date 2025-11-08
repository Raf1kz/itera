import type { FSRSCard } from "../schemas";
import type { Flashcard } from "../types/flashcards";

interface DeckEntry {
  card: Flashcard;
  fsrs?: FSRSCard;
}

export function buildStudyQueue(
  deck: Flashcard[],
  fsrsData: Map<string, FSRSCard>
): Flashcard[] {
  const now = Date.now();
  const withFsrs: DeckEntry[] = deck.map(card => {
    const fsrs = fsrsData.get(card.id);
    return fsrs ? { card, fsrs } : { card };
  });

  const due = withFsrs
    .filter(entry => entry.fsrs?.due && entry.fsrs.due.getTime() <= now)
    .sort(
      (a, b) =>
        (a.fsrs?.due?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.fsrs?.due?.getTime() ?? Number.POSITIVE_INFINITY)
    );

  const learning = withFsrs.filter(entry => entry.fsrs?.state === "learning");
  const newOnes = withFsrs.filter(entry => !entry.fsrs);

  return [...due, ...learning, ...newOnes].map(entry => entry.card);
}

export function getDueCount(deck: Flashcard[], fsrsData: Map<string, FSRSCard>): number {
  const now = Date.now();
  return deck.filter(card => {
    const fsrs = fsrsData.get(card.id);
    if (!fsrs?.due) return false;
    return fsrs.due.getTime() <= now;
  }).length;
}

export function getMasteredCount(fsrsData: Map<string, FSRSCard>): number {
  const vals = Array.from(fsrsData.values());
  return vals.filter(f =>
    f.state === "review" &&
    f.stability >= 40 &&
    (f as any).retrievability >= 0.9
  ).length;
}

export function getNeedsReviewCount(deck: Flashcard[], fsrsData: Map<string, FSRSCard>): number {
  const now = Date.now();
  const vals = Array.from(fsrsData.values());
  return vals.filter(f => {
    if (!f.due) return f.state === "relearning";
    return new Date(f.due).getTime() <= now || f.state === "relearning";
  }).length;
}
