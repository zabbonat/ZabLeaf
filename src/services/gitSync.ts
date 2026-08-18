import { Command } from '@tauri-apps/api/shell';
import { readTextFile, readDir, writeTextFile, createDir, exists, BaseDirectory } from '@tauri-apps/api/fs';
import { homeDir, join } from '@tauri-apps/api/path';

export interface OverleafCredentials {
  email: string;
  gitToken: string;
}

/**
 * GitSyncService — Uses REAL git commands and REAL filesystem.
 * No more lightning-fs, no more custom HTTP plugins.
 * Projects are stored in ~/.zabbleaf/projects/<projectId>/
 */
export class GitSyncService {
  private credentials: OverleafCredentials | null = null;
  private basePath: string = '';

  constructor() {}

  /** Must be called once before any operation */
  async init() {
    const home = await homeDir();
    this.basePath = await join(home, '.zabbleaf', 'projects');
    // Ensure base directory exists
    try {
      const baseExists = await exists(this.basePath);
      if (!baseExists) {
        await createDir(this.basePath, { recursive: true });
      }
    } catch {
      // Directory might already exist
    }
    console.log(`[GitSync] Initialized. Projects stored at: ${this.basePath}`);
  }

  setCredentials(creds: OverleafCredentials) {
    this.credentials = creds;
    console.log(`[GitSync] Credentials set for ${creds.email}`);
  }
  
  getCredentials(): OverleafCredentials | null {
    return this.credentials;
  }

  getOverleafGitUrl(projectId: string): string {
    const id = projectId
      .replace('https://git.overleaf.com/', '')
      .replace('https://www.overleaf.com/project/', '')
      .replace(/\/+$/, '')
      .split('?')[0]
      .trim();
    return `https://git.overleaf.com/${id}`;
  }

  private getProjectDir(projectId: string): string {
    // We'll compute this synchronously since basePath is already resolved
    return `${this.basePath}\\${projectId}`;
  }

  /**
   * Run a git command and return stdout/stderr
   */
  private async runGit(args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
    console.log(`[GitSync] Running: git ${args.join(' ')}${cwd ? ` (in ${cwd})` : ''}`);
    
    const cmd = new Command('git', args, { cwd });
    const output = await cmd.execute();
    
    console.log(`[GitSync] Exit code: ${output.code}`);
    if (output.stdout) console.log(`[GitSync] stdout: ${output.stdout.substring(0, 500)}`);
    if (output.stderr) console.log(`[GitSync] stderr: ${output.stderr.substring(0, 500)}`);
    
    return {
      code: output.code ?? -1,
      stdout: output.stdout,
      stderr: output.stderr
    };
  }

  /**
   * Clones a project using real git clone
   */
  async cloneProject(projectId: string): Promise<{ success: boolean; message: string }> {
    if (!this.credentials) return { success: false, message: 'Please set your credentials' };
    
    const gitUrl = this.getOverleafGitUrl(projectId);
    const projectDir = this.getProjectDir(projectId);
    
    // Build authenticated URL: https://git:<token>@git.overleaf.com/<id>
    const authUrl = gitUrl.replace('https://', `https://git:${this.credentials.gitToken}@`);
    
    console.log(`[GitSync] Cloning ${gitUrl} into ${projectDir}`);
    
    try {
      // Check if directory already exists
      const dirExists = await exists(projectDir);
      if (dirExists) {
        console.log(`[GitSync] Directory already exists, removing...`);
        // Remove existing directory first
        const rmResult = await this.runGit(['clone', '--depth', '1', authUrl, projectDir + '_tmp']);
        // Actually, let's just try to pull instead
        return this.syncProject(projectId);
      }

      const result = await this.runGit(['clone', '--depth', '1', authUrl, projectDir]);
      
      if (result.code === 0) {
        return { success: true, message: 'Project cloned successfully!' };
      } else {
        // Clean up error message (remove token from output)
        const cleanErr = (result.stderr || result.stdout || 'Unknown error')
          .replace(this.credentials.gitToken, '***');
        return { success: false, message: `Clone error: ${cleanErr}` };
      }
    } catch (err: any) {
      console.error('[GitSync] Clone exception:', err);
      return { success: false, message: `Clone error: ${err.message || err}` };
    }
  }

