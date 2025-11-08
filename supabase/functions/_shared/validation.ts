import { z } from 'https://esm.sh/zod@3.23.8';
export { z };
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  const p = schema.safeParse(data);
  if (!p.success) throw new Error(p.error.message);
  // deno-lint-ignore no-explicit-any
  return p.data as any;
}
