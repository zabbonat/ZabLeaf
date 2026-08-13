/**
 * Overleaf API Service
 * Manages the local project list. Real file sync is handled by gitSync.ts.
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
   * Returns all locally tracked projects.
   */
  async getProjects(): Promise<OverleafProject[]> {
    return [...this.localProjects];
  }

  /**
   * Adds a project to the local tracking list.
   */
  addProject(project: OverleafProject) {
    // Avoid duplicates
    if (!this.localProjects.find(p => p.id === project.id)) {
      this.localProjects.push(project);
      this.saveLocalProjects();
    }
  }

  /**
   * Updates a project's sync status and metadata.
   */
  updateProject(projectId: string, updates: Partial<OverleafProject>) {
    this.localProjects = this.localProjects.map(p =>
      p.id === projectId ? { ...p, ...updates } : p
    );
    this.saveLocalProjects();
  }

  /**
   * Removes a project from local tracking.
   */
  removeProject(projectId: string) {
    this.localProjects = this.localProjects.filter(p => p.id !== projectId);
    this.saveLocalProjects();
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
