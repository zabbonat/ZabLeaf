import React from 'react';
import { RefreshCw, Wifi, WifiOff, Play, UserCheck, FolderGit2 } from 'lucide-react';

interface SyncToolbarProps {
  isOnline: boolean;
  isSyncing: boolean;
  isCompiling: boolean;
  onSync: () => void;
  onCompile: () => void;
  onOpenAuth: () => void;
  projectName: string;
}

export const SyncToolbar: React.FC<SyncToolbarProps> = ({
  isOnline,
  isSyncing,
  isCompiling,
  onSync,
  onCompile,
  onOpenAuth,
  projectName
}) => {
  return (
    <header className="top-toolbar">
      <div className="brand-section">
        <div className="brand-logo">
          <span>🌿</span> ZabbLeaf
        </div>
        <span className="brand-badge">Desktop v1.0</span>
        <span style={{ color: '#475569', margin: '0 8px' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <FolderGit2 size={16} color="#10b981" />
          <strong>{projectName}</strong>
        </div>
      </div>

      <div className="toolbar-controls">
        <div className="status-indicator">
          {isOnline ? (
            <>
              <div className="status-dot online" />
              <Wifi size={14} color="#10b981" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <div className="status-dot offline" />
              <WifiOff size={14} color="#f59e0b" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        <button className="btn-secondary" onClick={onCompile} disabled={isCompiling}>
          <Play size={14} fill="#10b981" color="#10b981" />
          {isCompiling ? 'Recompiling...' : 'Recompile (Ctrl+S)'}
        </button>

        <button className="btn-sync" onClick={onSync} disabled={isSyncing}>
          <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Overleaf'}
        </button>

        <button className="btn-secondary" onClick={onOpenAuth} title="Account & Overleaf Credentials">
          <UserCheck size={14} />
          Account
        </button>
      </div>
    </header>
  );
};
