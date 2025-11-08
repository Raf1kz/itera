import { z } from 'zod';
import { buildGenerateSchemas, type NormalizedCard, type NormalizedSummary } from './schema.shared';
// @ts-ignore - tsconfig.tests maps this for node environment

const { GenerateInputSchema, normalizeModelResponse } = buildGenerateSchemas(z);

export { GenerateInputSchema, normalizeModelResponse };
export type { NormalizedCard, NormalizedSummary };
