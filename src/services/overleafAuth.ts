/**
 * Overleaf Authentication Service
 * Manages user credentials for Overleaf Git synchronization.
 * The real authentication happens via the Git Token flow in AuthModal.
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

  public saveSession(session: OverleafSession) {
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
   * Opens the Overleaf login page in the system browser.
   * The actual credential setup is handled by AuthModal + gitSyncEngine.
   */
  async loginWithBrowser(): Promise<OverleafSession> {
    const loginUrl = 'https://www.overleaf.com/user/settings';

    try {
      window.open(loginUrl, '_blank');
    } catch {
      // Tauri shell.open fallback would go here
    }

    // Return a "not logged in" session — the real login happens
    // when the user enters their email + token in the AuthModal
    return {
      cookie: '',
      email: '',
      isLoggedIn: false,
      expiresAt: 0
    };
  }

  logout() {
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  }
}

export const overleafAuth = new OverleafAuthService();
