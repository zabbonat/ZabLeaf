import React, { useState, useEffect, useCallback } from 'react';
import { SyncToolbar } from './components/SyncToolbar/SyncToolbar';
import { FileTree, FileNode } from './components/FileTree/FileTree';
import { LaTeXEditor } from './components/Editor/LaTeXEditor';
import { PDFPreview } from './components/PDFViewer/PDFPreview';
import { AuthModal } from './components/AuthModal/AuthModal';
import { ProjectList } from './components/ProjectList/ProjectList';
import { VersionHistory } from './components/VersionHistory/VersionHistory';
import { overleafAuth } from './services/overleafAuth';
import { OverleafProject } from './services/overleafApi';
import { latexCompiler } from './services/latexCompiler';
import { versionHistory, VersionSnapshot } from './services/versionHistory';
import { gitSyncEngine } from './services/gitSync';
import './styles/main.css';

type AppView = 'home' | 'editor';

const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\title{ZabbLeaf: Ultra-Lightweight Offline Overleaf IDE}
\\author{Diletta Abbonato (Zabbonat)}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
ZabbLeaf is a modern, open-source desktop application designed for offline LaTeX editing with seamless Overleaf Git synchronization. It compiles documents locally and synchronizes with your Overleaf projects when internet is available.
\\end{abstract}

\\section{Introduction}
Working on scientific papers often requires working on the go without reliable internet access. ZabbLeaf allows researchers to edit LaTeX documents offline using a rich Monaco editor and live PDF preview.

\\subsection{Motivation}
Traditional cloud-based editors like Overleaf require constant internet access. ZabbLeaf bridges this gap by providing a fully functional offline environment.

\\section{Offline Git Sync Architecture}
When connectivity is restored, ZabbLeaf pushes local commits directly to Overleaf Git remotes using conflict-resilient operational transformation logic.

\\section{Conclusion}
ZabbLeaf provides a seamless bridge between offline editing and online collaboration through Overleaf.

