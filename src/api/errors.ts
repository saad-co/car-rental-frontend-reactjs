/**
 * Reads the message from a NestJS error body (`{ message: string | string[] }`).
 * A validation error has a list of messages; they are joined into one line.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown } | undefined)?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return fallback;
}
