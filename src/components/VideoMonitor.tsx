import { AlertTriangle, Film } from 'lucide-react';
import type { RefObject } from 'react';

interface VideoMonitorProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceUrl: string;
  sourceName: string;
  isDemo: boolean;
  timecode: string;
  sequenceTime: number;
  sequenceDuration: number;
  markIn: number | null;
  markOut: number | null;
  mediaError: string | null;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onEnded: () => void;
  onError: () => void;
}

function seconds(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(2)}s`;
}

export function VideoMonitor({
  videoRef,
  sourceUrl,
  sourceName,
  isDemo,
  timecode,
  sequenceTime,
  sequenceDuration,
  markIn,
  markOut,
  mediaError,
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onError,
}: VideoMonitorProps) {
  return (
    <section className="monitor-panel" aria-label="Program monitor">
      <header className="panel-header monitor-header">
        <div>
          <span>Program</span>
          <strong>{sourceName}</strong>
        </div>
        <span className="monitor-header__mode">{isDemo ? 'Example source' : 'Your source'}</span>
      </header>

      <div className="monitor-stage">
        {mediaError ? (
          <div className="monitor-error">
            <AlertTriangle size={26} />
            <strong>Video could not be loaded</strong>
            <span>{mediaError}</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={sourceUrl}
            playsInline
            preload="metadata"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onError={onError}
          />
        )}
        <div className="monitor-stage__safe" aria-hidden="true" />
      </div>

      <footer className="monitor-footer">
        <div className="monitor-timecode">
          <Film size={15} />
          <strong>{timecode}</strong>
          <span>{sequenceTime.toFixed(2)} / {sequenceDuration.toFixed(2)}s</span>
        </div>
        <div className="source-range" aria-label="Source In and Out points">
          <span>IN <strong>{seconds(markIn)}</strong></span>
          <span>OUT <strong>{seconds(markOut)}</strong></span>
        </div>
      </footer>
    </section>
  );
}
