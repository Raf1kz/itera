export type NormalizedCard = {
  front: string;
  back: string;
  tags: string[];
};

export type NormalizedSummary = {
  title: string;
  content: string;
};

export function buildGenerateSchemas(z: any) {
  const GenerateInputSchema = z.object({
    text: z.string().min(20).max(80_000).optional(),
    url: z.string().url().optional(),
    deckName: z.string().min(1).max(100).default('General'),
    options: z
      .object({
        targetCards: z.number().int().min(1).max(80).default(20),
        makeSummary: z.boolean().default(true),
        summaryDetail: z.enum(['brief', 'standard', 'deep']).default('deep'),
      })
      .default({}),
  }).refine(
    (data: any) => data.text || data.url,
    { message: 'Either text or url must be provided' }
  );

  const ModelCardSchema = z.object({
    front: z.any(),
    back: z.any(),
    tags: z.array(z.any()).optional(),
  });

  const ModelSummarySchema = z.object({
    title: z.any().optional(),
    content: z.any(),
  });

  const ModelResponseSchema = z
    .object({
      cards: z.array(ModelCardSchema).optional(),
      summary: ModelSummarySchema.optional(),
    })
    .strict()
    .partial({
      cards: true,
      summary: true,
    });

  function normalizeModelResponse(payload: unknown): {
    cards: NormalizedCard[];
    summary: NormalizedSummary | null;
  } {
    const parsed = ModelResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return { cards: [], summary: null };
    }

    const raw = parsed.data;

    const cards: NormalizedCard[] = Array.isArray(raw.cards)
      ? raw.cards
          .filter((card: any) => card && typeof card === 'object' && card.front && card.back)
          .map((card: any) => ({
            front: String(card.front).slice(0, 4_000),
            back: String(card.back).slice(0, 8_000),
            tags: Array.isArray(card.tags)
              ? card.tags
                  .filter((tag: any) => typeof tag === 'string' || typeof tag === 'number')
                  .slice(0, 10)
                  .map((tag: any) => String(tag))
              : [],
          }))
      : [];

    const summary =
      raw.summary && raw.summary.content
        ? {
            title: raw.summary.title ? String(raw.summary.title).slice(0, 200) : 'Summary',
            content: String(raw.summary.content).slice(0, 120_000),
          }
        : null;

    return { cards, summary };
  }

  return { GenerateInputSchema, normalizeModelResponse };
}
