import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(__dirname, "../../mock_db.json");

// In-Memory & File-Persisted Database Fallback for robust local testing
class MockPrisma {
  private store: Record<string, any[]> = {
    competitorAnalysis: [],
    outline: [],
    article: [],
    autopilotKeyword: [],
    domain: [],
    autopilotLog: []
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.store = JSON.parse(content);
        console.log('[MockPrisma] Successfully loaded persistent database state from mock_db.json');
      } else {
        // Seed default queue items so the developer has something nice to see out-of-the-box!
        this.store.autopilotKeyword = [
          { id: '1', keyword: 'vibe coding', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: '2', keyword: 'agentic seo', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ];
        this.save();
      }
    } catch (e) {
      console.error('[MockPrisma] Error loading database file:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.store, null, 2), 'utf8');
    } catch (e) {
      console.error('[MockPrisma] Error saving database file:', e);
    }
  }

  private getTable(modelName: string) {
    if (!this.store[modelName]) this.store[modelName] = [];
    return this.store[modelName];
  }

  competitorAnalysis = {
    upsert: async (args: any) => {
      const table = this.getTable('competitorAnalysis');
      const idx = table.findIndex(x => x.keyword === args.where.keyword);
      const data = { ...args.create, updatedAt: new Date() };
      if (idx > -1) {
        table[idx] = { ...table[idx], ...args.update, updatedAt: new Date() };
        this.save();
        return table[idx];
      }
      table.push(data);
      this.save();
      return data;
    },
    findUnique: async (args?: any) => {
      return this.getTable('competitorAnalysis').find(x => x.keyword === args?.where?.keyword) || null;
    }
  };

  outline = {
    upsert: async (args: any) => {
      const table = this.getTable('outline');
      const idx = table.findIndex(x => x.keyword === args.where.keyword);
      const data = { ...args.create, updatedAt: new Date() };
      if (idx > -1) {
        table[idx] = { ...table[idx], ...args.update, updatedAt: new Date() };
        this.save();
        return table[idx];
      }
      table.push(data);
      this.save();
      return data;
    },
    findUnique: async (args?: any) => {
      return this.getTable('outline').find(x => x.keyword === args?.where?.keyword) || null;
    }
  };

  article = {
    upsert: async (args: any) => {
      const table = this.getTable('article');
      const idx = table.findIndex(x => x.keyword === args.where.keyword);
      const data = { id: Math.random().toString(), ...args.create, createdAt: new Date(), updatedAt: new Date() };
      if (idx > -1) {
        table[idx] = { ...table[idx], ...args.update, updatedAt: new Date() };
        this.save();
        return table[idx];
      }
      table.push(data);
      this.save();
      return data;
    },
    findFirst: async (args?: any) => {
      let art = null;
      if (args?.where?.title) {
        art = this.getTable('article').find(x => x.title === args.where.title) || null;
      } else if (args?.where?.keyword) {
        art = this.getTable('article').find(x => x.keyword === args.where.keyword) || null;
      } else {
        art = this.getTable('article')[0] || null;
      }
      if (art && args?.include?.domain) {
        const domain = this.getTable('domain').find(d => d.id === art.domainId) || null;
        return { ...art, domain };
      }
      return art;
    },
    findUnique: async (args?: any) => {
      const table = this.getTable('article');
      const art = table.find(x => x.id === args?.where?.id || x.keyword === args?.where?.keyword) || null;
      if (art && args?.include?.domain) {
        const domain = this.getTable('domain').find(d => d.id === art.domainId) || null;
        return { ...art, domain };
      }
      return art;
    },
    findMany: async (args?: any) => {
      let list = this.getTable('article');
      if (args?.where) {
        if (args.where.status) {
          list = list.filter(x => x.status === args.where.status);
        }
        if (args.where.domainId) {
          list = list.filter(x => x.domainId === args.where.domainId);
        }
      }
      if (args?.include?.domain) {
        const domains = this.getTable('domain');
        list = list.map(art => ({
          ...art,
          domain: domains.find(d => d.id === art.domainId) || null
        }));
      }
      return list;
    },
    update: async (args: any) => {
      const table = this.getTable('article');
      const idx = table.findIndex(x => x.id === args.where.id);
      if (idx > -1) {
        table[idx] = { ...table[idx], ...args.data, updatedAt: new Date() };
        this.save();
        return table[idx];
      }
      return null;
    }
  };

  autopilotKeyword = {
    findMany: async (args?: any) => {
      let list = this.getTable('autopilotKeyword');
      if (args?.where?.status) {
        list = list.filter(x => x.status === args.where.status);
      }
      return list;
    },
    findUnique: async (args?: any) => {
      return this.getTable('autopilotKeyword').find(x => x.keyword === args?.where?.keyword) || null;
    },
    create: async (args: any) => {
      const table = this.getTable('autopilotKeyword');
      const data = { id: Math.random().toString(), ...args.data, createdAt: new Date(), updatedAt: new Date() };
      table.push(data);
      this.save();
      return data;
    },
    update: async (args: any) => {
      const table = this.getTable('autopilotKeyword');
      const idx = table.findIndex(x => x.id === args.where.id);
      if (idx > -1) {
        table[idx] = { ...table[idx], ...args.data, updatedAt: new Date() };
        this.save();
        return table[idx];
      }
      return null;
    },
    delete: async (args: any) => {
      const table = this.getTable('autopilotKeyword');
      const idx = table.findIndex(x => x.id === args.where.id || x.keyword === args.where.keyword);
      if (idx > -1) {
        const deleted = table.splice(idx, 1)[0];
        this.save();
        return deleted;
      }
      return null;
    }
  };

