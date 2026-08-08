import React from 'react';
import { FileText, Folder, Plus, FileCode, Database } from 'lucide-react';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
}

interface FileTreeProps {
  files: FileNode[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onNewFile: () => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onNewFile
}) => {
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tex')) return <FileCode size={16} color="#10b981" />;
    if (fileName.endsWith('.bib')) return <Database size={16} color="#3b82f6" />;
    return <FileText size={16} color="#94a3b8" />;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Project Files</span>
        <button
          onClick={onNewFile}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          title="New File"
        >
          <Plus size={16} />
        </button>
      </div>

      <ul className="file-list">
        {files.map((file) => (
          <li
            key={file.id}
            className={`file-item ${file.id === activeFileId ? 'active' : ''}`}
            onClick={() => onSelectFile(file.id)}
          >
            {file.type === 'folder' ? <Folder size={16} color="#f59e0b" /> : getFileIcon(file.name)}
            <span>{file.name}</span>
          </li>
        ))}
      </ul>

      <div style={{ padding: '16px', borderTop: '1px solid #1e293b', fontSize: '0.75rem', color: '#64748b' }}>
        <div>Created by <strong>Diletta Abbonato</strong></div>
        <div style={{ color: '#10b981', marginTop: '2px' }}>github.com/Zabbonat</div>
      </div>
    </aside>
  );
};
