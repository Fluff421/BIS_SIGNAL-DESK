/** Handle /auth/popup OAuth flow for live preview. */
export async function handleAuthPopupRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId") ?? "";
  // Full popup completion HTML is in the original workspace zip.
  return new Response(
    `<!doctype html><html><body><p>Auth popup stub for ${providerId}</p></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
