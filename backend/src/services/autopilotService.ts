import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { ScraperService } from './scraperService';
import { GeminiService } from './geminiService';
import { PublishService } from './publishService';
import { progressEmitter } from '../lib/progressEmitter';

export class AutopilotService {
  private static isRunning = false;

  /**
   * Initializes the 24/7 Autopilot Background Scheduler.
   * Runs every day at midnight (0 0 * * *), but in this development mode,
   * it can also be triggered manually or run at a faster interval if configured.
   */
  public static startScheduler() {
    console.log('[Autopilot] Initializing 24/7 SEO Autopilot Background Scheduler...');
    
    // Check for pending autopilot jobs every hour
    cron.schedule('0 * * * *', async () => {
      console.log('[Autopilot] Scheduled hourly heartbeat. Checking for pending SEO keywords...');
      await this.processNextKeyword();
    });
  }

  /**
   * Processes the next pending keyword in the Autopilot queue.
   */
  public static async processNextKeyword(): Promise<{ success: boolean; keyword?: string; error?: string }> {
    if (this.isRunning) {
      console.log('[Autopilot] Autopilot is already processing a keyword. Skipping execution.');
      return { success: false, error: 'Autopilot is currently busy.' };
    }

    this.isRunning = true;
    let keyword = '';
    let job: any = null;

    try {
      // 1. Fetch first pending keyword
      const pendingJobs = await prisma.autopilotKeyword.findMany({
        where: { status: 'pending' }
      });

      if (pendingJobs.length === 0) {
        console.log('[Autopilot] No pending keywords in queue.');
        this.isRunning = false;
        return { success: false, error: 'No pending keywords.' };
      }

      job = pendingJobs[0];
      keyword = job.keyword;
      console.log(`\n[Autopilot] Autopilot Started for keyword: "${keyword}" (Job ID: ${job.id})`);

      // Update status to processing
      await prisma.autopilotKeyword.update({
        where: { id: job.id },
        data: { status: 'processing' }
      });

      await this.emitAndLogProgress({ 
        keyword, 
        step: 1, 
        totalSteps: 7, 
        percentage: 5, 
        message: 'Autopilot queue initiated...', 
        status: 'processing',
        agentName: 'Orchestrator Agent',
        agentMessage: 'Otonom otopilot görev sırası başarıyla başlatıldı. Sıradaki kelime işleniyor.'
      });

      // 2. [Observe] Scrape competitors
      await this.emitAndLogProgress({ 
        keyword, 
        step: 2, 
        totalSteps: 7, 
        percentage: 15, 
        message: 'Scraping top competitors and Google SERP data...', 
        status: 'processing',
        agentName: 'Researcher Agent',
        agentMessage: 'Google SERP sonuçları için Puppeteer ile otonom tarayıcıyı başlatıyorum. En üst sıradaki 3 rakip sayfa analiz edilecek.'
      });
      console.log(`[Autopilot][Observe] Scraping top 3 competitors for "${keyword}"...`);
      const competitors = await ScraperService.scrapeCompetitors(keyword, 3);
      await prisma.competitorAnalysis.upsert({
        where: { keyword },
        update: { competitors: JSON.stringify(competitors) },
        create: { keyword, competitors: JSON.stringify(competitors) }
      });

      // 3. [Think] Multi-Agent Outline Strategizing
      await this.emitAndLogProgress({ 
        keyword, 
        step: 3, 
        totalSteps: 7, 
        percentage: 30, 
        message: 'Generating Multi-Agent content gap and SEO analysis report...', 
        status: 'processing',
        agentName: 'Researcher Agent',
        agentMessage: 'Tarama tamamlandı! Rakiplerde bazı semantik eksiklikler tespit edildi. Çıkarılan içerik boşluk raporunu Stratejist Ajanıma iletiyorum.'
      });
      console.log(`[Autopilot][Think] Generating Multi-Agent analysis & SEO Gap report...`);
      const gapReport = await GeminiService.researchContentGaps(keyword, competitors);
      console.log(`[Researcher Agent Report]: ${gapReport}`);

      await this.emitAndLogProgress({ 
        keyword, 
        step: 4, 
        totalSteps: 7, 
        percentage: 45, 
        message: 'Strategizing optimized outlines and headlines...', 
        status: 'processing',
        agentName: 'Strategist Agent',
        agentMessage: 'Boşluk analizini aldım. Google\'da ilk sıraya yerleşmek amacıyla, tüm kullanıcı arama niyetlerini karşılayacak en ideal semantik anahatları (Outline) ve başlık kurgusunu tasarlıyorum.'
      });
      console.log(`[Autopilot][Think] Strategizing optimized outlines and headlines...`);
      const outline = await GeminiService.generateSEOOutline(keyword, competitors, 'balanced', 'professional');
      await prisma.outline.upsert({
        where: { keyword },
        update: { headings: JSON.stringify(outline) },
        create: { keyword, headings: JSON.stringify(outline) }
      });

      // 4. [Act] Generate & Enhance Article
      await this.emitAndLogProgress({ 
        keyword, 
        step: 5, 
        totalSteps: 7, 
        percentage: 65, 
        message: 'Writing final premium article content with AI...', 
        status: 'processing',
        agentName: 'Writer Agent',
        agentMessage: 'Anahat planını devraldım. Profesyonel tonlama kurallarına sadık kalarak, intihal içermeyen ve bilgi yoğunluğu yüksek HTML makale gövdesini yazmaya başlıyorum.'
      });
      console.log(`[Autopilot][Act] Writing final premium article draft...`);
      let content = await GeminiService.generateFullArticle(keyword, outline, competitors, 'professional');

      // 4b. AI/Stock Featured Image Prompt Generation
      await this.emitAndLogProgress({ 
        keyword, 
        step: 6, 
        totalSteps: 7, 
        percentage: 80, 
        message: 'Generating featured image and scanning internal linking...', 
        status: 'processing',
        agentName: 'Creative Designer Agent',
        agentMessage: 'Makale başlığı için görsel metaforlar üretiyorum. Yapay zeka ile görsel oluşturulabilmesi için yüksek çözünürlüklü kapak resmi yönlendiricilerini hazırladım.'
      });
      console.log(`[Autopilot][Act] Requesting featured image cover...`);
      const imageUrl = await GeminiService.generateFeaturedImagePrompt(keyword, outline.suggestedTitle);

      // 4c. Inject Internal Linker Agent
      await this.emitAndLogProgress({ 
        keyword, 
        step: 6, 
        totalSteps: 7, 
        percentage: 85, 
        message: 'Injecting internal linking structures...', 
        status: 'processing',
        agentName: 'Technical SEO Auditor',
        agentMessage: 'Sitedeki eski yazıları tarıyorum. Semantik bütünlük sağlamak için yeni makale içerisine ilgili dahili linkleri yerleştiriyorum ve Schema.org JSON-LD FAQ şemasını enjekte ediyorum.'
      });
      console.log(`[Autopilot][Act] Scanning published articles to inject internal linking...`);
      const existingArticles = await prisma.article.findMany({
        where: { status: 'published' }
      });
      content = GeminiService.injectInternalLinks(content, existingArticles);

      // Save article to DB
      const article = await prisma.article.upsert({
        where: { keyword },
        update: {
          title: outline.suggestedTitle,
          content,
          tone: 'professional',
          featuredImage: imageUrl,
          status: 'draft'
        },
        create: {
          keyword,
          title: outline.suggestedTitle,
          content,
          tone: 'professional',
          featuredImage: imageUrl,
          status: 'draft'
        }
      });

      // 5. Publish to Webhook / Default active CMS (WordPress/Webflow Simulation)
      await this.emitAndLogProgress({ 
        keyword, 
        step: 7, 
        totalSteps: 7, 
        percentage: 95, 
        message: 'Auto-publishing to integrated CMS...', 
        status: 'processing',
        agentName: 'Orchestrator Agent',
        agentMessage: 'Makale taslağı ve teknik SEO hazırlıkları tamam. WordPress ve Webflow API entegrasyonu üzerinden yayına alma işlemini başlatıyorum.'
      });
      console.log(`[Autopilot][Act] Auto-publishing to integrated CMS platform...`);
      
      const domain = job.domainId ? await prisma.domain.findUnique({ where: { id: job.domainId } }) : null;
      const webflowConfig = domain?.webflowConfig || undefined;

      const publishResult = await PublishService.publish(outline.suggestedTitle, content, 'WordPress', {
        featuredImage: imageUrl,
        webflowConfig
      });

      // Update publishing details
      await prisma.article.update({
        where: { id: article.id },
        data: {
          status: 'published',
          publishedUrl: publishResult.url || `http://localhost:3000/blog/${article.id}`
        }
      });

      // 6. Complete Autopilot Job
      await prisma.autopilotKeyword.update({
        where: { id: job.id },
        data: { status: 'completed' }
      });

      console.log(`[Autopilot] Autopilot successfully finished for keyword: "${keyword}"!\n`);
      await this.emitAndLogProgress({ 
        keyword, 
        step: 7, 
        totalSteps: 7, 
        percentage: 100, 
        message: 'Autopilot successfully completed!', 
        status: 'completed',
        agentName: 'Orchestrator Agent',
        agentMessage: 'Otonom otopilot döngüsü eksiksiz tamamlandı! Yeni SEO makalesi başarıyla yayınlandı ve canlıya alındı.'
      });
      
      this.isRunning = false;

      // Auto-trigger next keyword in queue with a brief cooldown
      setTimeout(async () => {
        await this.processNextKeyword();
      }, 2000);

      return { success: true, keyword };
    } catch (error: any) {
      console.error(`[Autopilot] Error during autopilot run: ${error.message}`);
      
      if (job) {
        try {
          await prisma.autopilotKeyword.update({
            where: { id: job.id },
            data: { status: 'failed' }
          });
        } catch (dbErr) {
          console.error('[Autopilot] Failed to set job status to failed:', dbErr);
        }
      }

      if (keyword) {
        await this.emitAndLogProgress({ 
          keyword, 
          step: 7, 
          totalSteps: 7, 
          percentage: 100, 
          message: `Autopilot failed: ${error.message}`, 
          status: 'failed',
          agentName: 'Orchestrator Agent',
          agentMessage: `Otopilot işlemi başarısız oldu: ${error.message}`
        });
      }

      this.isRunning = false;

      // Auto-trigger next keyword in queue even if one fails
      setTimeout(async () => {
        await this.processNextKeyword();
      }, 2000);

      return { success: false, error: error.message };
    }
  }

  /**
   * Persists an autopilot agent execution step into the database.
   */
  private static async logStep(keyword: string, step: number, agentName: string, message: string, status: string) {
    try {
      await prisma.autopilotLog.create({
        data: {
          keyword,
          step,
          agentName,
          message,
          status
        }
      });
      console.log(`[DB Log] Successfully logged step ${step} for keyword "${keyword}"`);
    } catch (dbErr: any) {
      console.error('[Autopilot Log] Failed to save log step in database:', dbErr.message);
    }
  }

  /**
   * Helper that broadcasts a progress event via SSE and concurrently persists it as an audit log.
   */
  private static async emitAndLogProgress(params: {
    keyword: string;
    step: number;
    totalSteps: number;
    percentage: number;
    message: string;
    status: 'processing' | 'completed' | 'failed';
    agentName?: string;
    agentMessage?: string;
  }) {
    progressEmitter.emitProgress(params);
    await this.logStep(
      params.keyword,
      params.step,
      params.agentName || 'Orchestrator Agent',
      params.agentMessage || params.message,
      params.status
    );
  }
}
