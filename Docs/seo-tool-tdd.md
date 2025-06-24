# SEO Tag Helper Tool - Technical Design Document (Zero-Cost Edition)

## 1. System Architecture Overview

### 1.1 Zero-Cost Architecture
```
┌─────────────────────┐         ┌────────────────────┐         ┌─────────────────┐
│  React Frontend     │   API   │  Node.js Backend   │   DB    │   PostgreSQL    │
│  (Vercel Free)     │ ←────→  │  (Render.com Free) │ ←────→  │ (Supabase Free) │
│                     │         │                    │         │                 │
└─────────────────────┘         └────────────────────┘         └─────────────────┘
                                         ↓
                                ┌────────────────────┐
                                │  In-Memory Queue   │
                                │  (No Redis)        │
                                └────────────────────┘
                                         ↓
                                ┌────────────────────┐
                                │ Puppeteer Scraper  │
                                │ (Single Instance)  │
                                └────────────────────┘
```

### 1.2 Technology Stack (All Free)
- **Frontend**: React with TypeScript → Vercel (100GB bandwidth/month)
- **Backend**: Node.js + Express → Render.com (750 hours/month)
- **Database**: PostgreSQL → Supabase (500MB storage)
- **Queue**: In-memory JavaScript queue (no Redis)
- **Scraping**: Puppeteer (lightweight configuration)
- **Email**: Resend (100 emails/day) - Optional
- **File Storage**: Temporary server memory (3-hour cleanup)

## 2. Database Schema (Simplified)

### 2.1 Minimal Tables for Supabase

```sql
-- Main table using JSONB for flexibility
CREATE TABLE scan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(2048) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    scan_data JSONB DEFAULT '{}',
    report_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '3 hours'
);

-- Email collection (optional feature)
CREATE TABLE email_list (
    email VARCHAR(255) PRIMARY KEY,
    website_url VARCHAR(2048),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_status ON scan_sessions(status);
CREATE INDEX idx_sessions_expires ON scan_sessions(expires_at);

-- Auto-cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() 
RETURNS void AS $$
BEGIN
    DELETE FROM scan_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');
```

### 2.2 JSONB Structure for scan_data

```typescript
interface ScanData {
  pages: Array<{
    url: string;
    title: string;
    metaDescription: string;
    recommendations: {
      title: string;
      metaDescription: string;
      priority: 'high' | 'medium' | 'low';
    };
    images: Array<{
      src: string;
      currentAlt: string;
      recommendedAlt: string;
    }>;
    headings: {
      h1: string[];
      h2: string[];
      h3: string[];
    };
    wordCount: number;
    hasContent: boolean;
  }>;
  totalPages: number;
  pagesProcessed: number;
  pagesSkipped: number;
  errors: Array<{
    url: string;
    reason: string;
  }>;
  completedAt?: string;
}
```

## 3. API Endpoints (Simplified)

### 3.1 Core API Routes

```typescript
// Scan Management
POST   /api/scan/start          // Start new scan
GET    /api/scan/:id/status     // Get scan progress
GET    /api/scan/:id/results    // Get scan results

// Report Generation  
POST   /api/report/generate     // Generate Word report
GET    /api/report/:id/download // Download report

// Optional Email
POST   /api/report/:id/email    // Email report

// Health Check
GET    /health                  // Keep Render.com awake
```

### 3.2 Request/Response Schemas

```typescript
// POST /api/scan/start
interface StartScanRequest {
  url: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
}

interface StartScanResponse {
  sessionId: string;
  message: string;
}

// GET /api/scan/:id/status
interface ScanStatusResponse {
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  pagesProcessed: number;
  totalPages: number;
  currentPage?: string;
  errors: number;
}
```

## 4. Core Components (Memory-Optimized)

### 4.1 In-Memory Queue Implementation

```typescript
// queue/InMemoryQueue.ts
export class InMemoryQueue {
  private queue: Map<string, QueueJob> = new Map();
  private processing = false;
  private maxConcurrent = 1; // Single job at a time for free tier
  
  async add(jobData: ScanJob): Promise<string> {
    const jobId = crypto.randomUUID();
    
    this.queue.set(jobId, {
      id: jobId,
      data: jobData,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0
    });
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return jobId;
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.size > 0) {
      const pendingJobs = Array.from(this.queue.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      if (pendingJobs.length === 0) break;
      
      const job = pendingJobs[0];
      job.status = 'processing';
      
      try {
        await this.executeJob(job);
        job.status = 'completed';
        this.queue.delete(job.id);
      } catch (error) {
        job.attempts++;
        if (job.attempts < 3) {
          job.status = 'pending';
          await this.delay(5000); // Wait 5s before retry
        } else {
          job.status = 'failed';
          this.queue.delete(job.id);
        }
      }
    }
    
    this.processing = false;
  }
  
  private async executeJob(job: QueueJob): Promise<void> {
    const scraper = new LightweightScraper();
    await scraper.scanWebsite(job.data.url, job.data.sessionId);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.2 Lightweight Web Scraper

```typescript
// scraper/LightweightScraper.ts
export class LightweightScraper {
  private browser: puppeteer.Browser | null = null;
  private pagesProcessed = 0;
  private maxPages = 50; // Reduced for free tier
  
