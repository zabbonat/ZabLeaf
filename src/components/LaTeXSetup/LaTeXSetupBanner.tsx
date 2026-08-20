import React from 'react';
import { Download, X, Loader2, CheckCircle2 } from 'lucide-react';

interface LaTeXSetupBannerProps {
  /** Hidden entirely once an engine is available. */
  isInstalled: boolean;
  isInstalling: boolean;
  isDismissed: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

/**
 * ZabbLeaf works without LaTeX — Overleaf compiles in the browser and the quick
 * preview needs nothing — so installing a TeX distribution is a choice, offered
 * here rather than forced at install time. This is the one place that works the
 * same on Windows, macOS and Linux, including for the .dmg and .AppImage
 * downloads, which have no installer UI of their own.
 */
export const LaTeXSetupBanner: React.FC<LaTeXSetupBannerProps> = ({
  isInstalled,
  isInstalling,
  isDismissed,
  onInstall,
  onDismiss
}) => {
  if (isInstalled || (isDismissed && !isInstalling)) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        margin: '0 0 18px',
        padding: '14px 18px',
        borderRadius: '12px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#e2e8f0'
      }}
    >
      <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
        {isInstalling ? <Loader2 size={24} className="spin" color="#3b82f6" /> : '📄'}
      </div>

      <div style={{ flex: 1, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 600, marginBottom: '2px' }}>
          {isInstalling ? 'Installing LaTeX…' : 'Compile PDFs offline?'}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          {isInstalling
            ? 'Downloading and setting up MiKTeX. This takes a few minutes — you can keep working.'
            : 'No LaTeX engine found. ZabbLeaf works fine without one, but installing MiKTeX (~142 MB) lets you build real PDFs without an internet connection.'}
        </div>
      </div>

      {!isInstalling && (
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn-sync" onClick={onInstall} style={{ whiteSpace: 'nowrap' }}>
            <Download size={16} /> Install LaTeX
          </button>
          <button
            className="btn-secondary"
            onClick={onDismiss}
            title="Continue without a local LaTeX engine"
            style={{ padding: '6px 10px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

interface LaTeXReadyNoticeProps {
  version: string;
}

/** Shown once, right after a successful install. */
export const LaTeXReadyNotice: React.FC<LaTeXReadyNoticeProps> = ({ version }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      margin: '0 0 18px',
      padding: '12px 18px',
      borderRadius: '12px',
      background: 'rgba(16, 185, 129, 0.08)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      color: '#e2e8f0',
      fontSize: '0.9rem'
    }}
  >
    <CheckCircle2 size={18} color="#10b981" />
    <span>LaTeX is ready — {version}. Pick a local engine in the compiler menu.</span>
  </div>
);
