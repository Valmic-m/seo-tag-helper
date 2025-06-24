import axios from 'axios';
import { 
  StartScanRequest, 
  StartScanResponse, 
  ScanStatusResponse, 
  ScanResultsResponse,
  ReportGenerateResponse,
  BrandColors 
} from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add retry interceptor for network issues
api.interceptors.response.use(
  (response) => response,
  async (error) => {
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

export const seoApi = {
  // Start a new scan
  startScan: async (data: StartScanRequest): Promise<StartScanResponse> => {
    const response = await api.post('/api/scan/start', data);
    return response.data;
  },

  // Get scan status
  getScanStatus: async (sessionId: string): Promise<ScanStatusResponse> => {
    const response = await api.get(`/api/scan/${sessionId}/status`);
    return response.data;
  },

  // Get scan results
  getScanResults: async (sessionId: string): Promise<ScanResultsResponse> => {
    const response = await api.get(`/api/scan/${sessionId}/results`);
    return response.data;
  },

  // Generate report
  generateReport: async (sessionId: string, brandColors?: BrandColors): Promise<ReportGenerateResponse> => {
    const response = await api.post('/api/report/generate', {
      sessionId,
      brandColors
    });
    return response.data;
  },

  // Get report download URL
  getDownloadUrl: (reportId: string): string => {
    return `${API_URL}/api/report/${reportId}/download`;
  },

  // Download report
  downloadReport: async (reportId: string): Promise<void> => {
    const response = await api.get(`/api/report/${reportId}/download`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `seo-report-${new Date().toISOString().split('T')[0]}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Health check
  healthCheck: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  }
};