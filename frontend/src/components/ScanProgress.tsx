import React from 'react';
import { ScanStatusResponse } from '../types';

interface ScanProgressProps {
  status: ScanStatusResponse;
  url: string;
}

const ScanProgress: React.FC<ScanProgressProps> = ({ status, url }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'scanning': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Preparing to scan...';
      case 'scanning': return 'Scanning website...';
      case 'completed': return 'Scan completed!';
      case 'failed': return 'Scan failed';
      default: return 'Unknown status';
    }
  };

  const progressPercentage = status.totalPages > 0 
    ? Math.round((status.pagesProcessed / Math.max(status.totalPages, status.pagesProcessed)) * 100)
    : status.pagesProcessed > 0 ? 50 : 0;

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '2rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#1f2937', textAlign: 'center' }}>
        SEO Analysis in Progress
      </h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#1f2937' }}>
            Analyzing: {url}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <span style={{ 
            fontWeight: 'bold',
            color: getStatusColor(status.status)
          }}>
            {getStatusMessage(status.status)}
          </span>
          <span style={{ color: '#6b7280' }}>
            {status.pagesProcessed} pages processed
          </span>
        </div>

        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: getStatusColor(status.status),
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>

        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <span>0%</span>
          <span>{progressPercentage}%</span>
          <span>100%</span>
        </div>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#3b82f6'
          }}>
            {status.pagesProcessed}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Pages Scanned
          </div>
        </div>

        {status.totalPages > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#10b981'
            }}>
              {status.totalPages}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Total Found
            </div>
          </div>
        )}

        {status.errors > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#ef4444'
            }}>
              {status.errors}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Errors
            </div>
          </div>
        )}
      </div>

      {status.status === 'scanning' && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          borderLeft: '4px solid #f59e0b'
        }}>
          <p style={{ margin: 0, color: '#92400e' }}>
            <strong>Please wait:</strong> We're crawling your website and analyzing each page for SEO opportunities. 
            This process typically takes 1-3 minutes depending on your site size.
          </p>
        </div>
      )}

      {status.status === 'failed' && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fee2e2',
          borderRadius: '6px',
          borderLeft: '4px solid #ef4444'
        }}>
          <p style={{ margin: 0, color: '#991b1b' }}>
            <strong>Scan failed:</strong> There was an issue analyzing your website. 
            Please check the URL and try again.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScanProgress;