import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getDomains = async (req: Request, res: Response) => {
  try {
    const domains = await prisma.domain.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(domains);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createDomain = async (req: Request, res: Response) => {
  try {
    const { domainUrl, name, brandTone } = req.body;
    if (!domainUrl || !name) {
      return res.status(400).json({ error: 'domainUrl and name are required' });
    }
    const newDomain = await prisma.domain.create({
      data: { domainUrl, name, brandTone }
    });
    res.json(newDomain);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Domain already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

export const deleteDomain = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.domain.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDomainWebflowConfig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { webflowConfig } = req.body;
    
    const updated = await prisma.domain.update({
      where: { id },
      data: { webflowConfig: typeof webflowConfig === 'object' ? JSON.stringify(webflowConfig) : webflowConfig }
    });
    
    res.json({ success: true, domain: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
