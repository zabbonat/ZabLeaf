import React from 'react';
import { ZoomIn, ZoomOut, Download, FileCheck } from 'lucide-react';

interface PDFPreviewProps {
  title: string;
  author: string;
  abstractText: string;
  sections: { title: string; body: string }[];
  isCompiling: boolean;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  title,
  author,
  abstractText,
  sections,
  isCompiling
}) => {
  return (
    <div className="pdf-pane">
      <div className="pane-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileCheck size={14} color="#10b981" />
          <span>PDF Preview (Page 1 of 1)</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} title="Download PDF">
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="pdf-viewer-container">
        {isCompiling ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
            <div className="spin-animation" style={{ fontSize: '2rem', marginBottom: '12px' }}>⚙️</div>
            <p>Compiling LaTeX document...</p>
          </div>
        ) : (
          <div className="pdf-page-card">
            <h1>{title || 'Untitled LaTeX Document'}</h1>
            <div className="author">{author || 'Author Name'}</div>

            {abstractText && (
              <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '12px', borderLeft: '3px solid #10b981', fontStyle: 'italic' }}>
                <strong>Abstract — </strong>{abstractText}
              </div>
            )}

            {sections.map((sec, idx) => (
              <section key={idx}>
                <h2>{idx + 1}. {sec.title}</h2>
                <p style={{ lineHeight: '1.6', fontSize: '1rem', color: '#334155' }}>
                  {sec.body}
                </p>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
