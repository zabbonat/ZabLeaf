import React from 'react';
import { History, RotateCcw, FileText } from 'lucide-react';
import { VersionSnapshot, VersionHistoryService } from '../../services/versionHistory';

interface VersionHistoryProps {
  snapshots: VersionSnapshot[];
  onRestore: (snapshot: VersionSnapshot) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  snapshots,
  onRestore
}) => {
  if (snapshots.length === 0) {
    return (
      <div className="version-history-panel">
        <div className="version-history-header">
          <History size={16} color="#6fa8cc" />
          <span>Version History</span>
        </div>
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#7b8593', fontSize: '0.8rem' }}>
          No versions saved yet. Versions are created automatically when you compile.
        </div>
      </div>
    );
  }

  return (
    <div className="version-history-panel">
      <div className="version-history-header">
        <History size={16} color="#6fa8cc" />
        <span>Version History ({snapshots.length})</span>
      </div>

      <ul className="version-list">
        {snapshots.map((snapshot, index) => (
          <li key={snapshot.id} className="version-item">
            <div className="version-timeline">
              <div className={`version-dot ${index === 0 ? 'latest' : ''}`} />
              {index < snapshots.length - 1 && <div className="version-line" />}
            </div>

            <div className="version-content">
              <div className="version-time">
                {VersionHistoryService.timeAgo(snapshot.timestamp)}
              </div>
              <div className="version-message">
                <FileText size={12} color="#a0a9b5" />
                {snapshot.message}
              </div>
              <div className="version-file">{snapshot.fileName}</div>

              {index > 0 && (
                <button
                  className="version-restore-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(snapshot);
                  }}
                >
                  <RotateCcw size={12} /> Restore
                </button>
              )}
              {index === 0 && (
                <span className="version-current-badge">Current</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
