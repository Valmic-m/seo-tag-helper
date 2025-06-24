export interface ScanData {
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

export interface StartScanRequest {
  url: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
}

export interface StartScanResponse {
  sessionId: string;
  message: string;
}

export interface ScanStatusResponse {
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  pagesProcessed: number;
  totalPages: number;
  currentPage?: string;
  errors: number;
}

export interface ScanJob {
  sessionId: string;
  url: string;
}

export interface QueueJob {
  id: string;
  data: ScanJob;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  attempts: number;
}

export interface BrandColors {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export interface ScanSession {
  id: string;
  url: string;
  status: string;
  scan_data: ScanData;
  report_config: {
    brandColors?: BrandColors;
  };
  created_at: string;
  expires_at: string;
}