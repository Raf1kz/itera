type Handler = (req: Request, ctx: { requestId: string }) => Promise<Response>;

export function withRequestId(handler: Handler): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const response = await handler(req, { requestId });
    const headers = new Headers(response.headers);
    headers.set('x-request-id', requestId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