  async scanWebsite(url: string, sessionId: string): Promise<void> {
    try {
      // Update status
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
          '--disable-web-security'
        ]
      });
      
      const scanData: ScanData = {
        pages: [],
        totalPages: 0,
        pagesProcessed: 0,
        pagesSkipped: 0,
        errors: []
      };
      
      // Start scanning
      await this.scanPage(url, 0, scanData, sessionId, new Set());
      
      // Save results
      await this.updateSession(sessionId, {
        status: 'completed',
        scan_data: scanData
      });
      
    } catch (error) {
      await this.updateSession(sessionId, {
        status: 'failed',
        scan_data: { error: error.message }
      });
    } finally {
      if (this.browser) {
        await this.browser.close();
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
    // Skip if already visited or limits reached
    if (visitedUrls.has(url) || 
        depth > 3 || 
        this.pagesProcessed >= this.maxPages) {
      return;
    }
    
    visitedUrls.add(url);
    const page = await this.browser!.newPage();
    
    try {
      // Block resources to save bandwidth
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Extract page data
      const pageData = await page.evaluate(() => {
        const title = document.querySelector('title')?.textContent || '';
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        
        const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent || '');
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent || '');
        const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.textContent || '');
        
        const images = Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          currentAlt: img.alt || ''
        }));
        
        const bodyText = document.body?.textContent || '';
        const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;
        
        // Find internal links
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.href)
          .filter(href => href.startsWith(window.location.origin))
          .slice(0, 10); // Limit to 10 links per page
        
        return {
          title,
          metaDescription: metaDesc,
          headings: { h1: h1s, h2: h2s, h3: h3s },
          images,
          wordCount,
          hasContent: wordCount > 50,
          internalLinks: links
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
      
      // Update progress
      if (this.pagesProcessed % 5 === 0) {
        await this.updateSession(sessionId, {
          scan_data: {
            ...scanData,
            lastUpdate: new Date().toISOString()
          }
        });
      }
      
      // Scan internal links
      if (depth < 3) {
        for (const link of pageData.internalLinks) {
          await this.scanPage(link, depth + 1, scanData, sessionId, visitedUrls);
        }
      }
      
    } catch (error) {
      scanData.errors.push({
        url,
        reason: error.message
      });
      scanData.pagesSkipped++;
    } finally {
      await page.close();
    }
  }
  
  private generateRecommendations(pageData: any): any {
    // Simple SEO rules
    const titleLength = pageData.title.length;
    const descLength = pageData.metaDescription.length;
    
    return {
      title: titleLength < 30 || titleLength > 60 
        ? this.optimizeTitle(pageData.title, pageData.headings.h1[0])
        : pageData.title,
      metaDescription: descLength < 120 || descLength > 160
        ? this.optimizeDescription(pageData.metaDescription, pageData.title)
        : pageData.metaDescription,
      priority: this.calculatePriority(pageData)
    };
  }
  
  private optimizeTitle(current: string, h1: string): string {
    if (!current || current.length < 30) {
      return h1 ? `${h1.slice(0, 50)} | Your Brand` : 'Untitled Page | Your Brand';
    }
    if (current.length > 60) {
      return current.slice(0, 57) + '...';
    }
    return current;
  }
  
  private optimizeDescription(current: string, title: string): string {
    if (!current || current.length < 120) {
      return `Learn more about ${title}. ${current}`.slice(0, 155) + '...';
    }
    if (current.length > 160) {
      return current.slice(0, 157) + '...';
    }
    return current;
  }
  
  private calculatePriority(pageData: any): 'high' | 'medium' | 'low' {
    const issues = [];
    if (!pageData.title || pageData.title.length < 30 || pageData.title.length > 60) issues.push(1);
    if (!pageData.metaDescription || pageData.metaDescription.length < 120) issues.push(1);
    if (!pageData.hasContent) issues.push(2);
    if (pageData.images.filter(img => !img.currentAlt).length > 0) issues.push(1);
    
    const score = issues.reduce((a, b) => a + b, 0);
    if (score >= 3) return 'high';
    if (score >= 1) return 'medium';
    return 'low';
  }
  
  private generateAltText(src: string, pageData: any): string {
    // Simple alt text generation
    const filename = src.split('/').pop()?.split('.')[0] || 'image';
    const cleaned = filename.replace(/[-_]/g, ' ');
    return `${cleaned} on ${pageData.title || 'page'}`.slice(0, 100);
  }
  
  private async updateSession(sessionId: string, updates: any): Promise<void> {
    const { error } = await supabase
      .from('scan_sessions')
      .update(updates)
      .eq('id', sessionId);
    
    if (error) {
      console.error('Failed to update session:', error);
    }
  }
}
```

### 4.3 Report Generator (Memory-Efficient)

```typescript
// report/ReportGenerator.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } from 'docx';

