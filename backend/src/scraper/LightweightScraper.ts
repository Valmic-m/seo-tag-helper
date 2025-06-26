import puppeteer from 'puppeteer-core';
import { ScanData } from '../types';
import { supabase } from '../utils/supabase';

export class LightweightScraper {
  private browser: puppeteer.Browser | null = null;
  private pagesProcessed = 0;
  private maxPages = 50; // Reduced for free tier
  
  async scanWebsite(url: string, sessionId: string): Promise<void> {
    try {
      console.log(`Starting scan for ${url} (session: ${sessionId})`);
      
      // Update status to scanning
      await this.updateSession(sessionId, { status: 'scanning' });
      
      // Launch browser with minimal resources
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
      
      const scanData: ScanData = {
        pages: [],
        totalPages: 0,
        pagesProcessed: 0,
        pagesSkipped: 0,
        errors: []
      };
      
      // Reset counters
      this.pagesProcessed = 0;
      
      // Start scanning from the root URL
      await this.scanPage(url, 0, scanData, sessionId, new Set());
      
      // Mark as completed
      scanData.completedAt = new Date().toISOString();
      scanData.totalPages = scanData.pages.length + scanData.pagesSkipped;
      
      // Save final results
      await this.updateSession(sessionId, {
        status: 'completed',
        scan_data: scanData
      });
      
      console.log(`Scan completed for ${url}. Processed: ${scanData.pagesProcessed}, Errors: ${scanData.errors.length}`);
      
    } catch (error) {
      console.error(`Scan failed for ${url}:`, error);
      await this.updateSession(sessionId, {
        status: 'failed',
        scan_data: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          pages: [],
          totalPages: 0,
          pagesProcessed: 0,
          pagesSkipped: 0,
          errors: []
        }
      });
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }
  
  private async scanPage(
    url: string,
    depth: number,
    scanData: ScanData,
    sessionId: string,
    visitedUrls: Set<string>
  ): Promise<void> {
    // Skip if already visited, too deep, or hit page limit
    if (visitedUrls.has(url) || 
        depth > 3 || 
        this.pagesProcessed >= this.maxPages) {
      if (this.pagesProcessed >= this.maxPages) {
        console.log(`Reached max pages limit (${this.maxPages})`);
      }
      return;
    }
    
    visitedUrls.add(url);
    const page = await this.browser!.newPage();
    
    try {
      console.log(`Scanning page ${this.pagesProcessed + 1}: ${url}`);
      
      // Block unnecessary resources to save bandwidth and speed up loading
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        // Block images, stylesheets, fonts, and media to focus on content
        if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Set a reasonable viewport size
      await page.setViewport({ width: 1200, height: 800 });
      
      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);
      
      // Extract page data
      const pageData = await page.evaluate(() => {
        const title = document.querySelector('title')?.textContent?.trim() || '';
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
        
        // Extract headings
        const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim() || '').filter(Boolean);
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim() || '').filter(Boolean);
        const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.textContent?.trim() || '').filter(Boolean);
        
