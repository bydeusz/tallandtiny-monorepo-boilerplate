import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incomingHeader = req.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incomingHeader === 'string'
      ? incomingHeader
      : Array.isArray(incomingHeader)
        ? incomingHeader[0]
        : undefined;

  req.id = requestId ?? randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
