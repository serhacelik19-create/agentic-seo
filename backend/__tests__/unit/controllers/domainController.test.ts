import { Request, Response } from 'express';
import { getDomains, createDomain, deleteDomain, updateDomainWebflowConfig } from '../../../src/controllers/domainController';

// Mock Prisma client
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

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ──────────────────────────────── getDomains ────────────────────────────────

describe('getDomains', () => {
  it('should return all domains ordered by createdAt desc', async () => {
    const mockDomains = [
      { id: '1', domainUrl: 'https://example.com', name: 'Example', createdAt: new Date() },
      { id: '2', domainUrl: 'https://test.com', name: 'Test', createdAt: new Date() },
    ];
    (prisma.domain.findMany as jest.Mock).mockResolvedValue(mockDomains);

    const req = {} as Request;
    const res = mockResponse() as Response;

    await getDomains(req, res);

    expect(prisma.domain.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    expect(res.json).toHaveBeenCalledWith(mockDomains);
  });

  it('should return 500 on database error', async () => {
    (prisma.domain.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const req = {} as Request;
    const res = mockResponse() as Response;

    await getDomains(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection failed' });
  });
});

// ──────────────────────────────── createDomain ────────────────────────────────

describe('createDomain', () => {
  it('should create a domain with valid data', async () => {
    const newDomain = { id: '3', domainUrl: 'https://new.com', name: 'New', brandTone: 'Professional' };
    (prisma.domain.create as jest.Mock).mockResolvedValue(newDomain);

    const req = { body: { domainUrl: 'https://new.com', name: 'New', brandTone: 'Professional' } } as Request;
    const res = mockResponse() as Response;

    await createDomain(req, res);

    expect(prisma.domain.create).toHaveBeenCalledWith({
      data: { domainUrl: 'https://new.com', name: 'New', brandTone: 'Professional' },
    });
    expect(res.json).toHaveBeenCalledWith(newDomain);
  });

  it('should return 400 when domainUrl is missing', async () => {
    const req = { body: { name: 'No URL' } } as Request;
    const res = mockResponse() as Response;

    await createDomain(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'domainUrl and name are required' });
  });

  it('should return 400 when name is missing', async () => {
    const req = { body: { domainUrl: 'https://no-name.com' } } as Request;
    const res = mockResponse() as Response;

    await createDomain(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 for duplicate domain (Prisma P2002)', async () => {
    (prisma.domain.create as jest.Mock).mockRejectedValue({ code: 'P2002', message: 'Unique constraint' });

    const req = { body: { domainUrl: 'https://dup.com', name: 'Dup' } } as Request;
    const res = mockResponse() as Response;

    await createDomain(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Domain already exists' });
  });
});

// ──────────────────────────────── deleteDomain ────────────────────────────────

describe('deleteDomain', () => {
  it('should delete domain by id', async () => {
    (prisma.domain.delete as jest.Mock).mockResolvedValue({});

    const req = { params: { id: 'domain-1' } } as unknown as Request;
    const res = mockResponse() as Response;

    await deleteDomain(req, res);

    expect(prisma.domain.delete).toHaveBeenCalledWith({ where: { id: 'domain-1' } });
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('should return 500 on delete failure', async () => {
    (prisma.domain.delete as jest.Mock).mockRejectedValue(new Error('Not found'));

    const req = { params: { id: 'nonexistent' } } as unknown as Request;
    const res = mockResponse() as Response;

    await deleteDomain(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ──────────────────────────────── updateDomainWebflowConfig ────────────────────────────────

describe('updateDomainWebflowConfig', () => {
  it('should update with object webflowConfig (JSON.stringify)', async () => {
    const config = { titleField: 'name', bodyField: 'content' };
    (prisma.domain.update as jest.Mock).mockResolvedValue({ id: '1', webflowConfig: JSON.stringify(config) });

    const req = { params: { id: '1' }, body: { webflowConfig: config } } as unknown as Request;
    const res = mockResponse() as Response;

    await updateDomainWebflowConfig(req, res);

    expect(prisma.domain.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { webflowConfig: JSON.stringify(config) },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('should update with string webflowConfig directly', async () => {
    const configStr = '{"titleField":"name"}';
    (prisma.domain.update as jest.Mock).mockResolvedValue({ id: '1', webflowConfig: configStr });

    const req = { params: { id: '1' }, body: { webflowConfig: configStr } } as unknown as Request;
    const res = mockResponse() as Response;

    await updateDomainWebflowConfig(req, res);

    expect(prisma.domain.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { webflowConfig: configStr },
    });
  });

  it('should return 500 on update failure', async () => {
    (prisma.domain.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

    const req = { params: { id: 'bad-id' }, body: { webflowConfig: {} } } as unknown as Request;
    const res = mockResponse() as Response;

    await updateDomainWebflowConfig(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