        // Extract images
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          currentAlt: img.alt?.trim() || ''
        })).filter(img => img.src && !img.src.startsWith('data:'));
        
        // Calculate word count from visible text
        const bodyText = document.body?.textContent || '';
        const wordCount = bodyText.split(/\s+/).filter(word => word.length > 2).length;
        
        // Find internal links for further crawling
        const currentOrigin = window.location.origin;
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => {
            try {
              const href = a.getAttribute('href');
              if (!href) return null;
              
              // Convert relative URLs to absolute
              const absoluteUrl = new URL(href, window.location.href).href;
              
              // Only include internal links
              if (absoluteUrl.startsWith(currentOrigin)) {
                return absoluteUrl;
              }
            } catch (e) {
              // Invalid URL
            }
            return null;
          })
          .filter(Boolean)
          .filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
          .slice(0, 10); // Limit to 10 links per page
        
        return {
          title,
          metaDescription: metaDesc,
          headings: { h1: h1s, h2: h2s, h3: h3s },
          images: images.slice(0, 50), // Limit images to prevent memory issues
          wordCount,
          hasContent: wordCount > 50,
          internalLinks: links as string[]
        };
      });
      
      // Generate SEO recommendations
      const recommendations = this.generateRecommendations(pageData);
      
      // Add to scan data
      scanData.pages.push({
        url,
        ...pageData,
        recommendations,
        images: pageData.images.map(img => ({
          ...img,
          recommendedAlt: this.generateAltText(img.src, pageData)
        }))
      });
      
      this.pagesProcessed++;
      scanData.pagesProcessed = this.pagesProcessed;
      
      // Update progress every 3 pages
      if (this.pagesProcessed % 3 === 0) {
        await this.updateSession(sessionId, {
          scan_data: {
            ...scanData,
            lastUpdate: new Date().toISOString()
          }
        });
        console.log(`Progress update: ${this.pagesProcessed} pages processed`);
      }
      
      // Scan internal links (but not too deep)
      if (depth < 2 && pageData.internalLinks.length > 0) {
        for (const link of pageData.internalLinks.slice(0, 5)) { // Limit links per page
          if (this.pagesProcessed < this.maxPages) {
            await this.scanPage(link, depth + 1, scanData, sessionId, visitedUrls);
          }
        }
      }
      
    } catch (error) {
      console.error(`Error scanning ${url}:`, error);
      scanData.errors.push({
        url,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
      scanData.pagesSkipped++;
    } finally {
      await page.close();
    }
  }
  
  private generateRecommendations(pageData: any): any {
    const titleLength = pageData.title.length;
    const descLength = pageData.metaDescription.length;
    
    // Generate optimized title
    let optimizedTitle = pageData.title;
    if (titleLength < 30 || titleLength > 60) {
      optimizedTitle = this.optimizeTitle(pageData.title, pageData.headings.h1[0]);
    }
    
    // Generate optimized description
    let optimizedDescription = pageData.metaDescription;
    if (descLength < 120 || descLength > 160) {
      optimizedDescription = this.optimizeDescription(pageData.metaDescription, pageData.title, pageData.headings.h1[0]);
    }
    
    return {
      title: optimizedTitle,
      metaDescription: optimizedDescription,
      priority: this.calculatePriority(pageData)
    };
  }
  
  private optimizeTitle(current: string, h1?: string): string {
    if (!current || current.length < 30) {
      if (h1 && h1.length > 0) {
        return h1.length > 50 ? `${h1.slice(0, 50)}...` : `${h1} | Your Brand`;
      }
      return 'Untitled Page | Your Brand';
    }
    
    if (current.length > 60) {
      return current.slice(0, 57) + '...';
    }
    
    return current;
  }
  
  private optimizeDescription(current: string, title: string, h1?: string): string {
    if (!current || current.length < 120) {
      const baseText = h1 || title || 'Learn more about this page';
      const description = `${baseText}. Discover comprehensive information and insights.`;
      return description.length > 160 ? description.slice(0, 157) + '...' : description;
    }
    
    if (current.length > 160) {
      return current.slice(0, 157) + '...';
    }
    
    return current;
  }
  
  private calculatePriority(pageData: any): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Title issues
    if (!pageData.title || pageData.title.length < 30 || pageData.title.length > 60) {
      score += 2;
    }
    
    // Meta description issues
    if (!pageData.metaDescription || pageData.metaDescription.length < 120 || pageData.metaDescription.length > 160) {
      score += 2;
    }
    
    // Content issues
    if (!pageData.hasContent) {
      score += 3;
    }
    
    // Missing H1
    if (pageData.headings.h1.length === 0) {
      score += 1;
    }
    
    // Images without alt text
    const imagesWithoutAlt = pageData.images.filter((img: any) => !img.currentAlt).length;
    if (imagesWithoutAlt > 0) {
      score += Math.min(imagesWithoutAlt, 2); // Cap at 2 points
    }
    
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
  
  private generateAltText(src: string, pageData: any): string {
    try {
      // Extract filename without extension
      const filename = src.split('/').pop()?.split('.')[0] || 'image';
      const cleaned = filename.replace(/[-_]/g, ' ').toLowerCase();
      
      // Create descriptive alt text
      const pageTitle = pageData.title || 'page';
      return `${cleaned} on ${pageTitle}`.slice(0, 100);
    } catch (error) {
      return 'Image';
    }
  }
  
  private async updateSession(sessionId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('scan_sessions')
        .update(updates)
        .eq('id', sessionId);
      
      if (error) {
        console.error('Failed to update session:', error);
      }
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }
}