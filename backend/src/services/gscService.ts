import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// If GSC Service Account exists, it will use it. Otherwise, it will return a simulated rank for demo purposes.
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../gsc-service-account.json');

export class GSCService {
  static async getKeywordRank(siteUrl: string, keyword: string): Promise<number | null> {
    try {
      if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.log(`[GSC] No service account found at ${SERVICE_ACCOUNT_PATH}. Simulating rank for demo.`);
        // Simulate a rank between 1 and 100
        return Math.floor(Math.random() * 50) + 1;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_PATH,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });

      const searchconsole = google.searchconsole({ version: 'v1', auth });

      // Usually you query the last 7 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Format siteUrl for GSC (must match exactly how it is in GSC, e.g. sc-domain:example.com or https://example.com/)
      const siteUrlFormatted = siteUrl.includes('http') ? siteUrl : `sc-domain:${siteUrl}`;

      const res = await searchconsole.searchanalytics.query({
        siteUrl: siteUrlFormatted,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: 'query',
                  operator: 'equals',
                  expression: keyword
                }
              ]
            }
          ],
          rowLimit: 1
        }
      });

      if (res.data.rows && res.data.rows.length > 0) {
        return res.data.rows[0].position || null;
      }

      return null;
    } catch (error: any) {
      console.error(`[GSC] Error fetching rank for ${keyword} on ${siteUrl}: ${error.message}`);
      return null; // Return null gracefully on failure
    }
  }
}
