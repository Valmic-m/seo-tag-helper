import React, { useState } from 'react';
import { BrandColors } from '../types';

interface ScanFormProps {
  onSubmit: (url: string, brandColors?: BrandColors) => void;
  isLoading: boolean;
}

const ScanForm: React.FC<ScanFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [showBrandColors, setShowBrandColors] = useState(false);
  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary: '#2563eb',
    secondary: '#7c3aed',
    tertiary: '#059669'
  });
  const [urlError, setUrlError] = useState('');

  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setUrlError('Please enter a website URL');
      return;
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    if (!validateUrl(formattedUrl)) {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setUrlError('');
    onSubmit(formattedUrl, showBrandColors ? brandColors : undefined);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (urlError) setUrlError('');
  };

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
        Analyze Your Website's SEO
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="url" style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            color: '#374151'
          }}>
            Website URL
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://your-website.com"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: urlError ? '2px solid #dc2626' : '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
              backgroundColor: isLoading ? '#f9fafb' : 'white',
              color: isLoading ? '#6b7280' : '#1f2937',
              boxSizing: 'border-box'
            }}
          />
          {urlError && (
            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {urlError}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showBrandColors}
              onChange={(e) => setShowBrandColors(e.target.checked)}
              disabled={isLoading}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ color: '#374151' }}>Customize report brand colors (optional)</span>
          </label>
        </div>

        {showBrandColors && (
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{ marginBottom: '1rem', color: '#374151' }}>Brand Colors</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  Primary Color
                </label>
                <input
                  type="color"
                  value={brandColors.primary}
                  onChange={(e) => setBrandColors(prev => ({ ...prev, primary: e.target.value }))}
                  disabled={isLoading}
                  style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  Secondary Color
                </label>
                <input
                  type="color"
                  value={brandColors.secondary}
                  onChange={(e) => setBrandColors(prev => ({ ...prev, secondary: e.target.value }))}
                  disabled={isLoading}
                  style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  Tertiary Color
                </label>
                <input
                  type="color"
                  value={brandColors.tertiary}
                  onChange={(e) => setBrandColors(prev => ({ ...prev, tertiary: e.target.value }))}
                  disabled={isLoading}
                  style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            backgroundColor: isLoading || !url.trim() ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: isLoading || !url.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && url.trim()) {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && url.trim()) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
        >
          {isLoading ? 'Starting Analysis...' : 'Start SEO Analysis'}
        </button>
      </form>

      <div style={{ 
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '6px',
        borderLeft: '4px solid #0ea5e9'
      }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0c4a6e' }}>What we'll analyze:</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#0f766e' }}>
          <li>Title tags and meta descriptions</li>
          <li>Heading structure (H1, H2, H3)</li>
          <li>Image alt text optimization</li>
          <li>Content quality and word count</li>
          <li>Internal link structure</li>
        </ul>
      </div>
    </div>
  );
};

export default ScanForm;