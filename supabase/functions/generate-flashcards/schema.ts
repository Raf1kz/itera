import { z } from '../_shared/zod.ts';
import {
  buildGenerateSchemas,
  type NormalizedCard,
  type NormalizedSummary,
} from './schema.shared.ts';

const { GenerateInputSchema, normalizeModelResponse } = buildGenerateSchemas(z);

export { GenerateInputSchema, normalizeModelResponse };
export type { NormalizedCard, NormalizedSummary };
