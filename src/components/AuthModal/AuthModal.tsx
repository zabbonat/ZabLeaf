import React, { useState } from 'react';
import { X, Shield, ExternalLink, Key, HelpCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCredentials: (email: string, token: string, projectId: string) => void;
  savedEmail?: string;
  savedProjectId?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSaveCredentials,
  savedEmail = '',
  savedProjectId = ''
}) => {
  const [email, setEmail] = useState(savedEmail);
  const [gitToken, setGitToken] = useState('');
  const [projectId, setProjectId] = useState(savedProjectId);
  const [activeTab, setActiveTab] = useState<'credentials' | 'google-help'>('credentials');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCredentials(email, gitToken, projectId);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="#10b981" />
            Overleaf Synchronization & Login Settings
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              color: activeTab === 'credentials' ? '#10b981' : '#94a3b8',
              borderBottom: activeTab === 'credentials' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Key size={14} /> Git Credentials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('google-help')}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              color: activeTab === 'google-help' ? '#10b981' : '#94a3b8',
              borderBottom: activeTab === 'google-help' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <HelpCircle size={14} /> Google / ORCID Login Guide
          </button>
        </div>

        {activeTab === 'credentials' ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Overleaf Account Email</label>
              <input
                type="email"
                className="input-control"
                placeholder="e.g. user@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Overleaf Git Password / Token</label>
                <button
                  type="button"
                  onClick={() => setActiveTab('google-help')}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Using Google/ORCID login?
                </button>
              </div>
              <input
                type="password"
                className="input-control"
                placeholder="Paste Git Token or Git Password here"
                value={gitToken}
                onChange={(e) => setGitToken(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Overleaf Project ID (or URL)</label>
              <input
                type="text"
                className="input-control"
                placeholder="e.g. 65e8a9f012b34c56789abcde"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              />
              <div className="help-text">
                Found in your browser address bar: <code>overleaf.com/project/<strong>65e8a9f012b34c56789abcde</strong></code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-sync">
                <CheckCircle2 size={16} /> Save & Connect
              </button>
            </div>
          </form>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#f8fafc' }}>
              <strong>How Google &amp; ORCID Login Works for Git:</strong><br />
              If you log into Overleaf using Google or ORCID, Overleaf does <em>not</em> ask for your Google password. Instead, Overleaf generates a dedicated <strong>Git Password / Token</strong> for synchronization.
            </div>

            <h4 style={{ color: '#10b981', marginBottom: '8px' }}>3 Easy Steps to Get Your Token:</h4>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                Open your Overleaf account settings:
                <div style={{ marginTop: '4px' }}>
                  <a
                    href="https://www.overleaf.com/user/settings"
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 600 }}
                  >
                    overleaf.com/user/settings <ExternalLink size={12} />
                  </a>
                </div>
              </li>
              <li>
                Scroll down to <strong>Git Integration</strong> and click <strong>Set Git Password</strong> (or Create Token).
              </li>
              <li>
                Copy the generated password and paste it into the <strong>Git Password / Token</strong> field in ZabbLeaf!
              </li>
            </ol>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-sync"
                onClick={() => setActiveTab('credentials')}
              >
                Go to Login Form &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
