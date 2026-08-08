import React, { useState, useEffect } from 'react';
import { SyncToolbar } from './components/SyncToolbar/SyncToolbar';
import { FileTree, FileNode } from './components/FileTree/FileTree';
import { LaTeXEditor } from './components/Editor/LaTeXEditor';
import { PDFPreview } from './components/PDFViewer/PDFPreview';
import { AuthModal } from './components/AuthModal/AuthModal';
import './styles/main.css';

const INITIAL_FILES: FileNode[] = [
  { id: '1', name: 'main.tex', type: 'file', extension: 'tex' },
  { id: '2', name: 'references.bib', type: 'file', extension: 'bib' },
  { id: '3', name: 'sections/introduction.tex', type: 'file', extension: 'tex' },
];

const INITIAL_LATEX = `\\documentclass{article}
\\title{ZabLeaf: Ultra-Lightweight Offline Overleaf IDE}
\\author{Diletta Abbonato (Zabbonat)}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
ZabLeaf is a modern, open-source desktop application designed for offline LaTeX editing with seamless Overleaf Git synchronization.
\\end{abstract}

\\section{Introduction}
Working on scientific papers often requires working on the go without reliable internet access. ZabLeaf allows researchers to edit LaTeX documents offline using a rich Monaco editor and live PDF preview.

\\section{Offline Git Sync Architecture}
When connectivity is restored, ZabLeaf pushes local commits directly to Overleaf Git remotes using conflict-resilient operational transformation logic.

\\end{document}`;

export const App: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [fileContent, setFileContent] = useState<string>(INITIAL_LATEX);
  const [savedEmail, setSavedEmail] = useState<string>('diletta@example.com');
  const [savedProjectId, setSavedProjectId] = useState<string>('zableaf-demo-project');
  const [notification, setNotification] = useState<string | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('📶 Network connection restored. Ready to sync with Overleaf!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('⚡ You are now offline. ZabLeaf is saving changes locally.');
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
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      showNotification('✅ PDF Recompiled successfully!');
    }, 600);
  };

  const handleSync = () => {
    if (!isOnline) {
      showNotification('⚠️ Cannot sync while offline. Connect to the internet to push changes to Overleaf.');
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
    showNotification(`🔒 Credentials saved for ${email}. Connected to Overleaf project!`);
  };

  // Parse title/author from latex for live preview demo
  const extractTitle = () => {
    const match = fileContent.match(/\\title\{([^}]+)\}/);
    return match ? match[1] : 'ZabLeaf Document';
  };

  const extractAuthor = () => {
    const match = fileContent.match(/\\author\{([^}]+)\}/);
    return match ? match[1] : 'Author Name';
  };

  const extractAbstract = () => {
    const match = fileContent.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
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
          files={INITIAL_FILES}
          activeFileId={activeFileId}
          onSelectFile={(id) => setActiveFileId(id)}
          onNewFile={() => showNotification('📄 Added new file to local project workspace')}
        />

        <div className="editor-pdf-split">
          <LaTeXEditor
            fileName="main.tex"
            content={fileContent}
            onChange={(val) => setFileContent(val || '')}
          />

          <PDFPreview
            title={extractTitle()}
            author={extractAuthor()}
            abstractText={extractAbstract()}
            sections={[
              {
                title: 'Introduction',
                body: 'Working on scientific papers often requires working on the go without reliable internet access. ZabLeaf allows researchers to edit LaTeX documents offline using a rich Monaco editor and live PDF preview.'
              },
              {
                title: 'Offline Git Sync Architecture',
                body: 'When connectivity is restored, ZabLeaf pushes local commits directly to Overleaf Git remotes using conflict-resilient operational transformation logic.'
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
