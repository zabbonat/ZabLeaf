import React, { useState } from 'react';
import { X, Key, Info, CheckCircle2, Globe, Shield } from 'lucide-react';

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
            Overleaf Account & Git Sync Settings
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('credentials')}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              color: activeTab === 'credentials' ? '#10b981' : '#94a3b8',
              borderBottom: activeTab === 'credentials' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Git Sync Credentials
          </button>
          <button
            onClick={() => setActiveTab('google-help')}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 12px',
              color: activeTab === 'google-help' ? '#10b981' : '#94a3b8',
              borderBottom: activeTab === 'google-help' ? '2px solid #10b981' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Google / ORCID Users Guide
          </button>
        </div>

        {activeTab === 'credentials' ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Overleaf Account Email</label>
              <input
                type="email"
                className="input-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Overleaf Git Password / Access Token</label>
              <input
                type="password"
                className="input-control"
                placeholder="Paste Git Token or Password"
                value={gitToken}
                onChange={(e) => setGitToken(e.target.value)}
                required
              />
              <div className="help-text">
                Stored encrypted in your local OS Keychain. Generated under <em>Account -&gt; Account Settings -&gt; Git Integration</em> on Overleaf.
              </div>
            </div>

            <div className="input-group">
              <label>Overleaf Project ID or Git Remote URL</label>
              <input
                type="text"
                className="input-control"
                placeholder="65e8a9f012b34c... OR https://git.overleaf.com/PROJECT_ID"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
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
            <h4 style={{ color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} /> How to connect if you log into Overleaf via Google or ORCID:
            </h4>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Open <strong>Overleaf.com</strong> in your web browser.</li>
              <li>Go to your profile menu (top-right) and click <strong>Account Settings</strong>.</li>
              <li>Scroll down to the <strong>Git Integration</strong> section.</li>
              <li>Click <strong>Set Git Password / Generate Token</strong>.</li>
              <li>Copy that token and paste it here along with your Google/ORCID account email!</li>
            </ol>
            <div style={{ marginTop: '16px', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <Info size={14} color="#10b981" style={{ marginRight: '6px' }} />
              Once saved, ZabLeaf handles seamless background sync even when you edit offline!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
