import { Request, Response, NextFunction } from 'express';

/**
 * Validates request payload for /api/analyze
 */
export const validateAnalyze = (req: Request, res: Response, next: NextFunction) => {
  const { keyword, limit, size, tone } = req.body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
    return res.status(400).json({ error: 'Invalid or missing "keyword" parameter.' });
  }

  if (limit !== undefined && ![1, 3, 5].includes(Number(limit))) {
    return res.status(400).json({ error: 'Invalid "limit" parameter. Must be 1, 3, or 5.' });
  }

  if (size !== undefined && !['short', 'balanced', 'comprehensive'].includes(size)) {
    return res.status(400).json({ error: 'Invalid "size" parameter. Must be "short", "balanced", or "comprehensive".' });
  }

  if (tone !== undefined && !['professional', 'casual', 'academic', 'sales'].includes(tone)) {
    return res.status(400).json({ error: 'Invalid "tone" parameter. Must be "professional", "casual", "academic", or "sales".' });
  }

  next();
};

/**
 * Validates request payload for /api/autopilot/keywords
 */
export const validateAddKeyword = (req: Request, res: Response, next: NextFunction) => {
  const { keyword } = req.body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim() === '') {
    return res.status(400).json({ error: 'Invalid or missing "keyword" parameter.' });
  }

  next();
};

/**
 * Validates request payload for /api/publish
 */
export const validatePublish = (req: Request, res: Response, next: NextFunction) => {
  const { title, content, platform } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Invalid or missing "title" parameter.' });
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'Invalid or missing "content" parameter.' });
  }

  if (!platform || !['WordPress', 'Webflow', 'Simulation'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid or missing "platform" parameter. Must be "WordPress", "Webflow", or "Simulation".' });
  }

  next();
};
