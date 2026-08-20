import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Download, FileCheck, Terminal } from 'lucide-react';

interface PDFPreviewProps {
  compiledUrl: string | null;
  compileLog: string;
  isCompiling: boolean;
  /** A real engine produced a PDF; the quick preview only produces HTML. */
  isPdf?: boolean;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  compiledUrl,
  compileLog,
  isCompiling,
  isPdf = false
}) => {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 50));
  const handleDownload = () => {
    if (compiledUrl) {
      const a = document.createElement('a');
      a.href = compiledUrl;
      // A real engine produces a PDF; the quick preview is only HTML.
      a.download = isPdf ? 'zabbleaf.pdf' : 'zabbleaf-preview.html';
      a.click();
    }
  };

  return (
    <div className="pdf-pane">
      <div className="pane-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileCheck size={14} color="#10b981" />
          <span>Compiled PDF Preview</span>
          {zoom !== 100 && (
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{zoom}%</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} title="Zoom In" onClick={handleZoomIn}>
            <ZoomIn size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} title="Zoom Out" onClick={handleZoomOut}>
            <ZoomOut size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} title="Download Preview" onClick={handleDownload} disabled={!compiledUrl}>
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="pdf-viewer-container" style={{ padding: 0 }}>
        {isCompiling ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⚙️</div>
            <p>Compiling LaTeX document...</p>
          </div>
        ) : compiledUrl ? (
          <iframe
            src={compiledUrl}
            className="pdf-iframe-container"
            title="Compiled PDF"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
          />
        ) : (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>Click <strong>Recompile</strong> to generate the PDF preview.</p>
          </div>
        )}
      </div>

      {compileLog && (
        <div className="compile-log">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#64748b' }}>
            <Terminal size={12} /> Compiler Output
          </div>
          {compileLog}
        </div>
      )}
    </div>
  );
};
