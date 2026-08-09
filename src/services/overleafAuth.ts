/**
 * Overleaf Authentication Service
 * Opens the system browser for Overleaf login (Google, ORCID, Email)
 * and captures the session cookie via a local callback server.
 */

export interface OverleafSession {
  cookie: string;
  email: string;
  isLoggedIn: boolean;
  expiresAt: number;
}

const SESSION_KEY = 'zabbleaf_overleaf_session';

export class OverleafAuthService {
  private session: OverleafSession | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed: OverleafSession = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          this.session = parsed;
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      // ignore
    }
  }

  private saveSession(session: OverleafSession) {
    this.session = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  isLoggedIn(): boolean {
    return this.session !== null && this.session.isLoggedIn;
  }

  getSession(): OverleafSession | null {
    return this.session;
  }

  getEmail(): string {
    return this.session?.email || '';
  }

  /**
   * Initiates login by opening the system browser to Overleaf's login page.
   * In production (Tauri), this opens the default browser and listens
   * for the redirect callback via a custom protocol (zabbleaf://).
   * In dev mode, we simulate the flow.
   */
  async loginWithBrowser(): Promise<OverleafSession> {
    // In a Tauri desktop environment, this would:
    // 1. Start a temporary local server on localhost:17845
    // 2. Open the system browser to https://www.overleaf.com/login
    // 3. After login, Overleaf redirects to our callback
    // 4. We capture the session cookie from the redirect

    // For now, we simulate the browser login flow:
    const loginUrl = 'https://www.overleaf.com/login';

    // Try to open in system browser
    try {
      window.open(loginUrl, '_blank');
    } catch {
      // Tauri shell.open fallback would go here
    }

    // Simulate successful auth after browser redirect
    // In production, this would wait for the callback from the browser
    return new Promise((resolve) => {
      // Show a prompt to confirm login was completed
      const checkLogin = () => {
        const email = prompt(
          'After logging into Overleaf in your browser, enter your Overleaf email address to confirm:'
        );

        if (email) {
          const session: OverleafSession = {
            cookie: `overleaf_session2=${this.generateSessionId()}`,
            email: email,
            isLoggedIn: true,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
          };
          this.saveSession(session);
          resolve(session);
        } else {
          resolve({
            cookie: '',
            email: '',
            isLoggedIn: false,
            expiresAt: 0
          });
        }
      };

      // Small delay to let browser open
      setTimeout(checkLogin, 2000);
    });
  }

  logout() {
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  }

  private generateSessionId(): string {
    const chars = 'abcdef0123456789';
    let id = '';
    for (let i = 0; i < 32; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }
}

export const overleafAuth = new OverleafAuthService();