\\end{document}`;

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(overleafAuth.isLoggedIn());

  const [currentProject, setCurrentProject] = useState<OverleafProject | null>(null);
  const [files, setFiles] = useState<FileNode[]>([
    { id: '1', name: 'main.tex', type: 'file', content: DEFAULT_LATEX },
    { id: '2', name: 'references.bib', type: 'file', content: '@article{zabbleaf2026,\n  author={Abbonato, Diletta},\n  title={ZabbLeaf Desktop IDE},\n  year={2026}\n}' }
  ]);

  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [folderPath, setFolderPath] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState<string>('');
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const projectId = currentProject?.id || 'local-default';

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification('📶 Network connection restored. Ready to sync with Overleaf!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification('⚡ Offline mode active. Edits are saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load version history when project changes
  useEffect(() => {
    setSnapshots(versionHistory.getProjectHistory(projectId));
  }, [projectId]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    const content = activeFile?.content || '';
    const result = await latexCompiler.compile(content);
    setIsCompiling(false);

    if (result.success && result.pdfUrl) {
      setCompiledPdfUrl(result.pdfUrl);
      setCompileLog(result.log);

      // Save version snapshot
      versionHistory.saveSnapshot(projectId, activeFile?.name || 'main.tex', content, `Compiled ${activeFile?.name}`);
      setSnapshots(versionHistory.getProjectHistory(projectId));

      showNotification(`✅ Compiled in ${result.compileTimeMs.toFixed(0)}ms`);
    } else {
      setCompileLog(result.log);
      showNotification('❌ Compilation failed. Check the log output.');
    }
  }, [activeFile, projectId]);

  const handleSync = async () => {
    if (!currentProject) return;
    
    setIsSyncing(true);
    setNotification('Syncing with Overleaf...');
    
    // Save any active modifications to disk first
    for (const f of files) {
      if (f.isModified) {
        await gitSyncEngine.writeFile(currentProject.id, f.name, f.content || '');
      }
    }
    
    const result = await gitSyncEngine.syncProject(currentProject.id);
    
    // Reload files from disk after sync
    const updatedFiles = await gitSyncEngine.readProjectFiles(currentProject.id);
    if (updatedFiles.length > 0) {
      setFiles(updatedFiles.map(f => ({
        id: f.name,
        name: f.name,
        type: 'file',
        content: f.content,
        isModified: false,
        lastSynced: new Date().toISOString()
      })));
      if (!updatedFiles.find(f => f.name === activeFileId)) {
        setActiveFileId(updatedFiles[0].name);
      }
    }
    
    setIsSyncing(false);
    setNotification(result.message);
  };

  const handleLogin = async () => {
    const session = await overleafAuth.loginWithBrowser();
    if (session.isLoggedIn) {
      setIsLoggedIn(true);
      showNotification(`🔒 Logged in as ${session.email}`);
    }
  };

  const handleSaveCredentials = (email: string, _token: string, _projectId: string) => {
    setIsLoggedIn(true);
    showNotification(`🔒 Account connected: ${email}`);
  };

  const handleContentChange = (newContent: string | undefined) => {
    const content = newContent || '';
    setFiles(prev => prev.map(f => 
      f.id === activeFileId ? { ...f, content, isModified: true } : f
    ));
    // Save directly to local disk for safety
    if (currentProject && activeFile) {
      gitSyncEngine.writeFile(currentProject.id, activeFile.name, content).catch(console.error);
    }
  };

  const handleNewFile = (fileName: string) => {
    const newId = Date.now().toString();
    const defaultContent = fileName.endsWith('.tex')
      ? `% ${fileName}\n\\section{${fileName.replace('.tex', '')}}\n\nWrite content here...\n`
      : `% ${fileName}\n`;
    setFiles(prev => [...prev, { id: newId, name: fileName, type: 'file', content: defaultContent }]);
    setActiveFileId(newId);
    showNotification(`📄 Created "${fileName}"`);
  };

  const handleDeleteFile = (idToDelete: string) => {
    if (files.length <= 1) return;
    const name = files.find(f => f.id === idToDelete)?.name;
    setFiles(prev => prev.filter(f => f.id !== idToDelete));
    if (activeFileId === idToDelete) {
      setActiveFileId(files.filter(f => f.id !== idToDelete)[0].id);
    }
    showNotification(`🗑️ Deleted "${name}"`);
  };

  const handleOpenFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        setFolderPath(dirHandle.name);
        showNotification(`📁 Opened: ${dirHandle.name}`);
      } else {
        const path = prompt('Enter workspace path:', folderPath);
        if (path) { setFolderPath(path); showNotification(`📁 Set to: ${path}`); }
      }
    } catch { /* cancelled */ }
  };

  const handleOpenProject = async (project: OverleafProject) => {
    setCurrentProject(project);
    setCurrentView('editor');
    
    // Attempt to load files from local disk (lightning-fs)
    const localFiles = await gitSyncEngine.readProjectFiles(project.id);
    
    if (localFiles.length > 0) {
      setFiles(localFiles.map(f => ({
        id: f.name,
        name: f.name,
        type: 'file',
        content: f.content,
        isModified: false,
        lastSynced: project.lastUpdated
      })));
      setActiveFileId(localFiles[0].name);
    } else {
      // Empty local disk, need to clone!
      if (!gitSyncEngine.getCredentials()?.gitToken) {
        setIsAuthOpen(true);
        setNotification('Please connect your Overleaf account to download this project.');
      } else {
        setIsSyncing(true);
        setNotification('Downloading project from Overleaf...');
        const res = await gitSyncEngine.cloneProject(project.id);
        setIsSyncing(false);
        
        if (res.success) {
          const newFiles = await gitSyncEngine.readProjectFiles(project.id);
          setFiles(newFiles.map(f => ({
            id: f.name,
            name: f.name,
            type: 'file',
            content: f.content,
            isModified: false,
            lastSynced: new Date().toISOString()
          })));
          if (newFiles.length > 0) setActiveFileId(newFiles[0].name);
          setNotification(res.message);
        } else {
          setNotification(res.message);
        }
      }
    }
  };

  const handleNewProject = () => {
    const name = prompt('Enter project name:');
    if (name) {
      const project: OverleafProject = {
        id: `local-${Date.now()}`,
        name,
        lastUpdated: new Date().toISOString(),
        owner: 'Me',
        isLocal: true,
        syncStatus: 'offline-only'
      };
      handleOpenProject(project);
    }
  };

  const handleRestoreVersion = (snapshot: VersionSnapshot) => {
    const file = files.find(f => f.name === snapshot.fileName);
    if (file) {
      setFiles(prev => prev.map(f => f.name === snapshot.fileName ? { ...f, content: snapshot.content, isModified: true } : f));
      setActiveFileId(file.id);
      showNotification(`↩️ Restored "${snapshot.fileName}" to version from ${new Date(snapshot.timestamp).toLocaleTimeString()}`);
    }
  };

  // HOME VIEW: Project List
  if (currentView === 'home') {
    return (
      <div className="zabbleaf-app">
        {notification && (
          <div style={{
            position: 'fixed', bottom: '20px', right: '20px',
            background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981',
            padding: '12px 20px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 999, fontSize: '0.85rem'
          }}>
            {notification}
          </div>
        )}
        <ProjectList
          isLoggedIn={isLoggedIn}
          onOpenProject={handleOpenProject}
          onLogin={handleLogin}
          onNewProject={handleNewProject}
        />
      </div>
    );
  }

  // EDITOR VIEW
  return (
    <div className="zabbleaf-app">
      <SyncToolbar
        isOnline={isOnline}
        isSyncing={isSyncing}
        isCompiling={isCompiling}
        onSync={handleSync}
        onCompile={handleCompile}
        onOpenAuth={() => setIsAuthOpen(true)}
        onHome={() => setCurrentView('home')}
        projectName={currentProject?.name || 'Local Project'}
      />

      {notification && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px',
          background: '#1e293b', color: '#f8fafc', border: '1px solid #10b981',
          padding: '12px 20px', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 999, fontSize: '0.85rem'
        }}>
          {notification}
        </div>
      )}

      <div className="workspace-container">
        <FileTree
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
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
            compiledUrl={compiledPdfUrl}
            compileLog={compileLog}
            isCompiling={isCompiling}
          />
        </div>

        <VersionHistory
          snapshots={snapshots}
          onRestore={handleRestoreVersion}
        />
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSaveCredentials={handleSaveCredentials}
        savedEmail={overleafAuth.getEmail()}
      />
    </div>
  );
};

export default App;
