import React from 'react';
import { RefreshCw, Wifi, WifiOff, Play, UserCheck, FolderGit2, Home, ChevronDown } from 'lucide-react';

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
  onHome,
  projectName,
  selectedCompiler,
  compilerOptions,
  onCompilerChange
}) => {
  const selectedOption = compilerOptions.find(c => c.id === selectedCompiler);

  const getCompilerColor = (id: CompilerEngine) => {
    if (id === 'html-preview') return '#f59e0b';
    if (id === 'overleaf-cloud') return '#3b82f6';
    return '#10b981';
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

        {/* Compiler Selector Dropdown */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <select
            value={selectedCompiler}
            onChange={(e) => onCompilerChange(e.target.value as CompilerEngine)}
            style={{
              appearance: 'none',
              background: 'rgba(30, 41, 59, 0.8)',
              border: `1px solid ${getCompilerColor(selectedCompiler)}40`,
              color: '#f8fafc',
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
          <Play size={14} fill="#10b981" color="#10b981" />
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
      </div>
    </header>
  );
};
