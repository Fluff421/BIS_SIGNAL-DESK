/** Server-side user id resolution. */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireUserId(_bearerToken?: string): Promise<string> {
  const authOn = process.env.VITE_AUTH_ENABLED !== "false";
  if (!authOn) {
    if (process.env.DATABASE_URL?.trim()) {
      throw new UnauthorizedError("Auth disabled but DATABASE_URL is set");
    }
    return "dev-user";
  }
  // Full session verification is in the original workspace zip.
  throw new UnauthorizedError("Not signed in");
}
