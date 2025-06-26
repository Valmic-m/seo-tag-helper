import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { InMemoryQueue } from './queue/InMemoryQueue';
import { ReportGenerator } from './report/ReportGenerator';
import { supabase } from './utils/supabase';
import { InputValidator } from './utils/validation';
import { StartScanRequest, StartScanResponse, ScanStatusResponse } from './types';

const app = express();
const queue = new InMemoryQueue();
const reportGenerator = new ReportGenerator();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow CORS for API
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Input size limits
app.use(express.json({ 
  limit: '1mb',  // Reduced from 10mb for security
  verify: (req, res, buf) => {
    // Verify JSON structure
    try {
      JSON.parse(buf.toString());
    } catch (err) {
      throw new Error('Invalid JSON');
    }
  }
}));

// General rate limiting
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Increased for general use
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Slow down repeated requests
app.use(slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
}));

// Stricter rate limiting for scan endpoints
const scanRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 scans per 15 minutes per IP
  message: {
    error: 'Too many scan requests. Please wait before starting another scan.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    queue: queue.getQueueStats()
  });
});

// Start new scan (with stricter rate limiting)
app.post('/api/scan/start', scanRateLimit, async (req, res) => {
  try {
    const { url, brandColors }: StartScanRequest = req.body;
    
    // Validate and sanitize URL
    const urlValidation = InputValidator.validateUrl(url);
    if (!urlValidation.isValid) {
      return res.status(400).json({ error: urlValidation.error });
    }
    
    // Validate and sanitize brand colors
    const colorsValidation = InputValidator.validateBrandColors(brandColors);
    if (!colorsValidation.isValid) {
      return res.status(400).json({ error: colorsValidation.error });
    }
    
    // Create session in database
    const { data: session, error } = await supabase
      .from('scan_sessions')
      .insert({
        url: urlValidation.sanitized,
        status: 'pending',
        report_config: { brandColors: colorsValidation.sanitized || {} }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create scan session' });
    }
    
    // Add to processing queue
    try {
      await queue.add({
        sessionId: session.id,
        url: urlValidation.sanitized
      });
      
      console.log(`Scan started for ${urlValidation.sanitized} (session: ${session.id})`);
      
      const response: StartScanResponse = {
        sessionId: session.id,
        message: 'Scan started successfully'
      };
      
      res.json(response);
      
    } catch (queueError) {
      console.error('Queue error:', queueError);
      
      // Update session status to failed
      await supabase
        .from('scan_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);
      
      return res.status(500).json({ error: 'Failed to queue scan' });
    }
    
  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scan status
app.get('/api/scan/:id/status', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Validate session ID
    const sessionValidation = InputValidator.validateSessionId(sessionId);
    if (!sessionValidation.isValid) {
      return res.status(400).json({ error: sessionValidation.error });
    }
    
    const { data, error } = await supabase
      .from('scan_sessions')
      .select('status, scan_data, url')
      .eq('id', sessionValidation.sanitized)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const scanData = data.scan_data || {};
    
    const response: ScanStatusResponse = {
      status: data.status as 'pending' | 'scanning' | 'completed' | 'failed',
      pagesProcessed: scanData.pagesProcessed || 0,
      totalPages: scanData.totalPages || scanData.pagesProcessed || 0,
      currentPage: scanData.currentPage,
      errors: scanData.errors?.length || 0
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to get scan status' });
  }
});

// Get scan results
app.get('/api/scan/:id/results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const { data, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (data.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Scan not completed', 
        status: data.status 
      });
    }
    
    res.json({
      sessionId: data.id,
      url: data.url,
      status: data.status,
      scanData: data.scan_data,
      createdAt: data.created_at,
      completedAt: data.scan_data?.completedAt
    });
    
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to get scan results' });
  }
});

// Generate report
app.post('/api/report/generate', async (req, res) => {
  try {
    const { sessionId, brandColors } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Check if session exists and is completed
    const { data: session, error } = await supabase
      .from('scan_sessions')
      .select('status, scan_data')
      .eq('id', sessionId)
      .single();
    
    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Scan must be completed before generating report',
        status: session.status
      });
    }
    
    if (!session.scan_data || !session.scan_data.pages || session.scan_data.pages.length === 0) {
      return res.status(400).json({ error: 'No scan data available for report' });
    }
    
    console.log(`Generating report for session ${sessionId}`);
    
    const reportId = await reportGenerator.generateReport(sessionId, brandColors);
    
    res.json({
      reportId,
      downloadUrl: `/api/report/${reportId}/download`,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Download report
app.get('/api/report/:id/download', (req, res) => {
  try {
    const reportId = req.params.id;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }
    
    const buffer = reportGenerator.getReport(reportId);
    
    if (!buffer) {
      return res.status(404).json({ error: 'Report not found or expired' });
    }
    
    const filename = `seo-report-${new Date().toISOString().split('T')[0]}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    console.log(`Report downloaded: ${reportId}`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// Queue statistics (for monitoring)
app.get('/api/queue/stats', (req, res) => {
  try {
    const stats = queue.getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ error: 'Failed to get queue statistics' });
  }
});

// Database cleanup endpoint
app.post('/api/admin/cleanup', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('cleanup_and_count');
    
    if (error) {
      console.error('Cleanup error:', error);
      return res.status(500).json({ error: 'Cleanup failed' });
    }
    
    // Also cleanup in-memory queue
    queue.cleanup();
    
    res.json({ 
      message: 'Cleanup completed',
      deletedSessions: data || 0
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup database' });
  }
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SEO Tool Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});

// Cleanup old data every hour
setInterval(async () => {
  try {
    await supabase.rpc('cleanup_and_count');
    queue.cleanup();
    console.log('Periodic cleanup completed');
  } catch (error) {
    console.error('Periodic cleanup failed:', error);
  }
}, 60 * 60 * 1000);

// Keep alive for Render.com (ping self to prevent sleep)
if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
  setInterval(async () => {
    const hour = new Date().getHours();
    // Only ping during business hours to save resources
    if (hour >= 8 && hour <= 22) {
      try {
        const response = await fetch(`${process.env.BACKEND_URL}/health`);
        if (response.ok) {
          console.log('Keep-alive ping successful');
        }
      } catch (error) {
        console.error('Keep-alive ping failed:', error);
      }
    }
  }, 14 * 60 * 1000); // Every 14 minutes
}

export default app;