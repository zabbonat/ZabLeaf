import React, { useState } from 'react';
import { FileText, Folder, Plus, FileCode, Database, FolderOpen, Trash2 } from 'lucide-react';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  extension?: string;
}

interface FileTreeProps {
  files: FileNode[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onNewFile: (fileName: string) => void;
  onDeleteFile: (id: string) => void;
  onOpenFolder: () => void;
  currentFolderPath?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onNewFile,
  onDeleteFile,
  onOpenFolder,
  currentFolderPath
}) => {
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tex')) return <FileCode size={16} color="#10b981" />;
    if (fileName.endsWith('.bib')) return <Database size={16} color="#3b82f6" />;
    return <FileText size={16} color="#94a3b8" />;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    let name = newFileName.trim();
    if (!name.includes('.')) name += '.tex'; // default to .tex
    onNewFile(name);
    setNewFileName('');
    setIsAddingFile(false);
  };

  return (
    <aside className="sidebar">
      {/* Folder Picker Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', background: 'rgba(15, 23, 42, 0.9)' }}>
        <button
          className="btn-secondary"
          onClick={onOpenFolder}
          style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
        >
          <FolderOpen size={16} color="#f59e0b" />
          <span>Open Local Folder...</span>
        </button>
        {currentFolderPath && (
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📁 {currentFolderPath}
          </div>
        )}
      </div>

      <div className="sidebar-header">
        <span>Project Files ({files.length})</span>
        <button
          onClick={() => setIsAddingFile(true)}
          style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            borderRadius: '4px',
            padding: '2px 6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem'
          }}
          title="Create New File"
        >
          <Plus size={14} /> New File
        </button>
      </div>

      {/* New File Inline Form */}
      {isAddingFile && (
        <form onSubmit={handleAddSubmit} style={{ padding: '8px 12px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
          <input
            type="text"
            className="input-control"
            placeholder="filename.tex"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
              onClick={() => setIsAddingFile(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-sync"
              style={{ fontSize: '0.75rem', padding: '2px 10px' }}
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* File List */}
      <ul className="file-list">
        {files.map((file) => (
          <li
            key={file.id}
            className={`file-item ${file.id === activeFileId ? 'active' : ''}`}
            style={{ justifyContent: 'space-between' }}
            onClick={() => onSelectFile(file.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              {file.type === 'folder' ? <Folder size={16} color="#f59e0b" /> : getFileIcon(file.name)}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
            </div>

            {files.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file.id);
                }}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', opacity: 0.6 }}
                title="Delete File"
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', fontSize: '0.75rem', color: '#64748b' }}>
        <div>ZabLeaf Desktop IDE</div>
        <div style={{ color: '#10b981', marginTop: '2px' }}>by Diletta Abbonato (Zabbonat)</div>
      </div>
    </aside>
  );
};
