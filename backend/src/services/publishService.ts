import dotenv from 'dotenv';

dotenv.config();

export interface PublishResult {
  success: boolean;
  platform: 'WordPress' | 'Webflow' | 'Simulation';
  url?: string;
  message: string;
}

export class PublishService {
  /**
   * Publishes the generated article on the configured or chosen blog platform.
   */
  public static async publish(
    title: string, 
    content: string, 
    platform: 'WordPress' | 'Webflow' | 'Simulation' = 'Simulation',
    options?: { featuredImage?: string; webflowConfig?: string }
  ): Promise<PublishResult> {
    console.log(`[PublishService] Publishing article. Platform: ${platform}, Title: "${title}"`);

    switch (platform) {
      case 'WordPress':
        return this.publishToWordPress(title, content, options);
      case 'Webflow':
        return this.publishToWebflow(title, content, options);
      case 'Simulation':
      default:
        return this.simulatePublish(title, content);
    }
  }

  /**
   * Helper method to download featured image from Unsplash and upload to WordPress Media library.
   */
  private static async uploadWordPressMedia(
    imageUrl: string,
    wpUrl: string,
    credentialsStr: string
  ): Promise<number | null> {
    try {
      console.log(`[PublishService] Fetching image from Unsplash to upload to WordPress: ${imageUrl}`);
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error('Failed to download featured image from source.');
      
      const buffer = await imgRes.arrayBuffer();
      const mediaEndpoint = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
      
      console.log(`[PublishService] Uploading image binary to WordPress media library...`);
      const response = await fetch(mediaEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentialsStr}`,
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'attachment; filename="featured_image.jpg"'
        },
        body: Buffer.from(buffer)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[PublishService] WordPress Media Upload Failed: ${response.status} - ${errorText}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`[PublishService] Successfully uploaded featured image to WordPress. Media ID: ${data.id}`);
      return data.id;
    } catch (err: any) {
      console.error(`[PublishService] WordPress featured image upload failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Publishes the article as a draft on WordPress via the WordPress REST API.
   */
  private static async publishToWordPress(
    title: string, 
    content: string, 
    options?: { featuredImage?: string }
  ): Promise<PublishResult> {
    const wpUrl = process.env.WORDPRESS_URL;
    const wpUser = process.env.WORDPRESS_USER;
    const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpUrl || !wpUser || !wpAppPassword) {
      return {
        success: false,
        platform: 'WordPress',
        message: 'WordPress credentials or URL are missing in the .env file.'
      };
    }

    try {
      const endpoint = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
      const credentials = Buffer.from(`${wpUser}:${wpAppPassword}`).toString('base64');

      console.log(`[PublishService] Querying WordPress REST API: ${endpoint}`);

      // Handle featured image upload
      let featuredMediaId: number | null = null;
      if (options?.featuredImage) {
        featuredMediaId = await this.uploadWordPressMedia(options.featuredImage, wpUrl, credentials);
      }

      const bodyPayload: any = {
        title: title,
        content: content,
        status: 'draft', // default to draft for security
        format: 'standard'
      };

      if (featuredMediaId) {
        bodyPayload.featured_media = featuredMediaId;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        platform: 'WordPress',
        url: data.link,
        message: `Article successfully uploaded to WordPress as a Draft! Post ID: ${data.id}` + (featuredMediaId ? ' (Featured Image successfully attached)' : '')
      };
    } catch (err: any) {
      console.error(`[PublishService] WordPress publishing error: ${err.message}`);
      return {
        success: false,
        platform: 'WordPress',
        message: `Failed to upload to WordPress: ${err.message}`
      };
    }
  }

  /**
   * Publishes the article as a CMS item on Webflow via the Webflow CMS v2 API.
   */
  private static async publishToWebflow(
    title: string, 
    content: string, 
    options?: { featuredImage?: string; webflowConfig?: string }
  ): Promise<PublishResult> {
    const token = process.env.WEBFLOW_API_TOKEN;
    const collectionId = process.env.WEBFLOW_COLLECTION_ID || 'mock_collection_id';

    if (!token) {
      return {
        success: false,
        platform: 'Webflow',
        message: 'Webflow API Token (WEBFLOW_API_TOKEN) is missing in the .env file.'
      };
    }

    try {
      const endpoint = `https://api.webflow.com/v2/collections/${collectionId}/items`;
      console.log(`[PublishService] Querying Webflow CMS API: ${endpoint}`);

      let fieldData: any = {
        name: title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        'post-body': content // Rich text block identifier inside your collection template
      };

      // Apply dynamic mapping configuration if provided
      if (options?.webflowConfig) {
        try {
          const config = typeof options.webflowConfig === 'string' ? JSON.parse(options.webflowConfig) : options.webflowConfig;
          if (config && typeof config === 'object') {
            const mappedData: any = {};
            const titleKey = config.titleField || 'name';
            const slugKey = config.slugField || 'slug';
            const bodyKey = config.bodyField || 'post-body';
            const imageKey = config.imageField || 'main-image';
            
            mappedData[titleKey] = title;
            mappedData[slugKey] = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            mappedData[bodyKey] = content;
            
            if (options.featuredImage && imageKey) {
              mappedData[imageKey] = options.featuredImage;
            }
            
            fieldData = { ...fieldData, ...mappedData };
            console.log('[PublishService] Dynamically mapped Webflow fields using config:', fieldData);
          }
        } catch (e: any) {
          console.error('[PublishService] Failed to parse webflowConfig:', e.message);
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fieldData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webflow API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        platform: 'Webflow',
        url: `https://webflow.com/dashboard`,
        message: `Article successfully added to Webflow CMS Collection! Item ID: ${data.id}`
      };
    } catch (err: any) {
      console.error(`[PublishService] Webflow publishing error: ${err.message}`);
      return {
        success: false,
        platform: 'Webflow',
        message: `Failed to upload to Webflow: ${err.message}`
      };
    }
  }

  /**
   * Generates a simulated successful publish result for local testing/presentations.
   */
  private static async simulatePublish(title: string, content: string): Promise<PublishResult> {
    // Artificial delay to simulate real network request
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Point dynamically to local server to allow testing micro-blog page rendering
    const simulatedUrl = `http://localhost:3000/blog/temp_preview`;

    console.log(`[PublishService] Simulated publishing completed successfully.`);
    
    return {
      success: true,
      platform: 'Simulation',
      url: simulatedUrl,
      message: 'Simulation Mode: Article has been successfully stored in the local simulated drafts repository and is ready to review.'
    };
  }
}
