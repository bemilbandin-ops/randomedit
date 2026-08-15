import { GripVertical, Music2, Video } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Clip, Marker } from '../types.ts';
import { sequenceDuration, timelineClipClickAction } from '../lib/timeline.ts';

interface TimelineProps {
  clips: Clip[];
  markers: Marker[];
  sequenceTime: number;
  sequenceFps: number;
  sourceDuration: number;
  audioPeaks: number[] | null;
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

function clipAudioPeaks(
  audioPeaks: number[] | null,
  clip: Clip,
  sourceDuration: number,
  maxBars = 24,
): number[] {
  if (!audioPeaks || audioPeaks.length === 0 || sourceDuration <= 0) return [];
  const start = Math.max(0, Math.min(audioPeaks.length - 1, Math.floor((clip.sourceStart / sourceDuration) * audioPeaks.length)));
  const end = Math.max(start + 1, Math.min(audioPeaks.length, Math.ceil((clip.sourceEnd / sourceDuration) * audioPeaks.length)));
  const segment = audioPeaks.slice(start, end);
  if (segment.length <= maxBars) return segment;
  return Array.from({ length: maxBars }, (_, index) => {
    const bucketStart = Math.floor((index * segment.length) / maxBars);
    const bucketEnd = Math.max(bucketStart + 1, Math.floor(((index + 1) * segment.length) / maxBars));
    return segment.slice(bucketStart, bucketEnd).reduce((peak, value) => Math.max(peak, value), 0);
  });
}

export function Timeline({
  clips,
  markers,
  sequenceTime,
  sequenceFps,
  sourceDuration,
  audioPeaks,
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

  const handleRulerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = 1 / Math.max(1, sequenceFps);
    let next: number | null = null;

    if (event.key === 'ArrowLeft') next = sequenceTime - step;
    if (event.key === 'ArrowRight') next = sequenceTime + step;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = duration;
    if (next === null) return;

    event.preventDefault();
    onSeek(Math.max(0, Math.min(duration, next)));
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
        onKeyDown={handleRulerKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Timeline playhead"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.min(sequenceTime, duration)}
        aria-valuetext={`${Math.min(sequenceTime, duration).toFixed(2)} seconds`}
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
                const action = timelineClipClickAction(activeTool, clip.id, clickTime, sequenceFps);
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
          {clipGeometry.map(({ clip, width }) => {
            const peaks = clipAudioPeaks(audioPeaks, clip, sourceDuration);
            return (
              <div className="audio-clip" style={{ width: `${width}%` }} key={`audio-${clip.id}`}>
                {peaks.map((peak, barIndex) => (
                  <i style={{ height: `${Math.max(3, peak * 100)}%` }} key={barIndex} />
                ))}
              </div>
            );
          })}
          <span className="timeline-playhead timeline-playhead--audio" style={{ left: `${playheadLeft}%` }} />
        </div>
      </div>
    </section>
  );
}
