import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SyncToolbar, CompilerEngine, CompilerOption } from './components/SyncToolbar/SyncToolbar';
import { FileTree, FileNode } from './components/FileTree/FileTree';
import { LaTeXEditor } from './components/Editor/LaTeXEditor';
import { PDFPreview } from './components/PDFViewer/PDFPreview';
import { AuthModal } from './components/AuthModal/AuthModal';
import { ProjectList } from './components/ProjectList/ProjectList';
import { LaTeXSetupBanner, LaTeXReadyNotice } from './components/LaTeXSetup/LaTeXSetupBanner';
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
  // Project the user asked to open before connecting an account; opened again
  // as soon as credentials are saved.
  const [pendingProject, setPendingProject] = useState<OverleafProject | null>(null);

  const [currentProject, setCurrentProject] = useState<OverleafProject | null>(null);
  const [files, setFiles] = useState<FileNode[]>([
    { id: '1', name: 'main.tex', type: 'file', content: DEFAULT_LATEX },
    { id: '2', name: 'references.bib', type: 'file', content: '@article{zabbleaf2026,\n  author={Abbonato, Diletta},\n  title={ZabbLeaf Desktop IDE},\n  year={2026}\n}' }
  ]);

  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [folderPath, setFolderPath] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);
  const [compiledPdfUrl, setCompiledPdfUrl] = useState<string | null>(null);
  const [compiledIsPdf, setCompiledIsPdf] = useState<boolean>(false);
  const [compileLog, setCompileLog] = useState<string>('');
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);

  // Compiler Engines State
  const [selectedCompiler, setSelectedCompiler] = useState<CompilerEngine>('html-preview');
  const [detectedLocalEngines, setDetectedLocalEngines] = useState<DetectedEngine[]>([]);
  const [isInstallingTex, setIsInstallingTex] = useState<boolean>(false);
  const [texJustInstalled, setTexJustInstalled] = useState<string>('');
  const [texSetupDismissed, setTexSetupDismissed] = useState<boolean>(
    () => localStorage.getItem('zabbleaf_tex_setup_dismissed') === '1'
  );

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const projectId = currentProject?.id || 'local-default';

  // Initialize git sync engine and detect local TeX installations on startup
  useEffect(() => {
    gitSyncEngine.init().then(() => {
      // Credentials live in the sync engine, so the header must reflect what it
      // actually restored rather than a stale "logged in" flag.
      setIsLoggedIn(!!gitSyncEngine.getCredentials()?.gitToken);
      if (!gitSyncEngine.getGitVersion()) {
        showNotification('⚠️ git was not found on this system. Install Git to download Overleaf projects.');
      }
    }).catch(console.error);

    localTeXCompiler.detectEngines().then(applyDetectedEngines);
  }, []);

  const applyDetectedEngines = (engines: DetectedEngine[]) => {
    setDetectedLocalEngines(engines);
    if (engines.length > 0) {
      const pdflatex = engines.find(e => e.engine === 'pdflatex');
      setSelectedCompiler(pdflatex ? 'pdflatex' : engines[0].engine);
    }
  };

  const handleInstallTeX = async () => {
    setIsInstallingTex(true);
    setNotification('⬇️ Installing LaTeX — this takes a few minutes...');

    const result = await localTeXCompiler.install();
    const engines = localTeXCompiler.getDetectedEngines();
    applyDetectedEngines(engines);
    setIsInstallingTex(false);

    if (result.success && engines.length > 0) {
      setTexJustInstalled(engines[0].version);
      showNotification(`✅ ${result.message}`);
    } else {
      setCompileLog(`${result.message}\n\n${result.log}`);
      showNotification(`❌ ${result.message}`);
    }
  };

  const handleDismissTexSetup = () => {
    setTexSetupDismissed(true);
    localStorage.setItem('zabbleaf_tex_setup_dismissed', '1');
  };

  const compilerOptions: CompilerOption[] = [
    {
      id: 'html-preview',
      label: 'Quick Text Preview',
      description: 'Rough offline text preview, not a real PDF. No TeX required.',
      available: true
    },
    {
      id: 'overleaf-cloud',
      label: 'Push to Overleaf & open',
      description: 'Pushes your changes, then opens the project in your browser where Overleaf compiles it.',
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

  // Editing fires on every keystroke; writing through to disk that often would
  // stutter the editor, so coalesce writes per file.
  const saveTimers = useRef<Record<string, number>>({});

  const queueSave = (project: string, fileName: string, content: string) => {
    const key = `${project}:${fileName}`;
    window.clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = window.setTimeout(() => {
      delete saveTimers.current[key];
      gitSyncEngine.writeFile(project, fileName, content).catch(console.error);
    }, 400);
  };

  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    const content = activeFile?.content || '';

    if (selectedCompiler === 'html-preview') {
      const result = await latexCompiler.compile(content);
      setIsCompiling(false);

      if (result.success && result.pdfUrl) {
        setCompiledPdfUrl(result.pdfUrl);
        setCompiledIsPdf(false);
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
      // This pushes to the real Overleaf project, so never do it silently.
      const confirmed = window.confirm(
        `Compiling on Overleaf pushes your local changes to "${currentProject.name}" ` +
        `and opens the project in your browser, where Overleaf compiles it.\n\n` +
        `Overleaf blocks embedding, so the PDF cannot appear inside ZabbLeaf.\n\nPush and open now?`
      );
      if (!confirmed) {
        setIsCompiling(false);
        return;
      }

      const fileList = files.map(f => ({ name: f.name, content: f.content || '' }));
      const result = await overleafCompiler.compile(currentProject.id, fileList);
      setIsCompiling(false);
      setCompileLog(result.log);
      showNotification(
        result.success
          ? '🌐 Pushed to Overleaf and opened in your browser.'
          : `❌ ${result.errors[0] || 'Overleaf compilation failed.'}`
      );
    } else {
      // Local TeX compilation (pdflatex, xelatex, lualatex). The engine reads
      // files from disk, so flush the editor first — and compile the whole
      // project directory so \input, .bib and class files resolve.
      const fileName = activeFile?.name || 'main.tex';
      for (const f of files) {
        await gitSyncEngine.writeFile(projectId, f.name, f.content || '');
      }

      const result = await localTeXCompiler.compile(projectId, fileName, selectedCompiler as TeXEngine);
      setIsCompiling(false);
      setCompileLog(result.log);

      if (result.success && result.pdfUrl) {
        setCompiledPdfUrl(result.pdfUrl);
        setCompiledIsPdf(true);
        versionHistory.saveSnapshot(projectId, fileName, content, `Compiled with ${selectedCompiler}`);
        setSnapshots(versionHistory.getProjectHistory(projectId));
        showNotification(`✅ Compiled ${fileName} with ${selectedCompiler}.`);
      } else {
        showNotification(`❌ ${result.errors[0] || `${selectedCompiler} compilation failed.`}`);
      }
    }
  }, [activeFile, currentProject, files, projectId, selectedCompiler]);

  const handleSync = async () => {
    if (!currentProject) return;

    setIsSyncing(true);
    setNotification('🔄 Syncing with Overleaf...');

    // Flush every edit to disk before git looks at the working tree.
    for (const f of files) {
      if (f.isModified) {
        await gitSyncEngine.writeFile(currentProject.id, f.name, f.content || '');
      }
    }

    const result = await gitSyncEngine.syncProject(currentProject.id);

    // Reload from disk so a rebase that brought in remote edits is reflected.
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

    overleafApi.updateProject(currentProject.id, {
      syncStatus: result.success ? 'synced' : 'local-changes',
      lastUpdated: new Date().toISOString()
    });

    setIsSyncing(false);
    showNotification(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  };

  const handleLogin = () => {
    setIsAuthOpen(true);
  };

  const handleContentChange = (newContent: string | undefined) => {
    const content = newContent || '';
    setFiles(prev => prev.map(f =>
      f.id === activeFileId ? { ...f, content, isModified: true } : f
    ));
    if (currentProject && activeFile) {
      queueSave(currentProject.id, activeFile.name, content);
    }
  };

  const handleNewFile = (fileName: string) => {
    const newId = Date.now().toString();
    const defaultContent = fileName.endsWith('.tex')
      ? `% ${fileName}\n\\section{${fileName.replace('.tex', '')}}\n\nWrite content here...\n`
      : `% ${fileName}\n`;
    setFiles(prev => [...prev, { id: newId, name: fileName, type: 'file', content: defaultContent }]);
    setActiveFileId(newId);
    if (currentProject) {
      gitSyncEngine.writeFile(currentProject.id, fileName, defaultContent).catch(console.error);
    }
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
    console.log(`[OPEN-PROJECT] id="${project.id}" name="${project.name}" local=${project.isLocal}`);
    setCurrentProject(project);
    setCurrentView('editor');
    setFiles([]);
    setActiveFileId('');
    overleafApi.addProject(project);

    const alreadyOnDisk = await gitSyncEngine.hasProject(project.id);
    console.log(`[OPEN-PROJECT] Already cloned: ${alreadyOnDisk}`);

    if (!alreadyOnDisk && !project.isLocal) {
      if (!gitSyncEngine.getCredentials()?.gitToken) {
        // Reopen this project automatically once the token is saved.
        setPendingProject(project);
        setIsAuthOpen(true);
        showNotification('🔑 Connect your Overleaf account to download this project.');
        return;
      }

      setIsSyncing(true);
      setNotification('⬇️ Downloading project from Overleaf...');
      const res = await gitSyncEngine.cloneProject(project.id);
      setIsSyncing(false);
      console.log(`[OPEN-PROJECT] Clone: success=${res.success} message="${res.message}"`);

      if (!res.success) {
        showNotification(`❌ ${res.message}`);
        return;
      }
    }

    const loaded = await gitSyncEngine.readProjectFiles(project.id);
    console.log(`[OPEN-PROJECT] Loaded ${loaded.length} files: ${loaded.map(f => f.name).join(', ')}`);

    if (loaded.length > 0) {
      setFiles(loaded.map(f => ({
        id: f.name,
        name: f.name,
        type: 'file',
        content: f.content,
        isModified: false,
        lastSynced: new Date().toISOString()
      })));
      setActiveFileId(loaded[0].name);
      overleafApi.updateProject(project.id, { isLocal: true, syncStatus: 'synced' });
      showNotification(`✅ Opened "${project.name}" — ${loaded.length} file${loaded.length === 1 ? '' : 's'}.`);
      return;
    }

    // Nothing readable on disk: a brand-new local project, or an Overleaf
    // project whose repository holds no text files.
    setFiles([{ id: 'main.tex', name: 'main.tex', type: 'file', content: DEFAULT_LATEX }]);
    setActiveFileId('main.tex');
    await gitSyncEngine.writeFile(project.id, 'main.tex', DEFAULT_LATEX);
    showNotification(
      project.isLocal
        ? `📄 Created "${project.name}" with a starter main.tex.`
        : '⚠️ This Overleaf project has no text files — starting from a blank main.tex.'
    );
  };

  const handleSaveCredentials = (email: string, _token: string, _projectId: string) => {
    setIsLoggedIn(true);
    showNotification(`🔒 Account connected: ${email}`);

    if (pendingProject) {
      const retry = pendingProject;
      setPendingProject(null);
      handleOpenProject(retry);
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
        <div style={{ padding: '0 32px' }}>
          {texJustInstalled ? (
            <LaTeXReadyNotice version={texJustInstalled} />
          ) : (
            <LaTeXSetupBanner
              isInstalled={detectedLocalEngines.length > 0}
              isInstalling={isInstallingTex}
              isDismissed={texSetupDismissed}
              onInstall={handleInstallTeX}
              onDismiss={handleDismissTexSetup}
            />
          )}
        </div>

        <ProjectList
          isLoggedIn={isLoggedIn}
          onOpenProject={handleOpenProject}
          onLogin={handleLogin}
          onNewProject={handleNewProject}
        />

        {/* Also needed here: the login button on this screen opens it. */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSaveCredentials={handleSaveCredentials}
          savedEmail={overleafAuth.getEmail()}
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
            isPdf={compiledIsPdf}
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
