export const TYPE_MAP: Record<string, string> = {
  "Definition": "Définition",
  "Reverse Definition": "Définition inversée",
  "Cloze": "Texte à trous",
  "Concept": "Concept",
  "Process Order": "Ordre de processus",
  "Cause-Effect": "Cause-Effet",
  "Comparison": "Comparaison",
  "Formula": "Formule",
  "Example": "Exemple"
};

export function normalizeCardType(type: string): string {
  return TYPE_MAP[type] ?? type;
}

export function isValidCard(c: any): c is {
  question: string;
  answer: string;
  type: string;
  id?: string;
  hint?: string;
  category?: string;
  difficulty?: number;
  bloom?: string;
  sourceSpan?: any;
  tags?: string[];
} {
  return (
    c &&
    typeof c.question === "string" &&
    c.question.length > 0 &&
    typeof c.answer === "string" &&
    c.answer.length > 0 &&
    typeof c.type === "string"
  );
}
