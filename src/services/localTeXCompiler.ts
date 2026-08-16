/**
 * Local TeX Compiler Service
 * Detects and uses locally installed TeX distributions (TeX Live, MiKTeX)
 * via Tauri shell commands to compile real PDF output.
 */

export type TeXEngine = 'pdflatex' | 'xelatex' | 'lualatex';

export interface LocalCompileResult {
  success: boolean;
  pdfPath: string | null;
  pdfUrl: string | null;
  log: string;
  errors: string[];
  engine: TeXEngine;
}

export interface DetectedEngine {
  engine: TeXEngine;
  path: string;
  version: string;
}

export class LocalTeXCompilerService {
  private detectedEngines: DetectedEngine[] = [];
  private hasChecked = false;

  /**
   * Detects which TeX engines are available on the system.
   * Uses Tauri's shell API to check for pdflatex, xelatex, lualatex.
   */
  async detectEngines(): Promise<DetectedEngine[]> {
    if (this.hasChecked) return this.detectedEngines;
    this.hasChecked = true;
    this.detectedEngines = [];

    const engines: TeXEngine[] = ['pdflatex', 'xelatex', 'lualatex'];

    for (const engine of engines) {
      try {
        // Use Tauri's shell API to check if the engine exists
        const { Command } = await import('@tauri-apps/api/shell');
        const cmd = new Command(engine, ['--version']);
        
        const output = await cmd.execute();
        
        if (output.code === 0) {
          const version = output.stdout.split('\n')[0] || engine;
          this.detectedEngines.push({
            engine,
            path: engine,
            version: version.trim()
          });
        }
      } catch {
        // Engine not available or not in Tauri environment
      }
    }

    return this.detectedEngines;
  }

  /**
   * Compiles a LaTeX document using a local TeX engine.
   * Writes the file to a temp directory and runs the compiler.
   */
  async compile(
    texContent: string,
    engine: TeXEngine = 'pdflatex',
    fileName: string = 'main.tex'
  ): Promise<LocalCompileResult> {
    try {
      const { Command } = await import('@tauri-apps/api/shell');
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { writeTextFile, readBinaryFile, exists, createDir } = await import('@tauri-apps/api/fs');

      // Create a temp compilation directory
      const appDir = await appDataDir();
      const compileDir = await join(appDir, 'compile-tmp');
      
      if (!(await exists(compileDir))) {
        await createDir(compileDir, { recursive: true });
      }

      // Write the .tex file
      const texPath = await join(compileDir, fileName);
      await writeTextFile(texPath, texContent);

      // Run the compiler
      const cmd = new Command(engine, [
        '-interaction=nonstopmode',
        '-output-directory', compileDir,
        texPath
      ]);

      const output = await cmd.execute();
      const log = output.stdout + '\n' + output.stderr;

      // Check for output PDF
      const pdfName = fileName.replace('.tex', '.pdf');
      const pdfPath = await join(compileDir, pdfName);
      
      if (await exists(pdfPath)) {
        // Read the PDF and create a blob URL for the viewer
        const pdfBytes = await readBinaryFile(pdfPath);
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(blob);

        return {
          success: true,
          pdfPath,
          pdfUrl,
          log,
          errors: [],
          engine
        };
      } else {
        // Extract errors from log
        const errorLines = log.split('\n').filter(l => l.startsWith('!') || l.includes('Error'));
        return {
          success: false,
          pdfPath: null,
          pdfUrl: null,
          log,
          errors: errorLines.length > 0 ? errorLines : ['Compilation failed. Check log for details.'],
          engine
        };
      }
    } catch (err: any) {
      return {
        success: false,
        pdfPath: null,
        pdfUrl: null,
        log: `Failed to run ${engine}: ${err.message || err}\n\nMake sure ${engine} is installed and in your system PATH.\nInstall TeX Live: https://tug.org/texlive/\nInstall MiKTeX: https://miktex.org/download`,
        errors: [err.message || `${engine} not found`],
        engine
      };
    }
  }

  /**
   * Returns the list of detected engines.
   */
  getDetectedEngines(): DetectedEngine[] {
    return this.detectedEngines;
  }

  /**
   * Checks if any local TeX engine is available.
   */
  isAvailable(): boolean {
    return this.detectedEngines.length > 0;
  }
}

export const localTeXCompiler = new LocalTeXCompilerService();
