import React from 'react';
import Editor from '@monaco-editor/react';

interface LaTeXEditorProps {
  content: string;
  onChange: (value: string | undefined) => void;
  fileName: string;
}

export const LaTeXEditor: React.FC<LaTeXEditorProps> = ({
  content,
  onChange,
  fileName
}) => {
  return (
    <div className="editor-pane">
      <div className="pane-header">
        <span>📄 {fileName}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>LaTeX Code Editor</span>
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="latex"
          theme="vs-dark"
          value={content}
          onChange={onChange}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            automaticLayout: true,
            tabSize: 2
          }}
        />
      </div>
    </div>
  );
};
