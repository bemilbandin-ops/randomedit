import {
  FileDown,
  Gauge,
  Keyboard,
  Settings,
  Upload,
} from 'lucide-react';
import type { ChangeEvent } from 'react';

interface TopBarProps {
  projectName: string;
  sourceName: string;
  progressPercent: number;
  shortcutProfileLabel: string;
  onProjectNameChange: (name: string) => void;
  onUpload: (file: File) => void;
  onOpenProgress: () => void;
  onOpenShortcuts: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
}

export function TopBar({
  projectName,
  sourceName,
  progressPercent,
  shortcutProfileLabel,
  onProjectNameChange,
  onUpload,
  onOpenProgress,
  onOpenShortcuts,
  onOpenSettings,
  onOpenExport,
}: TopBarProps) {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUpload(file);
    event.target.value = '';
  };

  return (
    <header className="topbar">
      <div className="brand" aria-label="Random Edit">
        <span className="brand__mark" aria-hidden="true">RE</span>
        <div className="brand__text">
          <strong>Random Edit</strong>
          <span>learn by cutting</span>
        </div>
      </div>

      <div className="project-strip">
        <input
          className="project-name"
          aria-label="Project name"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
        />
        <span className="source-name" title={sourceName}>{sourceName}</span>
      </div>

      <nav className="topbar__actions" aria-label="Project actions">
        <button className="toolbar-button" type="button" onClick={onOpenProgress}>
          <Gauge size={16} />
          <span>{progressPercent}%</span>
        </button>

        <label className="toolbar-button toolbar-button--upload" data-tutorial-key="upload-media">
          <Upload size={16} />
          <span>Upload video</span>
          <input type="file" accept="video/*" onChange={handleFile} />
        </label>

        <button className="toolbar-button" type="button" onClick={onOpenShortcuts}>
          <Keyboard size={16} />
          <span>{shortcutProfileLabel}</span>
        </button>

        <button
          className="icon-button"
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          data-tutorial-key="settings"
        >
          <Settings size={18} />
        </button>

        <button
          className="primary-button"
          type="button"
          onClick={onOpenExport}
          data-tutorial-key="export-project"
        >
          <FileDown size={16} />
          Export
        </button>
      </nav>
    </header>
  );
}
