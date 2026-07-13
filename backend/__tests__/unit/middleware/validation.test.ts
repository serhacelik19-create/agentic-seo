import { Request, Response, NextFunction } from 'express';
import { validateAnalyze, validateAddKeyword, validatePublish } from '../../../src/middleware/validation';

const mockRequest = (body: Record<string, unknown> = {}): Partial<Request> => ({ body });

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let mockNext: jest.Mock;

beforeEach(() => {
  mockNext = jest.fn();
});

// ──────────────────────────────── validateAnalyze ────────────────────────────────

describe('validateAnalyze', () => {
  it('should reject when keyword is missing', () => {
    const req = mockRequest({}) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('keyword') })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject when keyword is empty string', () => {
    const req = mockRequest({ keyword: '   ' }) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should reject invalid limit value', () => {
    const req = mockRequest({ keyword: 'seo', limit: 10 }) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('limit') })
    );
  });

  it('should reject invalid size value', () => {
    const req = mockRequest({ keyword: 'seo', size: 'huge' }) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('size') })
    );
  });

  it('should reject invalid tone value', () => {
    const req = mockRequest({ keyword: 'seo', tone: 'angry' }) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('tone') })
    );
  });

  it('should pass with valid keyword only', () => {
    const req = mockRequest({ keyword: 'nextjs seo' }) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should pass with all valid parameters', () => {
    const req = mockRequest({
      keyword: 'react testing',
      limit: 3,
      size: 'balanced',
      tone: 'professional',
    }) as Request;
    const res = mockResponse() as Response;

    validateAnalyze(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

// ──────────────────────────────── validateAddKeyword ────────────────────────────────

describe('validateAddKeyword', () => {
  it('should reject when keyword is missing', () => {
    const req = mockRequest({}) as Request;
    const res = mockResponse() as Response;

    validateAddKeyword(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should reject when keyword is not a string', () => {
    const req = mockRequest({ keyword: 123 }) as Request;
    const res = mockResponse() as Response;

    validateAddKeyword(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should pass with valid keyword', () => {
    const req = mockRequest({ keyword: 'content marketing' }) as Request;
    const res = mockResponse() as Response;

    validateAddKeyword(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

// ──────────────────────────────── validatePublish ────────────────────────────────

describe('validatePublish', () => {
  it('should reject when title is missing', () => {
    const req = mockRequest({ content: '<p>hello</p>', platform: 'Simulation' }) as Request;
    const res = mockResponse() as Response;

    validatePublish(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('title') })
    );
  });

  it('should reject when content is missing', () => {
    const req = mockRequest({ title: 'Test', platform: 'Simulation' }) as Request;
    const res = mockResponse() as Response;

    validatePublish(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should reject invalid platform', () => {
    const req = mockRequest({ title: 'Test', content: '<p>hi</p>', platform: 'Medium' }) as Request;
    const res = mockResponse() as Response;

    validatePublish(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('platform') })
    );
  });

  it('should pass with valid title, content and platform', () => {
    const req = mockRequest({ title: 'My Article', content: '<p>Content</p>', platform: 'WordPress' }) as Request;
    const res = mockResponse() as Response;

    validatePublish(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
