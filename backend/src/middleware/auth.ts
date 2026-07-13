import { Request, Response, NextFunction } from 'express';

/**
 * Basic API Key Authentication Guard middleware to protect critical endpoints.
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  const expectedKey = process.env.ADMIN_API_KEY;

  // If expectedKey is defined in env, enforce validation
  if (expectedKey) {
    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
    }
  }

  next();
};
