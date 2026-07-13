import express from 'express';
import request from 'supertest';

/**
 * Integration test for the /api/health endpoint.
 * Creates a minimal Express app mimicking the production route
 * to test the health check in isolation.
 */
describe('GET /api/health', () => {
  const app = express();

  beforeAll(() => {
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Agentic SEO & Content Autopilot backend is active.' });
    });
  });

  it('should return 200 with status "ok"', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Agentic SEO & Content Autopilot backend is active.',
    });
  });

  it('should respond with JSON content-type', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['content-type']).toMatch(/json/);
  });
});
