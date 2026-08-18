import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import { fetch, ResponseType, Body } from '@tauri-apps/api/http';
import { writeTextFile, BaseDirectory } from '@tauri-apps/api/fs';

async function logToFile(msg: string) {
  try {
    // Append isn't natively trivial in tauri v1 without reading first, so we'll just write a unique file per log or use Date.now()
    await writeTextFile(`zabbleaf-debug-${Date.now()}.log`, msg, { dir: BaseDirectory.AppLocalData });
    console.log(msg);
  } catch (e) { console.error(e); }
}

export interface OverleafCredentials {
  email: string;
  gitToken: string;
}

// Custom HTTP plugin using Tauri's native HTTP client to bypass CORS
const tauriHttpPlugin = {
  async request({ url, method, headers, body }: any) {
    let tauriBody;
    if (body) {
      if (body instanceof Uint8Array) {
        tauriBody = Body.bytes(body);
      } else if (Array.isArray(body)) {
        let length = body.reduce((acc, b) => acc + b.length, 0);
        let buf = new Uint8Array(length);
        let offset = 0;
        for (const b of body) {
          buf.set(b, offset);
          offset += b.length;
        }
        tauriBody = Body.bytes(buf);
      } else if (Symbol.asyncIterator in body || Symbol.iterator in body) {
        let chunks: Uint8Array[] = [];
        for await (const chunk of body) {
          chunks.push(chunk as Uint8Array);
        }
        let length = chunks.reduce((acc, b) => acc + b.length, 0);
        let buf = new Uint8Array(length);
        let offset = 0;
        for (const b of chunks) {
          buf.set(b, offset);
          offset += b.length;
        }
        tauriBody = Body.bytes(buf);
      }
    }

    const res = await fetch(url, {
      method,
      headers: headers as Record<string, string>,
      body: tauriBody,
      responseType: ResponseType.Binary,
    });

    const outHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) {
      outHeaders[k.toLowerCase()] = v;
    }

    return {
      url: res.url,
      method,
      headers: outHeaders,
      body: {
        [Symbol.asyncIterator]() {
          let yielded = false;
          return {
            async next() {
              if (yielded) return { done: true, value: undefined };
              yielded = true;
              return { done: false, value: new Uint8Array(res.data as number[]) };
            }
          };
        }
      } as any,
      statusCode: res.status,
      statusMessage: res.ok ? 'OK' : 'Error',
    };
  }
};

// Initialize persistent browser filesystem
export const fs = new LightningFS('zabbleaf-fs');

export class GitSyncService {
  private credentials: OverleafCredentials | null = null;

  constructor() {}

  setCredentials(creds: OverleafCredentials) {
    this.credentials = creds;
  }
  
  getCredentials(): OverleafCredentials | null {
    return this.credentials;
  }

  getOverleafGitUrl(projectId: string): string {
    const id = projectId.replace('https://git.overleaf.com/', '').replace('https://www.overleaf.com/project/', '').trim();
    return `https://git.overleaf.com/${id}`;
  }
  
  /**
   * Clones a project for the first time
   */
  async cloneProject(projectId: string): Promise<{ success: boolean; message: string }> {
    if (!this.credentials) return { success: false, message: 'Please set your credentials' };
    
    const url = this.getOverleafGitUrl(projectId);
    const dir = `/projects/${projectId}`;
    
    try {
      await git.clone({
        fs,
        http: tauriHttpPlugin,
        dir,
        corsProxy: '',
        url,
        singleBranch: true,
        depth: 1,
        onAuth: () => ({
          username: 'git',
          password: this.credentials!.gitToken
        })
      });
      
      let debugLog = `Clone success for ${dir}\n`;
      const walk = async (currentDir: string, level: number) => {
        try {
          const entries = await fs.promises.readdir(currentDir);
          for (const e of entries) {
            debugLog += `${'  '.repeat(level)}- ${e}\n`;
            if (e !== '.git') {
              const st = await fs.promises.stat(`${currentDir}/${e}`);
              if (st.isDirectory()) await walk(`${currentDir}/${e}`, level + 1);
            }
          }
        } catch (e: any) { debugLog += `${'  '.repeat(level)}ERROR: ${e.message}\n`; }
      };
      await walk(dir, 0);
      await logToFile(debugLog);

      return { success: true, message: 'Project cloned successfully!' };
    } catch (err: any) {
      console.error(err);
      await logToFile(`Clone failed: ${err.message || err}`);
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

    const dir = `/projects/${projectId}`;

    try {
      // 1. Commit any unstaged local changes first
      const status = await git.statusMatrix({ fs, dir });
      let hasChanges = false;
      for (const row of status) {
        // [filepath, HEAD_status, WORKDIR_status, STAGE_status]
        if (row[1] !== row[2]) {
          await git.add({ fs, dir, filepath: row[0] });
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        await git.commit({
          fs,
          dir,
          author: { name: this.credentials.email.split('@')[0], email: this.credentials.email },
          message: `ZabbLeaf offline sync: ${new Date().toLocaleString()}`
        });
      }

      // 2. Pull remote changes
      await git.pull({
        fs,
        http: tauriHttpPlugin,
        dir,
        singleBranch: true,
        author: { name: this.credentials.email.split('@')[0], email: this.credentials.email },
        onAuth: () => ({
          username: 'git',
          password: this.credentials!.gitToken
        })
      });

      // 3. Push local changes
      await git.push({
        fs,
        http: tauriHttpPlugin,
        dir,
        onAuth: () => ({
          username: 'git',
          password: this.credentials!.gitToken
        })
      });

      return { success: true, message: 'Overleaf Git sync completed successfully!' };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: `Sync error: ${err.message || err}` };
    }
  }
  
  /**
   * Reads all files in the project directory, including subdirectories.
   */
  async readProjectFiles(projectId: string): Promise<{name: string, content: string}[]> {
    const dir = `/projects/${projectId}`;
    const files: {name: string, content: string}[] = [];
    
    const readDir = async (currentDir: string, prefix: string) => {
      try {
        const entries = await fs.promises.readdir(currentDir);
        for (const entry of entries) {
          if (entry === '.git') continue;
          const fullPath = `${currentDir}/${entry}`;
          const stat = await fs.promises.stat(fullPath);
          if (stat.isDirectory()) {
            await readDir(fullPath, prefix ? `${prefix}/${entry}` : entry);
          } else if (stat.isFile()) {
            try {
              const content = await fs.promises.readFile(fullPath, 'utf8');
              const name = prefix ? `${prefix}/${entry}` : entry;
              files.push({ name, content: content as string });
            } catch (readErr) {
              console.error(`Skipped ${fullPath} due to read error:`, readErr);
              // Skip binary files that can't be read as utf8
            }
          }
        }
      } catch {
        // Directory doesn't exist yet
      }
    };
    
    await readDir(dir, '');
    return files;
  }
  
  /**
   * Writes content to a file, creating subdirectories if needed.
   */
  async writeFile(projectId: string, fileName: string, content: string) {
    const dir = `/projects/${projectId}`;
    const filePath = `${dir}/${fileName}`;
    
    // Create parent directories if the file is in a subdirectory
    if (fileName.includes('/')) {
      const parts = fileName.split('/');
      let currentPath = dir;
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += `/${parts[i]}`;
        try {
          await fs.promises.mkdir(currentPath);
        } catch {
          // Directory already exists
        }
      }
    }
    
    await fs.promises.writeFile(filePath, content, 'utf8');
  }
}

export const gitSyncEngine = new GitSyncService();
