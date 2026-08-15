import { GripVertical, Music2, Video } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Clip, Marker } from '../types.ts';
import { sequenceDuration, timelineClipClickAction } from '../lib/timeline.ts';

interface TimelineProps {
  clips: Clip[];
  markers: Marker[];
  sequenceTime: number;
  selectedClipId: string | null;
  activeTool: 'selection' | 'razor';
  onSeek: (time: number) => void;
  onClipClick: (clipId: string, sequenceTime: number) => void;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function timeFromPointer(event: MouseEvent<HTMLElement>, duration: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
  return Math.max(0, Math.min(duration, ratio * duration));
}

export function Timeline({
  clips,
  markers,
  sequenceTime,
  selectedClipId,
  activeTool,
  onSeek,
  onClipClick,
}: TimelineProps) {
  const duration = Math.max(sequenceDuration(clips), 0.001);
  const playheadLeft = clampPercent((sequenceTime / duration) * 100);
  const rulerTicks = Array.from({ length: 9 }, (_, index) => (duration * index) / 8);

  const handleRulerClick = (event: MouseEvent<HTMLDivElement>) => {
    onSeek(timeFromPointer(event, duration));
  };

  let cursor = 0;
  const clipGeometry = clips.map((clip) => {
    const clipDuration = Math.max(0, clip.sourceEnd - clip.sourceStart);
    const start = cursor;
    cursor += clipDuration;
    return {
      clip,
      start,
      width: (clipDuration / duration) * 100,
    };
  });

  return (
    <section className="timeline-panel" aria-label="Timeline">
      <header className="panel-header timeline-header">
        <div>
          <span>Sequence</span>
          <strong>Practice Cut</strong>
        </div>
        <div className="timeline-header__legend">
          <span><i className="legend-dot legend-dot--video" /> V1</span>
          <span><i className="legend-dot legend-dot--audio" /> A1</span>
        </div>
      </header>

      <div
        className={`timeline-ruler ${activeTool === 'razor' ? 'timeline-ruler--razor' : ''}`}
        onClick={handleRulerClick}
        data-tutorial-key="timeline-ruler"
      >
        {rulerTicks.map((tick) => (
          <span className="timeline-tick" style={{ left: `${(tick / duration) * 100}%` }} key={tick.toFixed(4)}>
            {tick.toFixed(1)}s
          </span>
        ))}
        {markers.map((marker) => (
          <span
            className="timeline-marker"
            title={marker.label}
            style={{ left: `${clampPercent((marker.time / duration) * 100)}%` }}
            key={marker.id}
          />
        ))}
      </div>

      <div className="timeline-tracks" data-tutorial-key="timeline-clips">
        <div className="track-label">
          <Video size={14} />
          <strong>V1</strong>
        </div>
        <div className="track-lane track-lane--video">
          {clipGeometry.map(({ clip, start, width }, index) => (
            <button
              className={`timeline-clip ${clip.id === selectedClipId ? 'timeline-clip--selected' : ''}`}
              type="button"
              style={{ width: `${width}%` }}
              onClick={(event) => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
                const localDuration = clip.sourceEnd - clip.sourceStart;
                const clickTime = start + localDuration * Math.max(0, Math.min(1, ratio));
                const action = timelineClipClickAction(activeTool, clip.id, clickTime);
                onSeek(action.seekTime);
                onClipClick(clip.id, action.seekTime);
              }}
              title={`${clip.name} · ${clip.sourceStart.toFixed(2)}s–${clip.sourceEnd.toFixed(2)}s`}
              key={clip.id}
            >
              <GripVertical size={12} />
              <span>{index + 1}. {clip.name}</span>
              <small>{(clip.sourceEnd - clip.sourceStart).toFixed(2)}s</small>
            </button>
          ))}
          <span className="timeline-playhead" style={{ left: `${playheadLeft}%` }} aria-hidden="true">
            <i />
          </span>
        </div>

        <div className="track-label track-label--audio">
          <Music2 size={14} />
          <strong>A1</strong>
        </div>
        <div className="track-lane track-lane--audio" aria-hidden="true">
          {clipGeometry.map(({ clip, width }) => (
            <div className="audio-clip" style={{ width: `${width}%` }} key={`audio-${clip.id}`}>
              {Array.from({ length: 18 }, (_, barIndex) => (
                <i style={{ height: `${22 + ((barIndex * 13) % 52)}%` }} key={barIndex} />
              ))}
            </div>
          ))}
          <span className="timeline-playhead timeline-playhead--audio" style={{ left: `${playheadLeft}%` }} />
        </div>
      </div>
    </section>
  );
}