  /**
   * Pulls remote changes and pushes local commits
   */
  async syncProject(projectId: string): Promise<{ success: boolean; message: string }> {
    if (!navigator.onLine) {
      return { success: false, message: 'Device is offline. Changes saved locally.' };
    }

    if (!this.credentials) {
      return { success: false, message: 'Please set your Overleaf account credentials.' };
    }

    const projectDir = this.getProjectDir(projectId);

    try {
      // Set git credential for this operation
      const gitUrl = this.getOverleafGitUrl(projectId);
      const authUrl = gitUrl.replace('https://', `https://git:${this.credentials.gitToken}@`);

      // Configure remote URL with auth
      await this.runGit(['remote', 'set-url', 'origin', authUrl], projectDir);

      // Stage all changes
      await this.runGit(['add', '-A'], projectDir);

      // Check if there are changes to commit
      const statusResult = await this.runGit(['status', '--porcelain'], projectDir);
      if (statusResult.stdout.trim()) {
        // Commit local changes
        await this.runGit([
          'commit', '-m', `ZabbLeaf offline sync: ${new Date().toLocaleString()}`,
          '--author', `${this.credentials.email.split('@')[0]} <${this.credentials.email}>`
        ], projectDir);
      }

      // Pull remote changes
      const pullResult = await this.runGit(['pull', '--rebase', 'origin', 'main'], projectDir);
      
      // Push local changes
      const pushResult = await this.runGit(['push', 'origin', 'main'], projectDir);

      // Clean remote URL (remove token)
      await this.runGit(['remote', 'set-url', 'origin', gitUrl], projectDir);

      if (pushResult.code === 0 || pullResult.code === 0) {
        return { success: true, message: 'Overleaf Git sync completed successfully!' };
      } else {
        const cleanErr = (pullResult.stderr + pushResult.stderr)
          .replace(this.credentials.gitToken, '***');
        return { success: false, message: `Sync error: ${cleanErr}` };
      }
    } catch (err: any) {
      console.error('[GitSync] Sync exception:', err);
      return { success: false, message: `Sync error: ${err.message || err}` };
    }
  }
  
  /**
   * Reads all text files in the project directory from the REAL filesystem
   */
  async readProjectFiles(projectId: string): Promise<{name: string, content: string}[]> {
    const projectDir = this.getProjectDir(projectId);
    const files: {name: string, content: string}[] = [];
    
    try {
      const dirExists = await exists(projectDir);
      if (!dirExists) {
        console.log(`[GitSync] Project directory does not exist: ${projectDir}`);
        return files;
      }

      const readDirRecursive = async (dirPath: string, prefix: string) => {
        try {
          const entries = await readDir(dirPath);
          for (const entry of entries) {
            if (!entry.name || entry.name.startsWith('.')) continue; // skip .git etc
            
            const fullPath = entry.path;
            
            if (entry.children !== undefined || entry.children === null) {
              // It's a directory — but readDir doesn't always populate children
              // We need to check differently
            }
            
            const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;
            
            // Try to read as a text file
            if (entry.name.match(/\.(tex|bib|cls|sty|txt|md|log|aux|bbl|blg|cfg|def|dtx|ins|ltx)$/i)) {
              try {
                const content = await readTextFile(fullPath);
                files.push({ name: relativeName, content });
              } catch {
                // Skip files that can't be read
              }
            }
          }
        } catch (err) {
          console.error(`[GitSync] Error reading directory ${dirPath}:`, err);
        }
      };
      
      await readDirRecursive(projectDir, '');
      console.log(`[GitSync] Read ${files.length} files from ${projectDir}`);
      
    } catch (err) {
      console.error('[GitSync] readProjectFiles error:', err);
    }
    
    return files;
  }
  
  /**
   * Writes content to a file on the REAL filesystem
   */
  async writeFile(projectId: string, fileName: string, content: string) {
    const projectDir = this.getProjectDir(projectId);
    const filePath = `${projectDir}\\${fileName.replace(/\//g, '\\\\')}`;
    
    // Create parent directories if needed
    if (fileName.includes('/')) {
      const parts = fileName.split('/');
      let currentPath = projectDir;
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += `\\${parts[i]}`;
        try {
          const dirExists = await exists(currentPath);
          if (!dirExists) {
            await createDir(currentPath, { recursive: true });
          }
        } catch { /* already exists */ }
      }
    }
    
    await writeTextFile(filePath, content);
  }
}

export const gitSyncEngine = new GitSyncService();
