import React from 'react';
import { RefreshCw, Wifi, WifiOff, Play, UserCheck, FolderGit2, Home, ChevronDown, LogOut } from 'lucide-react';

export type CompilerEngine = 'html-preview' | 'overleaf-cloud' | 'pdflatex' | 'xelatex' | 'lualatex';

export interface CompilerOption {
  id: CompilerEngine;
  label: string;
  description: string;
  available: boolean;
}

interface SyncToolbarProps {
  isOnline: boolean;
  isSyncing: boolean;
  isCompiling: boolean;
  onSync: () => void;
  onCompile: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  onHome: () => void;
  projectName: string;
  selectedCompiler: CompilerEngine;
  compilerOptions: CompilerOption[];
  onCompilerChange: (compiler: CompilerEngine) => void;
}

export const SyncToolbar: React.FC<SyncToolbarProps> = ({
  isOnline,
  isSyncing,
  isCompiling,
  onSync,
  onCompile,
  onOpenAuth,
  onLogout,
  isLoggedIn,
  onHome,
  projectName,
  selectedCompiler,
  compilerOptions,
  onCompilerChange
}) => {
  const selectedOption = compilerOptions.find(c => c.id === selectedCompiler);

  const getCompilerColor = (id: CompilerEngine) => {
    if (id === 'html-preview') return '#d1a054';
    if (id === 'overleaf-cloud') return '#89a7bd';
    return '#6fa8cc';
  };

  return (
    <header className="top-toolbar">
      <div className="brand-section">
        <button 
          onClick={onHome} 
          className="btn-secondary" 
          style={{ padding: '6px 10px', marginRight: '10px' }}
          title="Back to Projects"
        >
          <Home size={16} /> Home
        </button>
        <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={onHome}>
          <span>🌿</span> ZabbLeaf
        </div>
        <span className="brand-badge">Desktop v2.1</span>
        <span style={{ color: '#4d5560', margin: '0 8px' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#ccd2da' }}>
          <FolderGit2 size={16} color="#6fa8cc" />
          <strong>{projectName}</strong>
        </div>
      </div>

      <div className="toolbar-controls">
        <div className="status-indicator">
          {isOnline ? (
            <>
              <div className="status-dot online" />
              <Wifi size={14} color="#6fa8cc" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <div className="status-dot offline" />
              <WifiOff size={14} color="#d1a054" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        {/* Compiler Selector Dropdown */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={selectedCompiler}
            onChange={(e) => onCompilerChange(e.target.value as CompilerEngine)}
            style={{
              appearance: 'none',
              background: 'rgba(38, 43, 50, 0.8)',
              border: `1px solid ${getCompilerColor(selectedCompiler)}40`,
              color: '#f2f5f8',
              padding: '6px 28px 6px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
              minWidth: '140px'
            }}
          >
            {compilerOptions.map(opt => (
              <option 
                key={opt.id} 
                value={opt.id} 
                disabled={!opt.available}
              >
                {opt.available ? '' : '⊘ '}{opt.label}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={12} 
            style={{ 
              position: 'absolute', 
              right: '8px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              pointerEvents: 'none',
              color: getCompilerColor(selectedCompiler)
            }} 
          />
        </div>

        <button className="btn-secondary" onClick={onCompile} disabled={isCompiling}>
          <Play size={14} fill="#6fa8cc" color="#6fa8cc" />
          {isCompiling ? 'Compiling...' : 'Recompile'}
        </button>

        <button className="btn-sync" onClick={onSync} disabled={isSyncing}>
          <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Overleaf'}
        </button>

        <button className="btn-secondary" onClick={onOpenAuth} title="Account & Overleaf Credentials">
          <UserCheck size={14} />
          Account
        </button>

        {isLoggedIn && (
          <button
            className="btn-secondary"
            onClick={onLogout}
            title="Sign out of Overleaf — your downloaded projects stay on this computer"
            style={{ padding: '6px 10px' }}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  );
};
