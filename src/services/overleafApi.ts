/**
 * Overleaf API Service
 * Fetches project list and project files using the Overleaf session cookie.
 */

export interface OverleafProject {
  id: string;
  name: string;
  lastUpdated: string;
  owner: string;
  isLocal: boolean;
  syncStatus: 'synced' | 'local-changes' | 'online-only' | 'offline-only';
}

const LOCAL_PROJECTS_KEY = 'zabbleaf_local_projects';

export class OverleafApiService {
  private localProjects: OverleafProject[] = [];

  constructor() {
    this.loadLocalProjects();
  }

  private loadLocalProjects() {
    try {
      const stored = localStorage.getItem(LOCAL_PROJECTS_KEY);
      if (stored) {
        this.localProjects = JSON.parse(stored);
      }
    } catch {
      this.localProjects = [];
    }
  }

  private saveLocalProjects() {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(this.localProjects));
  }

  /**
   * Fetches the list of projects from Overleaf.
   * In production, this would use the session cookie to call the Overleaf API.
   * For now, returns demo projects + any locally created ones.
   */
  async getProjects(_sessionCookie?: string): Promise<OverleafProject[]> {
    // In production: fetch('https://www.overleaf.com/project', { headers: { Cookie: sessionCookie } })
    // Parse project list from JSON embedded in the dashboard HTML

    const demoProjects: OverleafProject[] = [
      {
        id: 'proj-001',
        name: 'My Research Paper 2026',
        lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        owner: 'Me',
        isLocal: true,
        syncStatus: 'synced'
      },
      {
        id: 'proj-002',
        name: 'Conference Submission - ICML',
        lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        owner: 'Me',
        isLocal: false,
        syncStatus: 'online-only'
      },
      {
        id: 'proj-003',
        name: 'PhD Thesis Draft',
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        owner: 'Me',
        isLocal: true,
        syncStatus: 'local-changes'
      },
      {
        id: 'proj-004',
        name: 'Collaboration with Prof. Rossi',
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        owner: 'Shared',
        isLocal: false,
        syncStatus: 'online-only'
      },
      {
        id: 'proj-005',
        name: 'Grant Proposal - ERC 2027',
        lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        owner: 'Me',
        isLocal: false,
        syncStatus: 'online-only'
      }
    ];

    return [...demoProjects, ...this.localProjects];
  }

  /**
   * Downloads a project's files for offline use.
   */
  async downloadProjectForOffline(projectId: string): Promise<void> {
    const projects = await this.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      project.isLocal = true;
      project.syncStatus = 'synced';
      this.saveLocalProjects();
    }
  }

  /**
   * Creates a new local project.
   */
  createLocalProject(name: string): OverleafProject {
    const project: OverleafProject = {
      id: `local-${Date.now()}`,
      name,
      lastUpdated: new Date().toISOString(),
      owner: 'Me',
      isLocal: true,
      syncStatus: 'offline-only'
    };
    this.localProjects.push(project);
    this.saveLocalProjects();
    return project;
  }
}

export const overleafApi = new OverleafApiService();
