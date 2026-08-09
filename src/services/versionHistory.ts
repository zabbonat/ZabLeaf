/**
 * Version History Service
 * Stores local snapshots of file content for rollback and review.
 */

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  fileName: string;
  content: string;
  message: string;
  projectId: string;
}

const HISTORY_KEY = 'zabbleaf_version_history';
const MAX_VERSIONS = 50;

export class VersionHistoryService {
  private history: VersionSnapshot[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch {
      this.history = [];
    }
  }

  private saveHistory() {
    // Keep only the last MAX_VERSIONS entries
    if (this.history.length > MAX_VERSIONS) {
      this.history = this.history.slice(-MAX_VERSIONS);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
  }

  /**
   * Saves a snapshot of the current file content.
   */
  saveSnapshot(projectId: string, fileName: string, content: string, message?: string): VersionSnapshot {
    const snapshot: VersionSnapshot = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      fileName,
      content,
      message: message || `Edited ${fileName}`,
      projectId
    };

    this.history.push(snapshot);
    this.saveHistory();
    return snapshot;
  }

  /**
   * Gets all snapshots for a project, sorted newest first.
   */
  getProjectHistory(projectId: string): VersionSnapshot[] {
    return this.history
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Gets all snapshots for a specific file in a project.
   */
  getFileHistory(projectId: string, fileName: string): VersionSnapshot[] {
    return this.history
      .filter(s => s.projectId === projectId && s.fileName === fileName)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Returns the content of a specific snapshot.
   */
  getSnapshot(snapshotId: string): VersionSnapshot | undefined {
    return this.history.find(s => s.id === snapshotId);
  }

  /**
   * Clears all history for a project.
   */
  clearProjectHistory(projectId: string) {
    this.history = this.history.filter(s => s.projectId !== projectId);
    this.saveHistory();
  }

  /**
   * Returns formatted time ago string.
   */
  static timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

export const versionHistory = new VersionHistoryService();
