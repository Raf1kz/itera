export class HttpError extends Error {
  constructor(
    public code: number,
    message: string,
    public extra?: unknown
  ) {
    super(message);
  }
}
export function json(code: number, data: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status: code,
    headers: { 'content-type': 'application/json', ...headers },
  });
}
export function fail(e: unknown, id: string) {
  if (e instanceof HttpError) return json(e.code, { error: e.message, requestId: id });
  return json(500, { error: 'internal_error', requestId: id });
}
