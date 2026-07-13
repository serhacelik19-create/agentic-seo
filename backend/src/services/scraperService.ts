import puppeteer from 'puppeteer';

export interface ScrapedArticle {
  title: string;
  url: string;
  headers: { tag: string; text: string }[];
  bodyExcerpt: string;
}

export class ScraperService {
  /**
   * Searches Google for a specific keyword in English and scrapes the top ranking articles.
   * @param keyword The keyword to search for
   * @param limit Maximum number of articles to scrape (default 3)
   */
  public static async scrapeCompetitors(keyword: string, limit: number = 3): Promise<ScrapedArticle[]> {
    console.log(`[ScraperService] Launching browser. Keyword: "${keyword}"`);
    
    const browserlessUrl = process.env.BROWSERLESS_URL;
    const proxyServer = process.env.PROXY_SERVER;
    const proxyUsername = process.env.PROXY_USERNAME;
    const proxyPassword = process.env.PROXY_PASSWORD;

    let browser;
    if (browserlessUrl) {
      console.log(`[ScraperService] Connecting to Browserless.io: ${browserlessUrl}`);
      browser = await puppeteer.connect({ browserWSEndpoint: browserlessUrl });
    } else {
      console.log('[ScraperService] Launching local Puppeteer browser.');
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ];
      if (proxyServer) {
        console.log(`[ScraperService] Configuring rotating proxy: ${proxyServer}`);
        args.push(`--proxy-server=${proxyServer}`);
      }
      browser = await puppeteer.launch({
        headless: true,
        args
      });
    }

    const page = await browser.newPage();
    if (proxyUsername && proxyPassword) {
      await page.authenticate({ username: proxyUsername, password: proxyPassword });
    }
    // Use modern user-agent to bypass basic bot detections
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const scrapedArticles: ScrapedArticle[] = [];

    try {
      // Use &hl=en to prioritize English search results globally
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=en`;
      console.log(`[ScraperService] Querying Google SERP: ${searchUrl}`);
      
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Robust evaluation function to collect organic links
      const competitorLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const links: { title: string; url: string }[] = [];
        
        for (const anchor of anchors) {
          const href = anchor.href;
          const h3 = anchor.querySelector('h3');
          
          if (h3 && href && href.startsWith('http')) {
            const domain = new URL(href).hostname;
            // Exclude main google properties and ads
            if (!domain.includes('google.com') && !domain.includes('youtube.com')) {
              links.push({
                title: h3.innerText.trim(),
                url: href
              });
            }
          }
        }
        return links;
      });

      console.log(`[ScraperService] Found ${competitorLinks.length} competitor links. Scraping first ${limit} pages.`);
      const targets = competitorLinks.slice(0, limit);

      for (const target of targets) {
        console.log(`[ScraperService] Scraping page: ${target.url}`);
        const competitorPage = await browser.newPage();
        if (proxyUsername && proxyPassword) {
          await competitorPage.authenticate({ username: proxyUsername, password: proxyPassword });
        }
        await competitorPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        try {
          await competitorPage.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 });

          const articleData = await competitorPage.evaluate(() => {
            // Collect page headings (H1, H2, H3) for outline mapping
            const headerElements = Array.from(document.querySelectorAll('h1, h2, h3'));
            const headers = headerElements.map(el => ({
              tag: el.tagName.toLowerCase(),
              text: el.textContent ? el.textContent.trim() : ''
            })).filter(h => h.text.length > 3);

            // Collect main body text excerpt from paragraph tags
            const pElements = Array.from(document.querySelectorAll('p'));
            const fullText = pElements
              .map(el => el.textContent ? el.textContent.trim() : '')
              .filter(txt => txt.length > 20)
              .join('\n\n');

            // Limit excerpt to prevent token limit overflows
            const bodyExcerpt = fullText.slice(0, 4000);

            return {
              headers,
              bodyExcerpt
            };
          });

          scrapedArticles.push({
            title: target.title,
            url: target.url,
            headers: articleData.headers,
            bodyExcerpt: articleData.bodyExcerpt
          });

          console.log(`[ScraperService] Successfully scraped: ${target.title} (${articleData.headers.length} headers, ~${articleData.bodyExcerpt.length} characters of body text)`);
        } catch (err: any) {
          console.error(`[ScraperService] Error scraping page ${target.url}: ${err.message}`);
          // Fallback to empty data to keep the pipeline alive
          scrapedArticles.push({
            title: target.title,
            url: target.url,
            headers: [],
            bodyExcerpt: 'Content could not be scraped.'
          });
        } finally {
          await competitorPage.close();
        }
      }

    } catch (error: any) {
      console.error(`[ScraperService] General scraping error: ${error.message}`);
    } finally {
      await browser.close();
      console.log(`[ScraperService] Browser closed.`);
    }

    return scrapedArticles;
  }

  /**
   * Crawls a competitor domain's sitemap.xml to find newly published articles.
   * If a sitemap index is found, it recursively crawls the sub-sitemaps (like post-sitemap.xml).
   */
  public static async crawlSitemap(domain: string): Promise<string[]> {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    const sitemapUrl = `https://${cleanDomain}/sitemap.xml`;
    console.log(`[ScraperService] Attempting to crawl sitemap for domain: ${sitemapUrl}`);

    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap.xml (Status: ${response.status})`);
      }

      const xmlText = await response.text();
      
      // Extract loc tags using regex to avoid heavy XML parser dependencies
      const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
      let matches: string[] = [];
      let match;
      while ((match = locRegex.exec(xmlText)) !== null) {
        matches.push(match[1].trim());
      }

      // Filter out main domain, categories, tags, or sitemaps
      const articleUrls = matches.filter(url => {
        const lowerUrl = url.toLowerCase();
        // Skip sitemap index urls themselves
        if (lowerUrl.includes('sitemap') && lowerUrl.endsWith('.xml')) {
          return false;
        }
        // Skip root domain and simple assets
        const urlObj = new URL(url);
        const path = urlObj.pathname.replace(/\/$/, '');
        if (!path || path.length < 3) return false;
        if (path.includes('/category/') || path.includes('/tag/') || path.includes('/author/')) return false;
        
        return true;
      });

      // If we found sub-sitemaps (e.g. post-sitemap.xml), let's crawl the first post-sitemap
      const subSitemaps = matches.filter(url => url.toLowerCase().includes('sitemap') && url.endsWith('.xml'));
      if (subSitemaps.length > 0 && articleUrls.length === 0) {
        // Find a post or article sitemap if possible, otherwise crawl the first sub-sitemap
        const targetSitemap = subSitemaps.find(url => url.toLowerCase().includes('post') || url.toLowerCase().includes('article')) || subSitemaps[0];
        console.log(`[ScraperService] Sitemap index detected. Crawling sub-sitemap: ${targetSitemap}`);
        
        const subResponse = await fetch(targetSitemap, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (subResponse.ok) {
          const subXml = await subResponse.text();
          let subMatches: string[] = [];
          let subMatch;
          const subLocRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
          while ((subMatch = subLocRegex.exec(subXml)) !== null) {
            subMatches.push(subMatch[1].trim());
          }
          return subMatches.filter(url => {
            const urlObj = new URL(url);
            const path = urlObj.pathname.replace(/\/$/, '');
            return path && path.length > 3 && !path.includes('/category/') && !path.includes('/tag/') && !path.includes('/author/');
          });
        }
      }

      return articleUrls;
    } catch (error: any) {
      console.error(`[ScraperService] Error crawling sitemap: ${error.message}`);
      return []; // Return empty array so fallback / simulated logic can run gracefully
    }
  }
}
