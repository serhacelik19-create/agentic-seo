import { Request, Response, NextFunction } from 'express';
import { requireApiKey } from '../../../src/middleware/auth';

// Helpers to create mock Express objects
const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('requireApiKey middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (mockNext as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should call next() when ADMIN_API_KEY is not set in env', () => {
    delete process.env.ADMIN_API_KEY;

    const req = mockRequest({}) as Request;
    const res = mockResponse() as Response;

    requireApiKey(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when ADMIN_API_KEY is set but no key is provided', () => {
    process.env.ADMIN_API_KEY = 'test-secret-key';

    const req = mockRequest({}) as Request;
    const res = mockResponse() as Response;

    requireApiKey(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: Invalid or missing API Key.',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when provided API key does not match', () => {
    process.env.ADMIN_API_KEY = 'test-secret-key';

    const req = mockRequest({ 'x-api-key': 'wrong-key' }) as Request;
    const res = mockResponse() as Response;

    requireApiKey(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() when x-api-key header matches', () => {
    process.env.ADMIN_API_KEY = 'test-secret-key';

    const req = mockRequest({ 'x-api-key': 'test-secret-key' }) as Request;
    const res = mockResponse() as Response;

    requireApiKey(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should call next() when authorization header matches', () => {
    process.env.ADMIN_API_KEY = 'test-secret-key';

    const req = mockRequest({ authorization: 'test-secret-key' }) as Request;
    const res = mockResponse() as Response;

    requireApiKey(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
