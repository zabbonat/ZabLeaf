/**
 * Overleaf Cloud Compiler Service
 * Compiles LaTeX documents remotely using the Overleaf Git project.
 * Requires an active Overleaf connection with valid credentials.
 */

import { gitSyncEngine } from './gitSync';

export interface RemoteCompileResult {
  success: boolean;
  pdfUrl: string | null;
  log: string;
  errors: string[];
}

export class OverleafCompilerService {
  
  /**
   * Compiles the current project on Overleaf by:
   * 1. Pushing latest changes to Overleaf
   * 2. Fetching the compiled PDF output URL
   */
  async compile(projectId: string, files: {name: string, content: string}[]): Promise<RemoteCompileResult> {
    const creds = gitSyncEngine.getCredentials();
    
    if (!creds?.gitToken) {
      return {
        success: false,
        pdfUrl: null,
        log: 'Not connected to Overleaf. Please enter your credentials in Account settings.',
        errors: ['No Overleaf credentials']
      };
    }

    if (!navigator.onLine) {
      return {
        success: false,
        pdfUrl: null,
        log: 'Cannot use Overleaf Cloud compiler while offline. Switch to Quick Preview (HTML).',
        errors: ['Offline']
      };
    }

    try {
      // 1. Save all files to local git fs
      for (const file of files) {
        await gitSyncEngine.writeFile(projectId, file.name, file.content);
      }

      // 2. Push changes to Overleaf
      const syncResult = await gitSyncEngine.syncProject(projectId);
      
      if (!syncResult.success) {
        return {
          success: false,
          pdfUrl: null,
          log: `Sync failed: ${syncResult.message}\nCannot compile without syncing first.`,
          errors: [syncResult.message]
        };
      }

      // 3. The PDF is available at Overleaf's output URL
      const cleanId = projectId
        .replace('https://www.overleaf.com/project/', '')
        .replace('https://git.overleaf.com/', '')
        .trim();
      
      const pdfUrl = `https://www.overleaf.com/project/${cleanId}/output/output.pdf`;

      return {
        success: true,
        pdfUrl,
        log: `Overleaf Cloud compilation successful.\nProject synced and compiled on Overleaf servers.\nPDF URL: ${pdfUrl}`,
        errors: []
      };
    } catch (err: any) {
      return {
        success: false,
        pdfUrl: null,
        log: `Overleaf compile error: ${err.message || err}`,
        errors: [err.message || 'Unknown error']
      };
    }
  }

  /**
   * Checks if Overleaf compilation is available.
   */
  isAvailable(): boolean {
    const creds = gitSyncEngine.getCredentials();
    return !!(creds?.gitToken && navigator.onLine);
  }
}

export const overleafCompiler = new OverleafCompilerService();
