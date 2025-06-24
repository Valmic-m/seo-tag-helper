import React, { useState, useEffect } from 'react';
import ScanForm from './components/ScanForm';
import ScanProgress from './components/ScanProgress';
import ScanResults from './components/ScanResults';
import { seoApi } from './utils/api';
import { ScanStatusResponse, ScanData, BrandColors } from './types';

type AppState = 'form' | 'scanning' | 'results' | 'error';

function App() {
  const [appState, setAppState] = useState<AppState>('form');
  const [sessionId, setSessionId] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<ScanStatusResponse | null>(null);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Poll for scan status updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (appState === 'scanning' && sessionId) {
      pollInterval = setInterval(async () => {
        try {
          const status = await seoApi.getScanStatus(sessionId);
          setScanStatus(status);

          if (status.status === 'completed') {
            // Fetch full results
            const results = await seoApi.getScanResults(sessionId);
            setScanData(results.scanData);
            setAppState('results');
          } else if (status.status === 'failed') {
            setError('Scan failed. Please check the URL and try again.');
            setAppState('error');
          }
        } catch (error) {
          console.error('Error polling scan status:', error);
          setError('Failed to get scan status. Please try again.');
          setAppState('error');
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [appState, sessionId]);

  const handleStartScan = async (inputUrl: string, brandColors?: BrandColors) => {
    try {
      setError('');
      setUrl(inputUrl);
      
      const response = await seoApi.startScan({
        url: inputUrl,
        brandColors
      });
      
      setSessionId(response.sessionId);
      setAppState('scanning');
    } catch (error: any) {
      console.error('Error starting scan:', error);
      setError(error.response?.data?.error || 'Failed to start scan. Please try again.');
      setAppState('error');
    }
  };

  const handleGenerateReport = async (brandColors?: BrandColors) => {
    try {
      setIsGeneratingReport(true);
      
      const reportResponse = await seoApi.generateReport(sessionId, brandColors);
      
      // Download the report
      await seoApi.downloadReport(reportResponse.reportId);
      
    } catch (error: any) {
      console.error('Error generating report:', error);
      setError(error.response?.data?.error || 'Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleStartNewScan = () => {
    setAppState('form');
    setSessionId('');
    setScanStatus(null);
    setScanData(null);
    setUrl('');
    setError('');
    setIsGeneratingReport(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      padding: '2rem 1rem'
    }}>
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>
          SEO Tag Helper Tool
        </h1>
        <p style={{ 
          fontSize: '1.125rem',
          color: '#6b7280',
          margin: 0
        }}>
          Automated website analysis and optimization recommendations
        </p>
      </header>

      {/* Main Content */}
      <main>
        {appState === 'form' && (
          <ScanForm 
            onSubmit={handleStartScan} 
            isLoading={false}
          />
        )}

        {appState === 'scanning' && scanStatus && (
          <ScanProgress 
            status={scanStatus} 
            url={url}
          />
        )}

        {appState === 'results' && scanData && (
          <ScanResults
            scanData={scanData}
            url={url}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
            onStartNewScan={handleStartNewScan}
          />
        )}

        {appState === 'error' && (
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fee2e2',
              borderRadius: '6px',
              borderLeft: '4px solid #ef4444',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>
                Error
              </h3>
              <p style={{ margin: 0, color: '#7f1d1d' }}>
                {error}
              </p>
            </div>
            
            <button
              onClick={handleStartNewScan}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        marginTop: '4rem',
        padding: '2rem',
        color: '#6b7280'
      }}>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          Built with React, Node.js, and Puppeteer • Hosted on free tiers
        </p>
      </footer>
    </div>
  );
}

export default App;