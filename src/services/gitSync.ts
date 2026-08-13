import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import { fetch, ResponseType, Body } from '@tauri-apps/api/http';

export interface OverleafCredentials {
  email: string;
  gitToken: string;
}

// Custom HTTP plugin using Tauri's native HTTP client to bypass CORS
const tauriHttpPlugin = {
  async request({ url, method, headers, body }: any) {
    let tauriBody;
    if (body) {
      // isomorphic-git passes an array of Uint8Arrays or a single Uint8Array
      let buf;
      if (Array.isArray(body)) {
        let length = body.reduce((acc, b) => acc + b.length, 0);
        buf = new Uint8Array(length);
        let offset = 0;
        for (const b of body) {
          buf.set(b, offset);
          offset += b.length;
        }
      } else {
        buf = body;
      }
      tauriBody = Body.bytes(buf);
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
          username: this.credentials!.email,
          password: this.credentials!.gitToken
        })
      });
      return { success: true, message: 'Project cloned successfully!' };
    } catch (err: any) {
      console.error(err);
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
          username: this.credentials!.email,
          password: this.credentials!.gitToken
        })
      });

      // 3. Push local changes
      await git.push({
        fs,
        http: tauriHttpPlugin,
        dir,
        onAuth: () => ({
          username: this.credentials!.email,
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
   * Reads all files in the project directory
   */
  async readProjectFiles(projectId: string): Promise<{name: string, content: string}[]> {
    const dir = `/projects/${projectId}`;
    const files = [];
    
    try {
      const fileNames = await fs.promises.readdir(dir);
      for (const name of fileNames) {
        if (name === '.git') continue;
        const stat = await fs.promises.stat(`${dir}/${name}`);
        if (stat.isFile()) {
          const content = await fs.promises.readFile(`${dir}/${name}`, 'utf8');
          files.push({ name, content: content as string });
        }
      }
      return files;
    } catch (err) {
      console.warn("Could not read project files", err);
      return [];
    }
  }
  
  /**
   * Writes content to a file
   */
  async writeFile(projectId: string, fileName: string, content: string) {
    const dir = `/projects/${projectId}`;
    await fs.promises.writeFile(`${dir}/${fileName}`, content, 'utf8');
  }
}

export const gitSyncEngine = new GitSyncService();
