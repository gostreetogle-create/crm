import type { ErrorRequestHandler } from 'express';

export const httpErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[backend]', err);
  res.status(500).json({ error: 'internal_error' });
};
