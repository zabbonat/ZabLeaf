import React, { useState } from 'react';
import { X, Shield, ExternalLink, Key, CheckCircle2 } from 'lucide-react';
import { gitSyncEngine } from '../../services/gitSync';
import { overleafAuth } from '../../services/overleafAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCredentials: (email: string, token: string, projectId: string) => void;
  savedEmail?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSaveCredentials,
  savedEmail = ''
}) => {
  const [email, setEmail] = useState(savedEmail);
  const [gitToken, setGitToken] = useState(gitSyncEngine.getCredentials()?.gitToken || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save to overleafAuth for display, and gitSyncEngine for actual sync
    overleafAuth.saveSession({ cookie: '', email, isLoggedIn: true, expiresAt: Date.now() + 99999999 });
    gitSyncEngine.setCredentials({ email, gitToken });
    onSaveCredentials(email, gitToken, '');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="#10b981" />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Overleaf Git Sync</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', color: '#f8fafc', lineHeight: '1.5' }}>
          ZabbLeaf downloads and uploads your actual files using the official Overleaf Git interface. To connect, you need to generate a one-time Sync Token.
        </div>

        <ol style={{ paddingLeft: '20px', marginBottom: '24px', color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.9rem' }}>
          <li>
            Click here to open Overleaf Settings:<br/>
            <a 
              href="https://www.overleaf.com/user/settings" 
              target="_blank" 
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '6px', marginTop: '6px', textDecoration: 'none' }}
            >
              Open Overleaf Settings <ExternalLink size={14} />
            </a>
          </li>
          <li style={{ marginTop: '12px' }}>Scroll down to <strong>Git Integration</strong> and click <strong>Generate Git Password</strong>.</li>
          <li>Copy the password and paste it below.</li>
        </ol>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Overleaf Email (or Google/ORCID Email)</label>
            <input
              type="email"
              className="input-control"
              placeholder="e.g. your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Overleaf Sync Token (Git Password)</label>
            <input
              type="password"
              className="input-control"
              placeholder="Paste the generated token here"
              value={gitToken}
              onChange={(e) => setGitToken(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-sync">
              <CheckCircle2 size={18} /> Connect & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
