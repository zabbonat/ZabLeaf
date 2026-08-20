/**
 * Overleaf Cloud Compiler Service
 *
 * Overleaf has no public compile API: the /output/output.pdf endpoint needs a
 * logged-in browser session (a Git token does not authenticate it), and the
 * site sends X-Frame-Options, so the PDF can never be shown inside the app —
 * an embedded attempt just renders "overleaf.com refused to connect".
 *
 * What does work is pushing the project over Git and letting Overleaf compile
 * it in the browser, which is what this service does.
 */

import { open } from '@tauri-apps/api/shell';
import { gitSyncEngine, extractProjectId } from './gitSync';

export interface RemoteCompileResult {
  success: boolean;
  log: string;
  errors: string[];
}

export class OverleafCompilerService {
  /** The page Overleaf compiles on. */
  projectUrl(projectId: string): string {
    return `https://www.overleaf.com/project/${extractProjectId(projectId)}`;
  }

  /**
   * Pushes the project to Overleaf and opens it in the system browser.
   *
   * This writes to the user's real Overleaf project, so the caller is expected
   * to have confirmed the push first.
   */
  async compile(
    projectId: string,
    files: { name: string; content: string }[]
  ): Promise<RemoteCompileResult> {
    if (!gitSyncEngine.getCredentials()?.gitToken) {
      return {
        success: false,
        log: 'Not connected to Overleaf. Add your Git token under Account first.',
        errors: ['No Overleaf credentials']
      };
    }

    if (!navigator.onLine) {
      return {
        success: false,
        log: 'Overleaf compilation needs an internet connection. Switch to a local engine or Quick Preview.',
        errors: ['Offline']
      };
    }

    try {
      for (const file of files) {
        await gitSyncEngine.writeFile(projectId, file.name, file.content);
      }

      const sync = await gitSyncEngine.syncProject(projectId);
      if (!sync.success) {
        return {
          success: false,
          log: `Could not push to Overleaf: ${sync.message}`,
          errors: [sync.message]
        };
      }

      const url = this.projectUrl(projectId);
      await open(url);

      return {
        success: true,
        log:
          `Changes pushed to Overleaf and the project opened in your browser.\n${url}\n\n` +
          `Overleaf compiles there; the PDF cannot be embedded in ZabbLeaf because ` +
          `Overleaf blocks framing. For a PDF inside this window, install MiKTeX or ` +
          `TeX Live and pick a local engine.`,
        errors: []
      };
    } catch (err: any) {
      const message = String(err?.message || err);
      return { success: false, log: `Overleaf compile error: ${message}`, errors: [message] };
    }
  }

  isAvailable(): boolean {
    return !!(gitSyncEngine.getCredentials()?.gitToken && navigator.onLine);
  }
}

export const overleafCompiler = new OverleafCompilerService();
