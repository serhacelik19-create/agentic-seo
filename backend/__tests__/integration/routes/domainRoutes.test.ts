import express from 'express';
import request from 'supertest';

/**
 * Integration test for domain routes.
 * Mocks Prisma and sets up the full Express router chain
 * (middleware + controller) using supertest.
 */

// Mock Prisma before importing routes
jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    domain: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../src/lib/prisma';
import domainRoutes from '../../../src/routes/domainRoutes';

const app = express();
app.use(express.json());
app.use('/api/domains', domainRoutes);

describe('Domain Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear ADMIN_API_KEY so requireApiKey middleware passes through
    delete process.env.ADMIN_API_KEY;
  });

  // ──────────────────────────────── GET /api/domains ────────────────────────────────

  describe('GET /api/domains', () => {
    it('should return all domains', async () => {
      const mockDomains = [
        { id: '1', domainUrl: 'https://example.com', name: 'Example' },
      ];
      (prisma.domain.findMany as jest.Mock).mockResolvedValue(mockDomains);

      const res = await request(app).get('/api/domains');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockDomains);
    });

    it('should return empty array when no domains exist', async () => {
      (prisma.domain.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get('/api/domains');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ──────────────────────────────── POST /api/domains ────────────────────────────────

  describe('POST /api/domains', () => {
    it('should create a new domain with valid body', async () => {
      const newDomain = { id: 'new-1', domainUrl: 'https://new.com', name: 'New Site' };
      (prisma.domain.create as jest.Mock).mockResolvedValue(newDomain);

      const res = await request(app)
        .post('/api/domains')
        .send({ domainUrl: 'https://new.com', name: 'New Site' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(newDomain);
    });

    it('should return 400 when domainUrl is missing', async () => {
      const res = await request(app)
        .post('/api/domains')
        .send({ name: 'No URL' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for duplicate domain', async () => {
      (prisma.domain.create as jest.Mock).mockRejectedValue({ code: 'P2002', message: 'Unique' });

      const res = await request(app)
        .post('/api/domains')
        .send({ domainUrl: 'https://dup.com', name: 'Dup' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Domain already exists');
    });
  });

  // ──────────────────────────────── DELETE /api/domains/:id ────────────────────────────────

  describe('DELETE /api/domains/:id', () => {
    it('should delete a domain by id', async () => {
      (prisma.domain.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app).delete('/api/domains/domain-1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('should return 500 when domain not found', async () => {
      (prisma.domain.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));

      const res = await request(app).delete('/api/domains/nonexistent');

      expect(res.status).toBe(500);
    });
  });

  // ──────────────────────────────── PUT /api/domains/:id/webflow-config ────────────────────────────────

  describe('PUT /api/domains/:id/webflow-config', () => {
    it('should update webflow config', async () => {
      const updated = { id: '1', webflowConfig: '{"titleField":"name"}' };
      (prisma.domain.update as jest.Mock).mockResolvedValue(updated);

      const res = await request(app)
        .put('/api/domains/1/webflow-config')
        .send({ webflowConfig: { titleField: 'name' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ──────────────────────────────── Auth Guard ────────────────────────────────

  describe('Auth middleware on protected routes', () => {
    it('should reject POST when ADMIN_API_KEY is set but not provided', async () => {
      process.env.ADMIN_API_KEY = 'my-secret';

      const res = await request(app)
        .post('/api/domains')
        .send({ domainUrl: 'https://blocked.com', name: 'Blocked' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should allow POST when correct API key is provided', async () => {
      process.env.ADMIN_API_KEY = 'my-secret';
      const newDomain = { id: 'auth-1', domainUrl: 'https://ok.com', name: 'OK' };
      (prisma.domain.create as jest.Mock).mockResolvedValue(newDomain);

      const res = await request(app)
        .post('/api/domains')
        .set('x-api-key', 'my-secret')
        .send({ domainUrl: 'https://ok.com', name: 'OK' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(newDomain);
    });

    it('should allow GET without API key (public route)', async () => {
      process.env.ADMIN_API_KEY = 'my-secret';
      (prisma.domain.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get('/api/domains');

      expect(res.status).toBe(200);
    });
  });
});
