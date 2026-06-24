// The API wraps every transformed response as
// { success, statusCode, data, meta, requestId, timestamp, path }.
// `meta` is a sibling of `data`: null for single resources, a pagination
// object for lists. The generated `*List200` types are `{ meta, data }`,
// so for paginated responses we must return BOTH (not just `data`) to keep
// pagination meta available and the generated types honest.
export function unwrapEnvelope<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    const envelope = body as { data: unknown; meta?: unknown };
    if (envelope.meta !== null && envelope.meta !== undefined) {
      return { data: envelope.data, meta: envelope.meta } as T;
    }
    return envelope.data as T;
  }
  return body as T;
}
