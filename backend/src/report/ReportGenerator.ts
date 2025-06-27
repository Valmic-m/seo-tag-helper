import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { ScanData, BrandColors, ScanSession } from '../types';
import { supabase } from '../utils/supabase';

export class ReportGenerator {
  private reportCache = new Map<string, Buffer>();
  
  async generateReport(sessionId: string, brandColors?: BrandColors): Promise<string> {
    // Check cache first
    if (this.reportCache.has(sessionId)) {
      return sessionId;
    }
    
    // Fetch session data
    const { data: session, error } = await supabase
      .from('scan_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error || !session || !session.scan_data) {
      throw new Error('Session not found or scan incomplete');
    }
    
    const scanData = session.scan_data as ScanData;
    
    if (!scanData.pages || scanData.pages.length === 0) {
      throw new Error('No scan data available for report generation');
    }
    
    console.log(`Generating report for session ${sessionId} with ${scanData.pages.length} pages`);
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          ...this.createCoverPage(session.url, brandColors),
          ...this.createExecutiveSummary(scanData, brandColors),
          ...this.createKeyFindings(scanData, brandColors),
          ...this.createPageAnalysis(scanData.pages, brandColors),
          ...this.createImageAnalysis(scanData.pages, brandColors),
          ...this.createRecommendations(scanData, brandColors),
          ...this.createFooter()
        ]
      }]
    });
    
    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Cache with auto-cleanup (3 hours)
    this.reportCache.set(sessionId, buffer);
    setTimeout(() => {
      this.reportCache.delete(sessionId);
      console.log(`Report cache cleaned up for session ${sessionId}`);
    }, 3 * 60 * 60 * 1000);
    
    console.log(`Report generated successfully for session ${sessionId}`);
    return sessionId;
  }
  
  getReport(sessionId: string): Buffer | null {
    return this.reportCache.get(sessionId) || null;
  }
  
  private createCoverPage(url: string, brandColors?: BrandColors): Paragraph[] {
    const primaryColor = brandColors?.primary || '#2563eb';
    const secondaryColor = brandColors?.secondary || '#7c3aed';
    
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "SEO Analysis Report",
            bold: true,
            size: 48,
            color: primaryColor.replace('#', '')
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: url,
            bold: true,
            size: 28,
            color: secondaryColor.replace('#', '')
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: `Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 }
      }),
      new Paragraph({
        text: "Powered by SEO Tag Helper Tool",
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 }
      })
    ];
  }
  
  private createExecutiveSummary(scanData: ScanData, brandColors?: BrandColors): Paragraph[] {
    const primaryColor = brandColors?.primary || '#2563eb';
    const secondaryColor = brandColors?.secondary || '#7c3aed';
    const tertiaryColor = brandColors?.tertiary || '#059669';
    
    const highPriorityCount = scanData.pages.filter(p => p.recommendations.priority === 'high').length;
    const mediumPriorityCount = scanData.pages.filter(p => p.recommendations.priority === 'medium').length;
    const imagesWithoutAlt = scanData.pages.reduce((count, page) => 
      count + page.images.filter(img => !img.currentAlt).length, 0
    );
    
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "Executive Summary",
            bold: true,
            size: 32,
            color: primaryColor.replace('#', '')
          })
        ],
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: `This report provides a comprehensive SEO analysis of your website. Our automated scanner reviewed ${scanData.pagesProcessed} pages and identified key opportunities for improvement.`,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: "Scan Results:",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• Total Pages Analyzed: ", bold: true }),
          new TextRun({ text: scanData.pagesProcessed.toString() })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• High Priority Issues: ", bold: true }),
          new TextRun({ text: highPriorityCount.toString(), color: secondaryColor.replace('#', ''), bold: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• Medium Priority Issues: ", bold: true }),
          new TextRun({ text: mediumPriorityCount.toString(), color: tertiaryColor.replace('#', ''), bold: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• Images Missing Alt Text: ", bold: true }),
          new TextRun({ 
            text: imagesWithoutAlt.toString(), 
            color: imagesWithoutAlt > 0 ? secondaryColor.replace('#', '') : tertiaryColor.replace('#', ''),
            bold: true 
          })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• Pages Skipped: ", bold: true }),
          new TextRun({ text: scanData.pagesSkipped.toString() })
        ],
        spacing: { after: 400 }
      })
    ];
  }
  
  private createKeyFindings(scanData: ScanData, brandColors?: BrandColors): Paragraph[] {
    const findings = [];
    
    // Calculate statistics
    const pagesWithoutTitle = scanData.pages.filter(p => !p.title || p.title.length < 30).length;
    const pagesWithoutDesc = scanData.pages.filter(p => !p.metaDescription || p.metaDescription.length < 120).length;
    const pagesWithoutH1 = scanData.pages.filter(p => p.headings.h1.length === 0).length;
    
    findings.push(
      new Paragraph({
        text: "Key Findings",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    if (pagesWithoutTitle > 0) {
      findings.push(
        new Paragraph({
          children: [
            new TextRun({ text: "⚠️ Title Tag Issues: ", bold: true, color: "dc2626" }),
            new TextRun({ text: `${pagesWithoutTitle} pages have missing or sub-optimal title tags. Title tags should be 30-60 characters long and descriptive.` })
          ],
          spacing: { after: 150 }
        })
      );
    }
    
    if (pagesWithoutDesc > 0) {
      findings.push(
        new Paragraph({
          children: [
            new TextRun({ text: "⚠️ Meta Description Issues: ", bold: true, color: "dc2626" }),
            new TextRun({ text: `${pagesWithoutDesc} pages have missing or short meta descriptions. Descriptions should be 120-160 characters to maximize search result visibility.` })
          ],
          spacing: { after: 150 }
        })
      );
    }
    
    if (pagesWithoutH1 > 0) {
      findings.push(
        new Paragraph({
          children: [
            new TextRun({ text: "⚠️ Missing H1 Tags: ", bold: true, color: "ea580c" }),
            new TextRun({ text: `${pagesWithoutH1} pages are missing H1 tags. Every page should have exactly one H1 tag that describes the main topic.` })
          ],
          spacing: { after: 150 }
        })
      );
    }
    
    findings.push(
      new Paragraph({
        spacing: { after: 400 }
      })
    );
    
    return findings;
  }
  
  private createPageAnalysis(pages: any[], brandColors?: BrandColors): Paragraph[] {
    const elements: Paragraph[] = [
      new Paragraph({
        text: "Detailed Page Analysis",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    ];
    
    pages.forEach((page, index) => {
      const priorityColor = {
        'high': 'dc2626',
        'medium': 'ea580c',
        'low': '16a34a'
      }[page.recommendations.priority];
      
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Page ${index + 1}: `,
              bold: true,
              size: 24
            }),
            new TextRun({
              text: page.url,
              size: 20,
              color: "1f2937"
            })
          ],
          spacing: { before: 300, after: 150 }
        }),
        
        // Priority indicator
        new Paragraph({
          children: [
            new TextRun({ text: "Priority: ", bold: true }),
            new TextRun({ 
              text: page.recommendations.priority.toUpperCase(), 
              bold: true,
              color: priorityColor
            })
          ],
          spacing: { after: 100 }
        }),
        
        // Current title
        new Paragraph({
          children: [
            new TextRun({ text: "Current Title ", bold: true }),
            new TextRun({ text: `(${page.title.length} chars): `, size: 18 }),
            new TextRun({ text: page.title || "Missing", italics: !page.title })
          ],
          spacing: { after: 50 }
        }),
        
        // Recommended title
        new Paragraph({
          children: [
            new TextRun({ text: "Recommended Title: ", bold: true, color: "16a34a" }),
            new TextRun({ text: page.recommendations.title })
          ],
          spacing: { after: 150 }
        }),
        
        // Current description
        new Paragraph({
          children: [
            new TextRun({ text: "Current Description ", bold: true }),
            new TextRun({ text: `(${page.metaDescription.length} chars): `, size: 18 }),
            new TextRun({ text: page.metaDescription || "Missing", italics: !page.metaDescription })
          ],
          spacing: { after: 50 }
        }),
        
        // Recommended description
        new Paragraph({
          children: [
            new TextRun({ text: "Recommended Description: ", bold: true, color: "16a34a" }),
            new TextRun({ text: page.recommendations.metaDescription })
          ],
          spacing: { after: 150 }
        }),
        
        // Content stats
        new Paragraph({
          children: [
            new TextRun({ text: "Content: ", bold: true }),
            new TextRun({ text: `${page.wordCount} words, ` }),
            new TextRun({ text: `${page.headings.h1.length} H1, ` }),
            new TextRun({ text: `${page.headings.h2.length} H2, ` }),
            new TextRun({ text: `${page.headings.h3.length} H3 tags` })
          ],
          spacing: { after: 250 }
        })
      );
    });
    
    return elements;
  }
  
  private createImageAnalysis(pages: any[], brandColors?: BrandColors): Paragraph[] {
    const elements: Paragraph[] = [
      new Paragraph({
        text: "Image Optimization Analysis",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    ];
    
    let totalImages = 0;
    let imagesWithoutAlt = 0;
    
    pages.forEach(page => {
      if (page.images.length === 0) return;
      
      totalImages += page.images.length;
      const pageImagesWithoutAlt = page.images.filter((img: any) => !img.currentAlt);
      imagesWithoutAlt += pageImagesWithoutAlt.length;
      
      if (pageImagesWithoutAlt.length > 0) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Page: ", bold: true }),
              new TextRun({ text: page.url })
            ],
            spacing: { before: 200, after: 100 }
          })
        );
        
        // Show all images without alt text (with reasonable limit)
        const maxImagesToShow = 75; // Increased to 75 to show comprehensive detail
        const imagesToShow = pageImagesWithoutAlt.slice(0, maxImagesToShow);
        
        imagesToShow.forEach((img: any, i: number) => {
          // Use enhanced image data if available, fallback to extracting from URL
          const fileName = img.fileName || img.src.split('/').pop()?.split('?')[0] || 'Unknown';
          const dimensions = img.width && img.height ? ` (${img.width}x${img.height})` : '';
          
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `  • Image ${i + 1}: `, bold: true }),
                new TextRun({ text: fileName + dimensions, size: 20 }),
                new TextRun({ text: " - Missing alt text", color: "dc2626" })
              ],
              spacing: { after: 50 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "    URL: ", bold: true }),
                new TextRun({ text: img.src.length > 80 ? img.src.substring(0, 80) + '...' : img.src, size: 18 })
              ],
              spacing: { after: 25 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "    Recommended Alt Text: ", bold: true, color: "16a34a" }),
                new TextRun({ text: img.recommendedAlt })
              ],
              spacing: { after: 100 }
            })
          );
        });
        
        // Only show summary if there are more images than we're displaying
        if (pageImagesWithoutAlt.length > maxImagesToShow) {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: `    ⚠️ Additional Images: `, bold: true, color: "ea580c" }),
                new TextRun({ text: `${pageImagesWithoutAlt.length - maxImagesToShow} more images on this page also need alt text` })
              ],
              spacing: { after: 150 }
            })
          );
        }
      }
    });
    
    if (imagesWithoutAlt === 0) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "✅ Great job! ", bold: true, color: "16a34a" }),
            new TextRun({ text: "All images have alt text." })
          ],
          spacing: { after: 200 }
        })
      );
    } else {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Summary: ", bold: true }),
            new TextRun({ text: `${imagesWithoutAlt} out of ${totalImages} images are missing alt text.` })
          ],
          spacing: { before: 200, after: 200 }
        })
      );
    }
    
    return elements;
  }
  
  private createRecommendations(scanData: ScanData, brandColors?: BrandColors): Paragraph[] {
    return [
      new Paragraph({
        text: "Implementation Recommendations",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }),
      
      new Paragraph({
        text: "High Priority Actions:",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      
      new Paragraph({
        text: "1. Optimize Title Tags - Update all pages with missing or sub-optimal titles to be 30-60 characters long and include relevant keywords.",
        spacing: { after: 100 }
      }),
      
      new Paragraph({
        text: "2. Write Meta Descriptions - Add compelling 120-160 character descriptions for all pages to improve click-through rates from search results.",
        spacing: { after: 100 }
      }),
      
      new Paragraph({
        text: "3. Add Alt Text to Images - Provide descriptive alt text for all images to improve accessibility and SEO.",
        spacing: { after: 200 }
      }),
      
      new Paragraph({
        text: "Medium Priority Actions:",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }),
      
      new Paragraph({
        text: "1. Review H1 Tags - Ensure every page has exactly one H1 tag that clearly describes the page content.",
        spacing: { after: 100 }
      }),
      
      new Paragraph({
        text: "2. Improve Content Structure - Use H2 and H3 tags to create a clear content hierarchy.",
        spacing: { after: 100 }
      }),
      
      new Paragraph({
        text: "3. Content Enhancement - Consider expanding thin content pages to provide more value to users.",
        spacing: { after: 400 }
      })
    ];
  }
  
  private createFooter(): Paragraph[] {
    return [
      new Paragraph({
        text: "Generated by SEO Tag Helper Tool",
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 }
      }),
      new Paragraph({
        text: "For questions or support, please visit our website.",
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    ];
  }
}