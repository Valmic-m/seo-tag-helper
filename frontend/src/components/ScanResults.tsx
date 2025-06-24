import React, { useState } from 'react';
import { ScanData, BrandColors } from '../types';

interface ScanResultsProps {
  scanData: ScanData;
  url: string;
  onGenerateReport: (brandColors?: BrandColors) => void;
  isGeneratingReport: boolean;
  onStartNewScan: () => void;
}

const ScanResults: React.FC<ScanResultsProps> = ({ 
  scanData, 
  url, 
  onGenerateReport, 
  isGeneratingReport, 
  onStartNewScan 
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pages' | 'images'>('overview');

  const highPriorityPages = scanData.pages.filter(p => p.recommendations.priority === 'high');
  const mediumPriorityPages = scanData.pages.filter(p => p.recommendations.priority === 'medium');
  const lowPriorityPages = scanData.pages.filter(p => p.recommendations.priority === 'low');

  const totalImagesWithoutAlt = scanData.pages.reduce((total, page) => 
    total + page.images.filter(img => !img.currentAlt).length, 0
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#ea580c';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: '' },
    { id: 'pages', label: 'Pages', count: scanData.pages.length.toString() },
    { id: 'images', label: 'Images', count: totalImagesWithoutAlt > 0 ? totalImagesWithoutAlt.toString() : '' }
  ];

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '2rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
            SEO Analysis Complete
          </h2>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Analysis for: <strong>{url}</strong>
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: selectedTab === tab.id ? 'white' : 'transparent',
                borderBottom: selectedTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: selectedTab === tab.id ? '#3b82f6' : '#6b7280',
                fontWeight: selectedTab === tab.id ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
            >
              {tab.label}
              {tab.count && (
                <span style={{
                  marginLeft: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '0.75rem'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '2rem' }}>
          {selectedTab === 'overview' && (
            <div>
              {/* Summary Stats */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {scanData.pagesProcessed}
                  </div>
                  <div style={{ color: '#6b7280' }}>Pages Analyzed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>
                    {highPriorityPages.length}
                  </div>
                  <div style={{ color: '#6b7280' }}>High Priority</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ea580c' }}>
                    {mediumPriorityPages.length}
                  </div>
                  <div style={{ color: '#6b7280' }}>Medium Priority</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                    {lowPriorityPages.length}
                  </div>
                  <div style={{ color: '#6b7280' }}>Low Priority</div>
                </div>
              </div>

              {/* Key Issues */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Key Issues Found</h3>
                
                {highPriorityPages.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    borderLeft: '4px solid #dc2626',
                    marginBottom: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>
                      High Priority Issues ({highPriorityPages.length} pages)
                    </h4>
                    <p style={{ margin: 0, color: '#7f1d1d' }}>
                      These pages need immediate attention for optimal SEO performance.
                    </p>
                  </div>
                )}

                {totalImagesWithoutAlt > 0 && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fff7ed',
                    borderRadius: '6px',
                    borderLeft: '4px solid #ea580c',
                    marginBottom: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#9a3412' }}>
                      Missing Alt Text ({totalImagesWithoutAlt} images)
                    </h4>
                    <p style={{ margin: 0, color: '#7c2d12' }}>
                      Images without alt text reduce accessibility and SEO value.
                    </p>
                  </div>
                )}

                {scanData.errors.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    borderLeft: '4px solid #dc2626'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>
                      Scan Errors ({scanData.errors.length} pages)
                    </h4>
                    <p style={{ margin: 0, color: '#7f1d1d' }}>
                      Some pages couldn't be analyzed due to access issues or errors.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'pages' && (
            <div>
              <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Page Analysis</h3>
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {scanData.pages.map((page, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `1px solid ${getPriorityColor(page.recommendations.priority)}`,
                    borderRadius: '6px',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, color: '#1f2937', fontSize: '1rem' }}>
                        {page.url}
                      </h4>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getPriorityColor(page.recommendations.priority)
                      }}>
                        {page.recommendations.priority.toUpperCase()}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Title:</strong> {page.title || 'Missing'} ({page.title.length} chars)
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Description:</strong> {page.metaDescription || 'Missing'} ({page.metaDescription.length} chars)
                      </p>
                      <p style={{ margin: '0.25rem 0' }}>
                        <strong>Content:</strong> {page.wordCount} words, {page.headings.h1.length} H1, {page.headings.h2.length} H2, {page.headings.h3.length} H3
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'images' && (
            <div>
              <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Image Analysis</h3>
              {totalImagesWithoutAlt === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  border: '1px solid #16a34a'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h4 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>Great job!</h4>
                  <p style={{ margin: 0, color: '#15803d' }}>All images have alt text.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {scanData.pages.map((page, pageIndex) => {
                    const imagesWithoutAlt = page.images.filter(img => !img.currentAlt);
                    if (imagesWithoutAlt.length === 0) return null;

                    return (
                      <div key={pageIndex} style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}>
                        <h4 style={{ marginBottom: '1rem', color: '#1f2937' }}>
                          {page.url}
                        </h4>
                        {imagesWithoutAlt.slice(0, 5).map((image, imgIndex) => (
                          <div key={imgIndex} style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            backgroundColor: '#fef2f2',
                            borderRadius: '4px',
                            borderLeft: '3px solid #dc2626'
                          }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#991b1b' }}>
                              Missing Alt Text
                            </p>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                              Image: {image.src}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>
                              <strong style={{ color: '#16a34a' }}>Suggested:</strong> {image.recommendedAlt}
                            </p>
                          </div>
                        ))}
                        {imagesWithoutAlt.length > 5 && (
                          <p style={{ margin: 0, fontStyle: 'italic', color: '#6b7280' }}>
                            ... and {imagesWithoutAlt.length - 5} more images
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ 
          padding: '2rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => onGenerateReport()}
            disabled={isGeneratingReport}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem 1.5rem',
              backgroundColor: isGeneratingReport ? '#9ca3af' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: isGeneratingReport ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingReport ? 'Generating Report...' : 'Download Word Report'}
          </button>
          
          <button
            onClick={onStartNewScan}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'white',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Analyze Another Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanResults;