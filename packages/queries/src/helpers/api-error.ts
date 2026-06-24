/**
 * Pulls a human-readable message out of an Axios/Nest error envelope.
 * Returns null if no usable string can be derived; callers should fall back
 * to a context-specific default.
 */
export function extractErrorMessage(err: unknown): string | null {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    typeof err.response === 'object' &&
    err.response &&
    'data' in err.response &&
    typeof err.response.data === 'object' &&
    err.response.data &&
    'message' in err.response.data
  ) {
    const message = (err.response.data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  if (err instanceof Error) return err.message;
  return null;
}
