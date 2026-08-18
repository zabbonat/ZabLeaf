import React, { useState, useEffect, useCallback } from 'react';
import { SyncToolbar, CompilerEngine, CompilerOption } from './components/SyncToolbar/SyncToolbar';
import { FileTree, FileNode } from './components/FileTree/FileTree';
import { LaTeXEditor } from './components/Editor/LaTeXEditor';
import { PDFPreview } from './components/PDFViewer/PDFPreview';
import { AuthModal } from './components/AuthModal/AuthModal';
import { ProjectList } from './components/ProjectList/ProjectList';
import { VersionHistory } from './components/VersionHistory/VersionHistory';
import { overleafAuth } from './services/overleafAuth';
import { OverleafProject, overleafApi } from './services/overleafApi';
import { latexCompiler } from './services/latexCompiler';
import { overleafCompiler } from './services/overleafCompiler';
import { localTeXCompiler, TeXEngine, DetectedEngine } from './services/localTeXCompiler';
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

  // Compiler Engines State
  const [selectedCompiler, setSelectedCompiler] = useState<CompilerEngine>('html-preview');
  const [detectedLocalEngines, setDetectedLocalEngines] = useState<DetectedEngine[]>([]);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const projectId = currentProject?.id || 'local-default';

  // Initialize git sync engine and detect local TeX installations on startup
  useEffect(() => {
    gitSyncEngine.init().catch(console.error);
    
    localTeXCompiler.detectEngines().then(engines => {
      setDetectedLocalEngines(engines);
      if (engines.length > 0) {
        const pdflatex = engines.find(e => e.engine === 'pdflatex');
        if (pdflatex) {
          setSelectedCompiler('pdflatex');
        } else {
          setSelectedCompiler(engines[0].engine);
        }
      }
    });
  }, []);

  const compilerOptions: CompilerOption[] = [
    {
      id: 'html-preview',
      label: 'Quick HTML Preview',
      description: 'Fast offline HTML-based preview. No TeX required.',
      available: true
    },
    {
      id: 'overleaf-cloud',
      label: 'Overleaf Cloud (Remote)',
      description: 'Compile via Overleaf cloud servers. Requires internet & token.',
      available: overleafCompiler.isAvailable()
    },
    {
      id: 'pdflatex',
      label: `pdflatex ${detectedLocalEngines.some(e => e.engine === 'pdflatex') ? '(Local)' : '(Not Installed)'}`,
      description: 'Standard TeX Live / MiKTeX pdflatex compiler.',
      available: detectedLocalEngines.some(e => e.engine === 'pdflatex')
    },
    {
      id: 'xelatex',
      label: `xelatex ${detectedLocalEngines.some(e => e.engine === 'xelatex') ? '(Local)' : '(Not Installed)'}`,
      description: 'XeLaTeX engine for custom TTF/OTF fonts.',
      available: detectedLocalEngines.some(e => e.engine === 'xelatex')
    },
    {
      id: 'lualatex',
      label: `lualatex ${detectedLocalEngines.some(e => e.engine === 'lualatex') ? '(Local)' : '(Not Installed)'}`,
      description: 'LuaLaTeX engine with modern Lua scripting.',
      available: detectedLocalEngines.some(e => e.engine === 'lualatex')
    }
  ];

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

    if (selectedCompiler === 'html-preview') {
      const result = await latexCompiler.compile(content);
      setIsCompiling(false);

      if (result.success && result.pdfUrl) {
        setCompiledPdfUrl(result.pdfUrl);
        setCompileLog(result.log);
        versionHistory.saveSnapshot(projectId, activeFile?.name || 'main.tex', content, `Compiled ${activeFile?.name}`);
        setSnapshots(versionHistory.getProjectHistory(projectId));
        showNotification(`✅ Quick Preview generated in ${result.compileTimeMs.toFixed(0)}ms`);
      } else {
        setCompileLog(result.log);
        showNotification('❌ Compilation failed. Check the log output.');
      }
    } else if (selectedCompiler === 'overleaf-cloud') {
      if (!currentProject) {
        setIsCompiling(false);
        showNotification('⚠️ Open a project to compile with Overleaf Cloud.');
        return;
      }
      const fileList = files.map(f => ({ name: f.name, content: f.content || '' }));
      const result = await overleafCompiler.compile(currentProject.id, fileList);
      setIsCompiling(false);

      if (result.success && result.pdfUrl) {
        setCompiledPdfUrl(result.pdfUrl);
        setCompileLog(result.log);
        showNotification('✅ Compiled remotely via Overleaf Cloud!');
      } else {
        setCompileLog(result.log);
        showNotification(`❌ ${result.log}`);
      }
    } else {
      // Local TeX compilation (pdflatex, xelatex, lualatex)
      const result = await localTeXCompiler.compile(content, selectedCompiler as TeXEngine, activeFile?.name || 'main.tex');
      setIsCompiling(false);

      if (result.success && result.pdfUrl) {
        setCompiledPdfUrl(result.pdfUrl);
        setCompileLog(result.log);
        versionHistory.saveSnapshot(projectId, activeFile?.name || 'main.tex', content, `Compiled with ${selectedCompiler}`);
        setSnapshots(versionHistory.getProjectHistory(projectId));
        showNotification(`✅ Compiled successfully using local ${selectedCompiler}!`);
      } else {
        setCompileLog(result.log);
        showNotification(`❌ Local ${selectedCompiler} compilation failed.`);
      }
    }
  }, [activeFile, currentProject, files, projectId, selectedCompiler]);

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

  const handleLogin = () => {
    setIsAuthOpen(true);
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
        const dirHandle = await (window as any).showDirectoryPicker();
        setFolderPath(dirHandle.name);
        showNotification(`📁 Opened: ${dirHandle.name}`);
      } else {
        showNotification('⚠️ Folder picker is not supported in this browser. Use Tauri desktop app.');
      }
    } catch { /* cancelled */ }
  };

  const handleOpenProject = async (project: OverleafProject) => {
    console.log(`[OPEN-PROJECT] Starting with project id="${project.id}", name="${project.name}"`);
    setCurrentProject(project);
    setCurrentView('editor');
    
    // Clear default files while loading/cloning
    setFiles([]);
    setActiveFileId('');
    
    // Attempt to load files from local disk (lightning-fs)
    console.log(`[OPEN-PROJECT] Reading local files...`);
    const localFiles = await gitSyncEngine.readProjectFiles(project.id);
    console.log(`[OPEN-PROJECT] Found ${localFiles.length} local files`);
    
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
      const creds = gitSyncEngine.getCredentials();
      console.log(`[OPEN-PROJECT] No local files. Credentials present: ${!!creds}, token present: ${!!creds?.gitToken}`);
      
      if (!creds?.gitToken) {
        setIsAuthOpen(true);
        setNotification('Please connect your Overleaf account to download this project.');
      } else {
        setIsSyncing(true);
        setNotification('Downloading project from Overleaf...');
        console.log(`[OPEN-PROJECT] Starting clone for project "${project.id}"...`);
        try {
          const res = await gitSyncEngine.cloneProject(project.id);
          console.log(`[OPEN-PROJECT] Clone result: success=${res.success}, message="${res.message}"`);
          setIsSyncing(false);
          
          if (res.success) {
            const newFiles = await gitSyncEngine.readProjectFiles(project.id);
            console.log(`[OPEN-PROJECT] After clone, found ${newFiles.length} files: ${newFiles.map(f => f.name).join(', ')}`);
            if (newFiles.length > 0) {
              setFiles(newFiles.map(f => ({
                id: f.name,
                name: f.name,
                type: 'file',
                content: f.content,
                isModified: false,
                lastSynced: new Date().toISOString()
              })));
              setActiveFileId(newFiles[0].name);
              showNotification(`✅ Project cloned! Found ${newFiles.length} files.`);
            } else {
               // Remote repository is completely empty, initialize with default
               const defaultFiles = [
                 { id: '1', name: 'main.tex', type: 'file' as const, content: DEFAULT_LATEX }
               ];
               setFiles(defaultFiles);
               setActiveFileId('1');
               showNotification(`⚠️ Project cloned but directory is empty!`);
            }
          } else {
            showNotification(`❌ Clone failed: ${res.message}`);
          }
        } catch (err: any) {
          console.error(`[OPEN-PROJECT] Exception during clone:`, err);
          setIsSyncing(false);
          showNotification(`❌ Error: ${err.message}`);
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
      overleafApi.addProject(project);
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
        selectedCompiler={selectedCompiler}
        compilerOptions={compilerOptions}
        onCompilerChange={setSelectedCompiler}
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