  domain = {
    findMany: async (args?: any) => {
      let list = this.getTable('domain');
      if (args?.orderBy?.createdAt === 'desc') {
        list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return list;
    },
    findUnique: async (args?: any) => {
      if (args?.where?.id) {
        return this.getTable('domain').find(x => x.id === args.where.id) || null;
      }
      if (args?.where?.domainUrl) {
        return this.getTable('domain').find(x => x.domainUrl === args.where.domainUrl) || null;
      }
      return null;
    },
    create: async (args: any) => {
      const table = this.getTable('domain');
      if (table.some(x => x.domainUrl === args.data.domainUrl)) {
        const err = new Error('Domain already exists');
        (err as any).code = 'P2002';
        throw err;
      }
      const data = { 
        id: Math.random().toString(), 
        ...args.data, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      };
      table.push(data);
      this.save();
      return data;
    },
    delete: async (args: any) => {
      const table = this.getTable('domain');
      const idx = table.findIndex(x => x.id === args.where.id);
      if (idx > -1) {
        const deleted = table.splice(idx, 1)[0];
        this.save();
        return deleted;
      }
      return null;
    },
    update: async (args: any) => {
      const table = this.getTable('domain');
      const idx = table.findIndex(x => x.id === args.where.id);
      if (idx > -1) {
        table[idx] = { ...table[idx], ...args.data, updatedAt: new Date().toISOString() };
        this.save();
        return table[idx];
      }
      return null;
    }
  };

  autopilotLog = {
    findMany: async (args?: any) => {
      let list = this.getTable('autopilotLog');
      if (args?.where?.keyword) {
        list = list.filter(x => x.keyword === args.where.keyword);
      }
      return list;
    },
    create: async (args: any) => {
      const table = this.getTable('autopilotLog');
      const data = { id: Math.random().toString(), ...args.data, createdAt: new Date() };
      table.push(data);
      this.save();
      return data;
    }
  };
}

class SafePrismaClient {
  private realPrisma = new PrismaClient();
  private mockPrisma = new MockPrisma();
  private useMock = false;

  private async execute(model: string, method: string, args?: any) {
    if (this.useMock) {
      return (this.mockPrisma as any)[model][method](args);
    }
    try {
      return await (this.realPrisma as any)[model][method](args);
    } catch (err: any) {
      if (
        err.message?.includes("Can't reach database server") ||
        err.message?.includes("connect") ||
        err.code === "P2002" ||
        err.code === "P1001" ||
        err.code === "P2021"
      ) {
        console.warn(`[Prisma] Connection failed. Switching dynamically to Mock Database for ${model}.${method}.`);
        this.useMock = true;
        return (this.mockPrisma as any)[model][method](args);
      }
      throw err;
    }
  }

  get competitorAnalysis() {
    return {
      upsert: (args: any) => this.execute('competitorAnalysis', 'upsert', args),
      findUnique: (args?: any) => this.execute('competitorAnalysis', 'findUnique', args),
    };
  }

  get outline() {
    return {
      upsert: (args: any) => this.execute('outline', 'upsert', args),
      findUnique: (args?: any) => this.execute('outline', 'findUnique', args),
    };
  }

  get article() {
    return {
      upsert: (args: any) => this.execute('article', 'upsert', args),
      findFirst: (args?: any) => this.execute('article', 'findFirst', args),
      findMany: (args?: any) => this.execute('article', 'findMany', args),
      findUnique: (args?: any) => this.execute('article', 'findUnique', args),
      update: (args: any) => this.execute('article', 'update', args),
    };
  }

  get autopilotKeyword() {
    return {
      findMany: (args?: any) => this.execute('autopilotKeyword', 'findMany', args),
      findUnique: (args?: any) => this.execute('autopilotKeyword', 'findUnique', args),
      create: (args: any) => this.execute('autopilotKeyword', 'create', args),
      update: (args: any) => this.execute('autopilotKeyword', 'update', args),
      delete: (args: any) => this.execute('autopilotKeyword', 'delete', args),
    };
  }

  get domain() {
    return {
      findMany: (args?: any) => this.execute('domain', 'findMany', args),
      findUnique: (args?: any) => this.execute('domain', 'findUnique', args),
      create: (args: any) => this.execute('domain', 'create', args),
      delete: (args: any) => this.execute('domain', 'delete', args),
      update: (args: any) => this.execute('domain', 'update', args),
    };
  }

  get autopilotLog() {
    return {
      findMany: (args?: any) => this.execute('autopilotLog', 'findMany', args),
      create: (args: any) => this.execute('autopilotLog', 'create', args),
    };
  }
}

export const prisma = new SafePrismaClient();
