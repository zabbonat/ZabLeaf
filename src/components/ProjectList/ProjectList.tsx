import React, { useState, useEffect } from 'react';
import { FolderGit2, Cloud, CloudOff, HardDrive, Clock, Search, Plus, Download, ArrowRight, RefreshCw, LogIn, Trash2 } from 'lucide-react';
import { OverleafProject, overleafApi } from '../../services/overleafApi';

interface ProjectListProps {
  isLoggedIn: boolean;
  onOpenProject: (project: OverleafProject) => void;
  onLogin: () => void;
  onNewProject: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  isLoggedIn,
  onOpenProject,
  onLogin,
  onNewProject
}) => {
  const [projects, setProjects] = useState<OverleafProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [isLoggedIn]);

  const loadProjects = async () => {
    setIsLoading(true);
    const list = await overleafApi.getProjects();
    setProjects(list);
    setIsLoading(false);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Less than 1 hour ago';
    if (diffH < 24) return `${diffH} hours ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'Yesterday';
    if (diffD < 7) return `${diffD} days ago`;
    return d.toLocaleDateString();
  };

  const getSyncIcon = (status: OverleafProject['syncStatus']) => {
    switch (status) {
      case 'synced': return <Cloud size={14} color="#10b981" />;
      case 'local-changes': return <RefreshCw size={14} color="#f59e0b" />;
      case 'online-only': return <CloudOff size={14} color="#94a3b8" />;
      case 'offline-only': return <HardDrive size={14} color="#3b82f6" />;
    }
  };

  const getSyncLabel = (status: OverleafProject['syncStatus']) => {
    switch (status) {
      case 'synced': return 'Synced';
      case 'local-changes': return 'Local changes';
      case 'online-only': return 'Online only';
      case 'offline-only': return 'Local only';
    }
  };

  return (
    <div className="project-list-container">
      {/* Header */}
      <div className="project-list-header">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>🌿</span>
            <span className="brand-logo">ZabbLeaf</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            Offline Overleaf Desktop IDE — by Diletta Abbonato
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isLoggedIn ? (
            <button className="btn-sync" onClick={onLogin} style={{ fontSize: '0.9rem', padding: '10px 20px' }}>
              <LogIn size={16} /> Login with Overleaf
            </button>
          ) : (
            <div className="status-indicator" style={{ padding: '6px 12px' }}>
              <div className="status-dot online" />
              <span>Connected to Overleaf</span>
            </div>
          )}
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="project-actions-bar">
        <div className="search-wrapper">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-control"
            style={{ border: 'none', background: 'transparent', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={loadProjects}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button 
            className="btn-sync" 
            onClick={() => {
              const url = prompt("Paste your Overleaf Project URL here:\n(e.g. https://www.overleaf.com/project/65e8...)");
              if (url) {
                const id = url.replace('https://www.overleaf.com/project/', '').replace('https://git.overleaf.com/', '').split('?')[0].trim();
                if (id.length > 5) {
                  const newProject: OverleafProject = {
                    id: id,
                    name: `Project ${id.substring(0, 6)}...`,
                    lastUpdated: new Date().toISOString(),
                    syncStatus: 'offline-only',
                    isLocal: false,
                    owner: 'Me'
                  };
                  setProjects([newProject, ...projects]);
                  // Automatically open the project to start cloning
                  onOpenProject(newProject);
                } else {
                  alert("Invalid Overleaf URL");
                }
              }
            }}
          >
            <Download size={14} /> Add from URL
          </button>
          <button className="btn-secondary" onClick={onNewProject}>
            <Plus size={14} /> Blank
          </button>
        </div>
      </div>

      {/* Project Grid */}
      <div className="project-grid">
        {isLoading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px' }}>Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.6 }}>🌿</div>
            <h2 style={{ color: '#f8fafc', fontSize: '1.3rem', marginBottom: '8px' }}>Welcome to ZabbLeaf!</h2>
            <p style={{ maxWidth: '420px', margin: '0 auto 24px', lineHeight: '1.5' }}>
              {searchQuery 
                ? `No projects match "${searchQuery}".`
                : 'Start by adding an existing Overleaf project or creating a new blank document.'}
            </p>
            {!searchQuery && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="btn-sync" 
                  style={{ padding: '12px 24px', fontSize: '0.95rem' }}
                  onClick={() => {
                    const url = prompt("Paste your Overleaf Project URL:\n(e.g. https://www.overleaf.com/project/65e8...)");
                    if (url) {
                      const id = url.replace('https://www.overleaf.com/project/', '').replace('https://git.overleaf.com/', '').split('?')[0].trim();
                      if (id.length > 5) {
                        const newProject: OverleafProject = { id, name: `Project ${id.substring(0, 6)}...`, lastUpdated: new Date().toISOString(), syncStatus: 'offline-only', isLocal: false, owner: 'Me' };
                        setProjects([newProject, ...projects]);
                        onOpenProject(newProject);
                      }
                    }
                  }}
                >
                  <Download size={16} /> Add Overleaf Project
                </button>
                <button className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onNewProject}>
                  <Plus size={16} /> Create Blank Document
                </button>
                {!isLoggedIn && (
                  <button className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={onLogin}>
                    <LogIn size={16} /> Connect Account
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredProjects.map(project => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => onOpenProject(project)}
            >
              <div className="project-card-header">
                <FolderGit2 size={20} color="#10b981" />
                <div className="project-sync-badge">
                  {getSyncIcon(project.syncStatus)}
                  <span>{getSyncLabel(project.syncStatus)}</span>
                </div>
              </div>

              <h3 className="project-card-title">{project.name}</h3>

              <div className="project-card-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  <span>{formatDate(project.lastUpdated)}</span>
                </div>
                <span>{project.owner}</span>
              </div>

              <div className="project-card-actions">
                {project.isLocal ? (
                  <button className="btn-sync" style={{ flex: 1, justifyContent: 'center', padding: '6px' }}>
                    Open <ArrowRight size={14} />
                  </button>
                ) : (
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '6px' }}>
                    <Download size={14} /> Download Offline
                  </button>
                )}
                <button
                  className="btn-secondary"
                  style={{ padding: '6px', color: '#ef4444', borderColor: 'transparent' }}
                  title="Delete Project"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${project.name}" from your local list?`)) {
                      overleafApi.removeProject(project.id);
                      setProjects(projects.filter(p => p.id !== project.id));
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