export class ReportGenerator {
  private reportCache = new Map<string, Buffer>();
  
  async generateReport(sessionId: string, brandColors?: BrandColors): Promise<string> {
    // Check cache first
    if (this.reportCache.has(sessionId)) {
      return sessionId;
    }
    
    // Fetch session data
    const { data: session } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!session || !session.scan_data) {
      throw new Error('Session not found or incomplete');
    }
    
    const scanData = session.scan_data as ScanData;
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          ...this.createCoverPage(session.url, brandColors),
          ...this.createExecutiveSummary(scanData),
          ...this.createPageAnalysis(scanData.pages),
          ...this.createImageAnalysis(scanData.pages)
        ]
      }]
    });
    
    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Cache with auto-cleanup
    this.reportCache.set(sessionId, buffer);
    setTimeout(() => {
      this.reportCache.delete(sessionId);
    }, 3 * 60 * 60 * 1000); // 3 hours
    
    return sessionId;
  }
  
  getReport(sessionId: string): Buffer | null {
    return this.reportCache.get(sessionId) || null;
  }
  
  private createCoverPage(url: string, brandColors?: BrandColors): Paragraph[] {
    return [
      new Paragraph({
        text: "SEO Analysis Report",
        heading: HeadingLevel.TITLE,
        alignment: 'center',
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: url,
        alignment: 'center',
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: `Generated on ${new Date().toLocaleDateString()}`,
        alignment: 'center',
        spacing: { after: 600 }
      })
    ];
  }
  
  private createExecutiveSummary(scanData: ScanData): Paragraph[] {
    const highPriorityCount = scanData.pages.filter(p => p.recommendations.priority === 'high').length;
    
    return [
      new Paragraph({
        text: "Executive Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: `Total Pages Analyzed: ${scanData.pagesProcessed}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `High Priority Issues: ${highPriorityCount}`,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: `Pages Skipped: ${scanData.pagesSkipped}`,
        spacing: { after: 400 }
      })
    ];
  }
  
  private createPageAnalysis(pages: any[]): Paragraph[] {
    const elements: Paragraph[] = [
      new Paragraph({
        text: "Page-by-Page Analysis",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    ];
    
    pages.forEach((page, index) => {
      elements.push(
        new Paragraph({
          text: `Page ${index + 1}: ${page.url}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          text: `Current Title (${page.title.length} chars): ${page.title}`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `Recommended Title: ${page.recommendations.title}`,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `Current Description (${page.metaDescription.length} chars): ${page.metaDescription || 'None'}`,
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: `Recommended Description: ${page.recommendations.metaDescription}`,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `Priority: ${page.recommendations.priority.toUpperCase()}`,
          spacing: { after: 200 }
        })
      );
    });
    
    return elements;
  }
  
  private createImageAnalysis(pages: any[]): Paragraph[] {
    const elements: Paragraph[] = [
      new Paragraph({
        text: "Image Optimization",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    ];
    
    pages.forEach(page => {
      if (page.images.length === 0) return;
      
      elements.push(
        new Paragraph({
          text: page.url,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        })
      );
      
      page.images.forEach((img: any, i: number) => {
        if (!img.currentAlt) {
          elements.push(
            new Paragraph({
              text: `Image ${i + 1}: Missing alt text`,
              spacing: { after: 50 }
            }),
            new Paragraph({
              text: `Recommended: ${img.recommendedAlt}`,
              spacing: { after: 100 }
            })
          );
        }
      });
    });
    
    return elements;
  }
}
```

## 5. API Implementation

### 5.1 Express Server Setup

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { InMemoryQueue } from './queue/InMemoryQueue';
import { ReportGenerator } from './report/ReportGenerator';

const app = express();
const queue = new InMemoryQueue();
const reportGenerator = new ReportGenerator();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-app.vercel.app'
}));
app.use(express.json({ limit: '10mb' }));

// Simple rate limiting
const requestCounts = new Map<string, number[]>();
const rateLimiter = (req: any, res: any, next: any) => {
  const ip = req.ip;
  const now = Date.now();
  const requests = requestCounts.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 20) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  next();
};

app.use(rateLimiter);

// Routes
app.post('/api/scan/start', async (req, res) => {
  try {
    const { url, brandColors } = req.body;
    
    // Validate URL
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Create session
    const { data: session, error } = await supabase
      .from('scan_sessions')
      .insert({
        url,
        report_config: { brandColors }
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Add to queue
    await queue.add({
      sessionId: session.id,
      url
    });
    
    res.json({
      sessionId: session.id,
      message: 'Scan started successfully'
    });
    
  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

app.get('/api/scan/:id/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scan_sessions')
      .select('status, scan_data')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    const scanData = data.scan_data || {};
    
    res.json({
      status: data.status,
      pagesProcessed: scanData.pagesProcessed || 0,
      totalPages: scanData.totalPages || 0,
      currentPage: scanData.currentPage,
      errors: scanData.errors?.length || 0
    });
    
  } catch (error) {
    res.status(404).json({ error: 'Session not found' });
  }
});

app.post('/api/report/generate', async (req, res) => {
  try {
    const { sessionId, brandColors } = req.body;
    
    const reportId = await reportGenerator.generateReport(sessionId, brandColors);
    
    res.json({
      reportId,
      downloadUrl: `/api/report/${reportId}/download`,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/report/:id/download', (req, res) => {
  const buffer = reportGenerator.getReport(req.params.id);
  
  if (!buffer) {
    return res.status(404).json({ error: 'Report not found or expired' });
  }
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename=seo-report.docx');
  res.send(buffer);
});

// Health check endpoint (important for Render.com)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep alive during business hours (optional)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      try {
        await fetch(`${process.env.BACKEND_URL}/health`);
      } catch (error) {
        console.error('Self-ping failed');
      }
    }
  }, 14 * 60 * 1000); // Every 14 minutes
}
```

## 6. Frontend Configuration

### 6.1 API Client with Retry Logic

```typescript
// api/client.ts
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
});

// Add retry interceptor for Render.com cold starts
api.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    
    if (!config || config.__retryCount >= 3) {
      return Promise.reject(error);
    }
    
    config.__retryCount = config.__retryCount || 0;
    config.__retryCount++;
    
    // Wait before retry (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, config.__retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return api(config);
  }
);
```

### 6.2 Vercel Deployment Config

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@backend-url"
  }
}
```

