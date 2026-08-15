import { FileJson, Film, ListVideo, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { Modal } from './Modal.tsx';
import type { EditorSettings, SourceMeta } from '../types.ts';

interface ExportDialogProps {
  settings: EditorSettings;
  source: SourceMeta | null;
  isDemo: boolean;
  reviewAvailable: boolean;
  reviewUnavailableReason?: string;
  renderProgress: number | null;
  renderMessage: string;
  onDownloadProject: () => void;
  onDownloadEdl: () => void;
  onImportProject: (file: File) => void;
  onRenderReview: () => void;
  onClose: () => void;
}

export function ExportDialog({
  settings,
  source,
  isDemo,
  reviewAvailable,
  reviewUnavailableReason,
  renderProgress,
  renderMessage,
  onDownloadProject,
  onDownloadEdl,
  onImportProject,
  onRenderReview,
  onClose,
}: ExportDialogProps) {
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportProject(file);
    event.target.value = '';
  };

  const rendering = renderProgress !== null && renderProgress < 1;

  return (
    <Modal
      title="Export and hand off"
      subtitle="Save editable decisions for review, or render a simple review copy in the browser."
      onClose={onClose}
      wide
    >
      <div className="export-grid">
        <section className="export-option">
          <FileJson size={23} />
          <h3>Random Edit project</h3>
          <p>Portable JSON with clip boundaries, markers, settings, tutorial progress and shortcuts.</p>
          <button
            className="primary-button"
            type="button"
            onClick={onDownloadProject}
            data-tutorial-key="download-project"
          >
            Download project
          </button>
        </section>

        <section className="export-option">
          <ListVideo size={23} />
          <h3>EDL for quick review</h3>
          <p>A compact CMX-style edit list with source and record timecodes for each sequence clip.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={onDownloadEdl}
            data-tutorial-key="download-edl"
          >
            Download .edl
          </button>
        </section>

        <section className="export-option export-option--review">
          <Film size={23} />
          <h3>Review video</h3>
          <p>
            {settings.exportResolution === 'source' ? 'Source resolution' : settings.exportResolution}
            {' · '}
            {settings.exportFps === 'source' ? `${settings.sequenceFps} fps` : `${settings.exportFps} fps`}
            {' · '}
            {settings.exportFormat.toUpperCase()} preferred
          </p>
          <button
            className="primary-button"
            type="button"
            disabled={isDemo || !source || !reviewAvailable || rendering}
            onClick={onRenderReview}
            data-tutorial-key="render-review"
          >
            {rendering ? 'Rendering…' : 'Render review video'}
          </button>
          {isDemo ? <small>Upload your own video first. Remote example media is kept out of review rendering to avoid cross-origin canvas failures.</small> : null}
          {!isDemo && !reviewAvailable && reviewUnavailableReason ? <small>{reviewUnavailableReason}</small> : null}
          {renderProgress !== null ? (
            <div className="render-progress" aria-label={`Render progress ${Math.round(renderProgress * 100)} percent`}>
              <span style={{ width: `${Math.round(renderProgress * 100)}%` }} />
            </div>
          ) : null}
          {renderMessage ? <small className="render-message">{renderMessage}</small> : null}
        </section>
      </div>

      <div className="import-strip">
        <div>
          <Upload size={18} />
          <span>
            <strong>Open an exported project</strong>
            <small>The app restores edit decisions, then asks you to relink the source video.</small>
          </span>
        </div>
        <label className="secondary-button">
          Import project
          <input type="file" accept="application/json,.json" onChange={handleImport} />
        </label>
      </div>
    </Modal>
  );
}
