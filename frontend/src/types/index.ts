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

export interface ScanStatusResponse {
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  pagesProcessed: number;
  totalPages: number;
  currentPage?: string;
  errors: number;
}

export interface BrandColors {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

export interface StartScanRequest {
  url: string;
  brandColors?: BrandColors;
}

export interface StartScanResponse {
  sessionId: string;
  message: string;
}

export interface ScanResultsResponse {
  sessionId: string;
  url: string;
  status: string;
  scanData: ScanData;
  createdAt: string;
  completedAt?: string;
}

export interface ReportGenerateResponse {
  reportId: string;
  downloadUrl: string;
  expiresAt: string;
}