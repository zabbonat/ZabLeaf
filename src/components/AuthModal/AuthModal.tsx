import React, { useState } from 'react';
import { X, Shield, ExternalLink, LogIn, CheckCircle2, Globe } from 'lucide-react';
import { overleafAuth } from '../../services/overleafAuth';

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
  savedEmail = ''
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleBrowserLogin = async () => {
    setIsLoggingIn(true);
    const session = await overleafAuth.loginWithBrowser();
    setIsLoggingIn(false);
    
    if (session.isLoggedIn) {
      onSaveCredentials(session.email, '', '');
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ margin: '0 auto 20px', width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={32} color="#10b981" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
          Connect to Overleaf
        </h2>
        
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
          ZabbLeaf uses a secure browser connection to sync your projects. 
          No need to copy/paste Git tokens or passwords anymore!
        </p>

        {savedEmail ? (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, color: '#f8fafc' }}>Currently connected as:</div>
            <div style={{ color: '#10b981', marginTop: '4px' }}>{savedEmail}</div>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn-sync" 
            onClick={handleBrowserLogin} 
            disabled={isLoggingIn}
            style={{ width: '100%', padding: '14px', fontSize: '1rem', justifyContent: 'center', gap: '10px' }}
          >
            {isLoggingIn ? (
              <>
                <Globe size={18} style={{ animation: 'spin 2s linear infinite' }} /> 
                Waiting for browser login...
              </>
            ) : (
              <>
                <LogIn size={18} /> 
                {savedEmail ? 'Login with a different account' : 'Login with Overleaf (Google / ORCID)'}
              </>
            )}
          </button>
          
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Shield size={12} /> Your credentials are never stored locally.
          </div>
        </div>
      </div>
    </div>
  );
};