## 7. Deployment Instructions

### 7.1 Supabase Setup

1. Create free account at supabase.com
2. Create new project
3. Run the database schema from section 2.1
4. Get connection details from Settings > Database

### 7.2 Backend Deployment (Render.com)

```yaml
# render.yaml
services:
  - type: web
    name: seo-tool-backend
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: node dist/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: BACKEND_URL
        sync: false
```

### 7.3 Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable in Vercel dashboard
# REACT_APP_API_URL = https://your-backend.onrender.com
```

## 8. Environment Variables

### 8.1 Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# URLs
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-backend.onrender.com

# Optional Email (Resend)
RESEND_API_KEY=your-resend-key
```

### 8.2 Frontend (.env)

```bash
REACT_APP_API_URL=https://your-backend.onrender.com
```

## 9. Cost Summary

### 9.1 Free Tier Limits

| Service | Free Tier | Our Usage | Buffer |
|---------|-----------|-----------|--------|
| Vercel | 100GB/month | ~10GB/month | 90GB |
| Render.com | 750 hours/month | 24/7 running | OK |
| Supabase | 500MB storage | ~100MB | 400MB |
| Resend | 100 emails/day | Optional | 100/day |

### 9.2 Scaling Path

When ready to scale:

1. **$7/month**: Render.com Starter (no spin-down)
2. **$25/month**: + Supabase Pro (8GB storage)
3. **$50/month**: + Redis for proper queuing
4. **$100+/month**: Multiple workers, CDN, monitoring

## 10. Monitoring & Maintenance

### 10.1 Basic Health Monitoring

```typescript
// monitoring/health.ts
export async function checkSystemHealth() {
  const checks = {
    database: false,
    memory: false,
    diskSpace: false
  };
  
  // Check database
  try {
    const { error } = await supabase.from('scan_sessions').select('count').single();
    checks.database = !error;
  } catch {}
  
  // Check memory (Render.com has 512MB limit)
  const used = process.memoryUsage();
  checks.memory = used.heapUsed < 400 * 1024 * 1024; // Alert at 400MB
  
  return checks;
}
```

### 10.2 Auto-Cleanup Cron

```typescript
// Set up in Supabase SQL editor
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 * * * *', -- Every hour
  $$DELETE FROM scan_sessions WHERE expires_at < NOW()$$
);
```

---

This Technical Design Document provides a complete blueprint for building the SEO Tag Helper Tool using only free services and resources. The architecture is optimized for zero-cost operation while maintaining good performance and user experience.