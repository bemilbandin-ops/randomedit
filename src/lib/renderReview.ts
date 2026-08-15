import type { Clip, EditorSettings, ExportFormat, SourceMeta } from '../types.ts';

export interface ReviewMimeSelection {
  mime: string;
  extension: 'webm' | 'mp4';
  usedFallback: boolean;
}

export interface ReviewExportCapability {
  available: boolean;
  selection: ReviewMimeSelection | null;
  reason?: string;
}

export interface ReviewExportEnvironment {
  hasMediaRecorder: boolean;
  hasCanvasCapture: boolean;
  isTypeSupported: (mime: string) => boolean;
}

export interface RenderReviewResult extends ReviewMimeSelection {
  blob: Blob;
  hasAudio: boolean;
}

const WEBM_MIMES = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const MP4_MIMES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'];
const RENDER_STALL_TIMEOUT_MS = 5000;

export function selectReviewMime(
  requested: ExportFormat,
  isSupported: (mime: string) => boolean,
): ReviewMimeSelection | null {
  const requestedMimes = requested === 'mp4' ? MP4_MIMES : WEBM_MIMES;
  const fallbackMimes = requested === 'mp4' ? WEBM_MIMES : MP4_MIMES;

  const direct = requestedMimes.find(isSupported);
  if (direct) {
    return {
      mime: direct,
      extension: requested,
      usedFallback: false,
    };
  }

  const fallback = fallbackMimes.find(isSupported);
  if (!fallback) return null;

  return {
    mime: fallback,
    extension: fallback.startsWith('video/mp4') ? 'mp4' : 'webm',
    usedFallback: true,
  };
}

export function reviewExportCapability(
  requested: ExportFormat,
  environment: ReviewExportEnvironment,
): ReviewExportCapability {
  if (!environment.hasMediaRecorder) {
    return {
      available: false,
      selection: null,
      reason: 'This browser does not support MediaRecorder review export.',
    };
  }
  if (!environment.hasCanvasCapture) {
    return {
      available: false,
      selection: null,
      reason: 'Canvas capture is unavailable in this browser.',
    };
  }

  const selection = selectReviewMime(requested, environment.isTypeSupported);
  if (!selection) {
    return {
      available: false,
      selection: null,
      reason: 'This browser does not expose a supported MP4 or WebM recording format.',
    };
  }

  return { available: true, selection };
}

export function renderHasStalled(lastAdvanceAt: number, now: number, timeoutMs = RENDER_STALL_TIMEOUT_MS): boolean {
  return now - lastAdvanceAt > timeoutMs;
}

export function getRenderSize(
  resolution: EditorSettings['exportResolution'],
  source: SourceMeta,
): { width: number; height: number } {
  if (resolution === 'source') return { width: source.width, height: source.height };

  const targetHeights: Record<Exclude<EditorSettings['exportResolution'], 'source'>, number> = {
    '720p': 720,
    '1080p': 1080,
    '1440p': 1440,
    '2160p': 2160,
  };
  const height = targetHeights[resolution];
  const aspect = source.width / Math.max(1, source.height);
  const width = Math.max(2, Math.round((height * aspect) / 2) * 2);
  return { width, height };
}

function waitForEvent(target: EventTarget, eventName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Media failed while waiting for ${eventName}.`));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.01) return;
  const pending = waitForEvent(video, 'seeked');
  video.currentTime = time;
  await pending;
}

export async function renderReviewVideo(options: {
  video: HTMLVideoElement;
  clips: Clip[];
  settings: EditorSettings;
  source: SourceMeta;
  onProgress?: (progress: number) => void;
}): Promise<RenderReviewResult> {
  const { video, clips, settings, source, onProgress } = options;
  if (clips.length === 0) {
    throw new Error('There is no edited sequence to render.');
  }

  const capability = reviewExportCapability(settings.exportFormat, {
    hasMediaRecorder: typeof MediaRecorder !== 'undefined',
    hasCanvasCapture: typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.captureStream === 'function',
    isTypeSupported: (mime) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime),
  });
  if (!capability.available || !capability.selection) {
    throw new Error(capability.reason ?? 'Review export is unavailable in this browser.');
  }
  const selection = capability.selection;

  const { width, height } = getRenderSize(settings.exportResolution, source);
  const fps = settings.exportFps === 'source' ? settings.sequenceFps : settings.exportFps;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context || typeof canvas.captureStream !== 'function') {
    throw new Error('Canvas capture is unavailable in this browser.');
  }

  const outputStream = canvas.captureStream(fps);
  const captureSource = video as HTMLVideoElement & { captureStream?: () => MediaStream };
  const mediaStream = captureSource.captureStream?.();
  const audioTracks = mediaStream?.getAudioTracks() ?? [];
  audioTracks.forEach((track) => outputStream.addTrack(track));

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(outputStream, { mimeType: selection.mime });
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener('stop', () => resolve(), { once: true });
    recorder.addEventListener('error', () => reject(new Error('The browser recorder failed.')), { once: true });
  });

  const original = {
    currentTime: video.currentTime,
    playbackRate: video.playbackRate,
    muted: video.muted,
  };
  const totalDuration = clips.reduce((sum, clip) => sum + Math.max(0, clip.sourceEnd - clip.sourceStart), 0);
  let renderedDuration = 0;
  let recorderStopped = false;

  try {
    video.pause();
    video.playbackRate = 1;
    recorder.start(250);

    for (const clip of clips) {
      await seekVideo(video, clip.sourceStart);
      await video.play();

      await new Promise<void>((resolve, reject) => {
        let lastMediaTime = video.currentTime;
        let lastAdvanceAt = performance.now();

        const draw = () => {
          const now = performance.now();
          if (video.currentTime > lastMediaTime + 0.001) {
            lastMediaTime = video.currentTime;
            lastAdvanceAt = now;
          }

          if (renderHasStalled(lastAdvanceAt, now)) {
            video.pause();
            reject(new Error('Review rendering stalled while playing the source media.'));
            return;
          }

          context.drawImage(video, 0, 0, width, height);
          const inClip = Math.max(0, Math.min(video.currentTime, clip.sourceEnd) - clip.sourceStart);
          onProgress?.(Math.min(1, (renderedDuration + inClip) / Math.max(totalDuration, 0.001)));

          if (video.currentTime >= clip.sourceEnd || video.ended) {
            video.pause();
            resolve();
            return;
          }
          requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
      });

      renderedDuration += Math.max(0, clip.sourceEnd - clip.sourceStart);
    }

    onProgress?.(1);
    recorder.stop();
    recorderStopped = true;
    await stopped;
  } finally {
    video.pause();
    if (!recorderStopped && recorder.state !== 'inactive') {
      recorder.stop();
      recorderStopped = true;
      try {
        await stopped;
      } catch {
        // Preserve the original render failure if recorder shutdown also fails.
      }
    }
    video.playbackRate = original.playbackRate;
    video.muted = original.muted;
    try {
      await seekVideo(video, original.currentTime);
    } catch {
      video.currentTime = original.currentTime;
    }
    outputStream.getTracks().forEach((track) => track.stop());
  }

  return {
    ...selection,
    blob: new Blob(chunks, { type: selection.mime }),
    hasAudio: audioTracks.length > 0,
  };
}
