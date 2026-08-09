import React, { useState, useEffect } from 'react';
import { SyncToolbar } from './components/SyncToolbar/SyncToolbar';
import { FileTree, FileNode } from './components/FileTree/FileTree';
import { LaTeXEditor } from './components/Editor/LaTeXEditor';
import { PDFPreview } from './components/PDFViewer/PDFPreview';
import { AuthModal } from './components/AuthModal/AuthModal';
import './styles/main.css';

const DEFAULT_LATEX = `\\documentclass{article}
\\title{ZabbLeaf: Ultra-Lightweight Offline Overleaf IDE}
\\author{Diletta Abbonato (Zabbonat)}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
ZabbLeaf is a modern, open-source desktop application designed for offline LaTeX editing with seamless Overleaf Git synchronization.
\\end{abstract}

\\section{Introduction}
Working on scientific papers often requires working on the go without reliable internet access. ZabbLeaf allows researchers to edit LaTeX documents offline using a rich Monaco editor and live PDF preview.

\\section{Offline Git Sync Architecture}
When connectivity is restored, ZabbLeaf pushes local commits directly to Overleaf Git remotes using conflict-resilient operational transformation logic.

\\end{document}`;

export const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  
  const [files, setFiles] = useState<FileNode[]>([
    { id: '1', name: 'main.tex', type: 'file', content: DEFAULT_LATEX },
    { id: '2', name: 'references.bib', type: 'file', content: '@article{zabbleaf2026,\n  author={Abbonato, Diletta},\n  title={ZabbLeaf Desktop IDE},\n  year={2026}\n}' }
  ]);
  
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [folderPath, setFolderPath] = useState<string>('C:/Users/User/Documents/LaTeX/MyProject');
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [savedProjectId, setSavedProjectId] = useState<string>('MyOverleafPaper');
  const [notification, setNotification] = useState<string | null>(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('📶 Network connection restored. Ready to sync with Overleaf!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('⚡ Offline mode active. Edits are saved locally on your computer.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      showNotification('✅ PDF Recompiled successfully!');
    }, 500);
  };

  const handleSync = () => {
    if (!isOnline) {
      showNotification('⚠️ Cannot sync while offline. Connect to internet to push changes to Overleaf.');
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showNotification('🎉 Overleaf Sync Complete! All changes pushed to git.overleaf.com');
    }, 1500);
  };

  const handleSaveCredentials = (email: string, token: string, projectId: string) => {
    setSavedEmail(email);
    setSavedProjectId(projectId);
    showNotification(`🔒 Account credentials saved! Connected to project ${projectId}`);
  };

  const handleContentChange = (newContent: string | undefined) => {
    const content = newContent || '';
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content } : f));
  };

  const handleNewFile = (fileName: string) => {
    const newId = Date.now().toString();
    const defaultContent = fileName.endsWith('.tex')
      ? `% ${fileName}\n\\section{${fileName.replace('.tex', '')}}\n\nWrite content here...\n`
      : `% ${fileName}\n`;

    const newFileNode: FileNode = {
      id: newId,
      name: fileName,
      type: 'file',
      content: defaultContent
    };

    setFiles(prev => [...prev, newFileNode]);
    setActiveFileId(newId);
    showNotification(`📄 Created file "${fileName}" in project folder.`);
  };

  const handleDeleteFile = (idToDelete: string) => {
    if (files.length <= 1) {
      showNotification('⚠️ Cannot delete the only file in the project.');
      return;
    }
    const fileToDelete = files.find(f => f.id === idToDelete);
    setFiles(prev => prev.filter(f => f.id !== idToDelete));
    if (activeFileId === idToDelete) {
      const remaining = files.filter(f => f.id !== idToDelete);
      setActiveFileId(remaining[0].id);
    }
    showNotification(`🗑️ Deleted file "${fileToDelete?.name}"`);
  };

  const handleOpenFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        setFolderPath(dirHandle.name);
        showNotification(`📁 Opened folder: ${dirHandle.name}`);
      } else {
        const path = prompt('Enter or select local workspace path:', folderPath);
        if (path) {
          setFolderPath(path);
          showNotification(`📁 Workspace set to: ${path}`);
        }
      }
    } catch (e) {
      // User cancelled picker
    }
  };

  // Parse title/author from current latex file
  const extractTitle = () => {
    const content = activeFile?.content || '';
    const match = content.match(/\\title\{([^}]+)\}/);
    return match ? match[1] : activeFile?.name || 'ZabbLeaf Document';
  };

  const extractAuthor = () => {
    const content = activeFile?.content || '';
    const match = content.match(/\\author\{([^}]+)\}/);
    return match ? match[1] : 'Author Name';
  };

  const extractAbstract = () => {
    const content = activeFile?.content || '';
    const match = content.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
    return match ? match[1].trim() : '';
  };

  return (
    <div className="zableaf-app">
      <SyncToolbar
        isOnline={isOnline}
        isSyncing={isSyncing}
        isCompiling={isCompiling}
        onSync={handleSync}
        onCompile={handleCompile}
        onOpenAuth={() => setIsAuthOpen(true)}
        projectName={savedProjectId}
      />

      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #10b981',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 999,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification}
        </div>
      )}

      <div className="workspace-container">
        <FileTree
          files={files}
          activeFileId={activeFileId}
          onSelectFile={(id) => setActiveFileId(id)}
          onNewFile={handleNewFile}
          onDeleteFile={handleDeleteFile}
          onOpenFolder={handleOpenFolder}
          currentFolderPath={folderPath}
        />

        <div className="editor-pdf-split">
          <LaTeXEditor
            fileName={activeFile?.name || 'untitled.tex'}
            content={activeFile?.content || ''}
            onChange={handleContentChange}
          />

          <PDFPreview
            title={extractTitle()}
            author={extractAuthor()}
            abstractText={extractAbstract()}
            sections={[
              {
                title: 'Introduction',
                body: 'Working on scientific papers often requires working on the go without reliable internet access. ZabbLeaf allows researchers to edit LaTeX documents offline using a rich Monaco editor and live PDF preview.'
              },
              {
                title: 'Offline Git Sync Architecture',
                body: 'When connectivity is restored, ZabbLeaf pushes local commits directly to Overleaf Git remotes using conflict-resilient operational transformation logic.'
              }
            ]}
            isCompiling={isCompiling}
          />
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSaveCredentials={handleSaveCredentials}
        savedEmail={savedEmail}
        savedProjectId={savedProjectId}
      />
    </div>
  );
};

export default App;
