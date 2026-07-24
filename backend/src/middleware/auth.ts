import { Request, Response, NextFunction } from 'express';

/**
 * Basic API Key Authentication Guard middleware to protect critical endpoints.
 * Supports x-api-key header, authorization header, and api_key query parameter (for EventSource).
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey =
    req.headers?.['x-api-key'] ||
    req.headers?.['authorization'] ||
    (req.query?.api_key as string);

  const expectedKey = process.env.ADMIN_API_KEY;

  // In production, ADMIN_API_KEY must be set
  if (process.env.NODE_ENV === 'production' && !expectedKey) {
    console.error('[SECURITY ERROR] ADMIN_API_KEY is not configured in production environment!');
    return res.status(500).json({ error: 'Server Security Misconfiguration: ADMIN_API_KEY must be set in production.' });
  }

  // If expectedKey is defined in env, enforce validation
  if (expectedKey) {
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }
  }

  next();
};
