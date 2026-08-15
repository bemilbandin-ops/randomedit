import { Modal } from './Modal.tsx';
import type { EditorSettings, ExportFormat, ExportResolution, SourceMeta } from '../types.ts';

interface SettingsDialogProps {
  settings: EditorSettings;
  source: SourceMeta | null;
  onChange: (patch: Partial<EditorSettings>) => void;
  onSourceChange: (patch: Partial<SourceMeta>) => void;
  onClose: () => void;
}

const frameRates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
const resolutions: ExportResolution[] = ['source', '720p', '1080p', '1440p', '2160p'];
const exportFps: Array<'source' | number> = ['source', 24, 25, 30, 50, 60];

export function SettingsDialog({ settings, source, onChange, onSourceChange, onClose }: SettingsDialogProps) {
  return (
    <Modal
      title="Editor settings"
      subtitle="Change playback, sequence timing, review-export defaults, and source handoff metadata."
      onClose={onClose}
    >
      <div className="settings-grid" data-tutorial-key="settings-options">
        <label className="field">
          <span>Playback speed</span>
          <select
            value={settings.playbackSpeed}
            onChange={(event) => onChange({ playbackSpeed: Number(event.target.value) })}
          >
            {playbackSpeeds.map((speed) => <option value={speed} key={speed}>{speed}×</option>)}
          </select>
          <small>This changes preview playback only.</small>
        </label>

        <label className="field">
          <span>Sequence frame rate</span>
          <select
            value={settings.sequenceFps}
            onChange={(event) => onChange({ sequenceFps: Number(event.target.value) })}
          >
            {frameRates.map((fps) => <option value={fps} key={fps}>{fps} fps</option>)}
          </select>
          <small>Frame stepping and manual edit points use this rate.</small>
        </label>

        <label className="field">
          <span>Export resolution</span>
          <select
            value={settings.exportResolution}
            onChange={(event) => onChange({ exportResolution: event.target.value as ExportResolution })}
          >
            {resolutions.map((resolution) => (
              <option value={resolution} key={resolution}>
                {resolution === 'source' ? 'Match source' : resolution}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Export frame rate</span>
          <select
            value={String(settings.exportFps)}
            onChange={(event) => onChange({
              exportFps: event.target.value === 'source' ? 'source' : Number(event.target.value),
            })}
          >
            {exportFps.map((fps) => (
              <option value={fps} key={fps}>{fps === 'source' ? 'Match sequence' : `${fps} fps`}</option>
            ))}
          </select>
        </label>

        <label className="field field--full">
          <span>Preferred review format</span>
          <select
            value={settings.exportFormat}
            onChange={(event) => onChange({ exportFormat: event.target.value as ExportFormat })}
          >
            <option value="webm">WebM</option>
            <option value="mp4">MP4 when browser supports it</option>
          </select>
          <small>If the browser cannot record your preferred format, review export explains the fallback instead of changing the file extension silently.</small>
        </label>

        <label className="field">
          <span>Source frame rate for EDL</span>
          <input
            type="number"
            min="1"
            step="0.001"
            disabled={!source}
            value={source?.sourceFps ?? settings.sequenceFps}
            onChange={(event) => onSourceChange({ sourceFps: Number(event.target.value) })}
          />
          <small>The browser cannot reliably read embedded source FPS, so confirm this value before conform handoff.</small>
        </label>

        <label className="field">
          <span>Source start timecode</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{2,}:[0-9]{2}:[0-9]{2}:[0-9]{2}"
            disabled={!source}
            value={source?.startTimecode ?? '00:00:00:00'}
            onChange={(event) => onSourceChange({ startTimecode: event.target.value })}
          />
          <small>Use HH:MM:SS:FF from the original media metadata.</small>
        </label>

        <label className="field field--full">
          <span>Source reel / tape name</span>
          <input
            type="text"
            maxLength={8}
            disabled={!source}
            value={source?.reel ?? 'AX'}
            onChange={(event) => onSourceChange({ reel: event.target.value })}
          />
          <small>CMX EDL reel names are kept to eight simple characters.</small>
        </label>
      </div>
    </Modal>
  );
}
