import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoachPanel } from './components/CoachPanel.tsx';
import { ExportDialog } from './components/ExportDialog.tsx';
import { LessonRail } from './components/LessonRail.tsx';
import { ProgressDialog } from './components/ProgressDialog.tsx';
import { SettingsDialog } from './components/SettingsDialog.tsx';
import { ShortcutDialog } from './components/ShortcutDialog.tsx';
import { Timeline } from './components/Timeline.tsx';
import { ToolBar } from './components/ToolBar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { VideoMonitor } from './components/VideoMonitor.tsx';
import { lessons } from './data/lessons.ts';
import { getPresetBindings } from './data/shortcuts.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { downloadBlob, downloadText } from './lib/download.ts';
import { parseProject, serializeProject, toEdl } from './lib/export.ts';
import { renderReviewVideo } from './lib/renderReview.ts';
import { normalizeShortcut } from './lib/shortcuts.ts';
import {
  moveClip,
  rippleDeleteClip,
  sequenceDuration,
  sequenceToSourceTime,
  sourceToSequenceTime,
  splitClip,
  trimClip,
} from './lib/timeline.ts';
import { applyTutorialEvent } from './lib/tutorial.ts';
import type {
  Clip,
  EditorSettings,
  Marker,
  ProjectState,
  ShortcutProfile,
  SourceMeta,
  TutorialProgress,
} from './types.ts';

const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const DEFAULT_SETTINGS: EditorSettings = {
  playbackSpeed: 1,
  sequenceFps: 25,
  exportResolution: '1080p',
  exportFps: 25,
  exportFormat: 'webm',
};

const INITIAL_PROGRESS: TutorialProgress = {
  lessonIndex: 0,
  stepIndex: 0,
  completedLessonIds: [],
};

type DialogName = 'settings' | 'shortcuts' | 'progress' | 'export' | null;

function cleanFilename(name: string): string {
  const clean = name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '');
  return clean || 'random-edit-project';
}

function formatTimecode(time: number, fpsValue: number): string {
  const fps = Math.max(1, Math.round(fpsValue));
  const framesTotal = Math.max(0, Math.round(time * fps));
  const frames = framesTotal % fps;
  const secondsTotal = Math.floor(framesTotal / fps);
  const seconds = secondsTotal % 60;
  const minutesTotal = Math.floor(secondsTotal / 60);
  const minutes = minutesTotal % 60;
  const hours = Math.floor(minutesTotal / 60);
  return [hours, minutes, seconds, frames].map((value) => String(value).padStart(2, '0')).join(':');
}

function sourceMetaFromVideo(video: HTMLVideoElement, name: string): SourceMeta {
  return {
    name,
    duration: Number.isFinite(video.duration) ? video.duration : 0,
    width: video.videoWidth || 1920,
    height: video.videoHeight || 1080,
  };
}

export default function App() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const [settings, setSettings] = useLocalStorage<EditorSettings>('randomedit.settings.v1', DEFAULT_SETTINGS);
  const [progress, setProgress] = useLocalStorage<TutorialProgress>('randomedit.progress.v1', INITIAL_PROGRESS);
  const [shortcutProfile, setShortcutProfile] = useLocalStorage<ShortcutProfile>('randomedit.shortcut-profile.v1', 'premiere');
  const [shortcutBaseProfile, setShortcutBaseProfile] = useLocalStorage<'premiere' | 'resolve'>('randomedit.shortcut-base.v1', 'premiere');
  const [shortcutBindings, setShortcutBindings] = useLocalStorage(
    'randomedit.shortcuts.v1',
    getPresetBindings('premiere', isMac),
  );

  const [projectName, setProjectName] = useState('My First Cut');
  const [sourceUrl, setSourceUrl] = useState(DEMO_VIDEO);
  const [sourceName, setSourceName] = useState('MDN flower example');
  const [source, setSource] = useState<SourceMeta | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [sequenceTime, setSequenceTime] = useState(0);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeTool, setActiveTool] = useState<'selection' | 'razor'>('selection');
  const [isPlaying, setIsPlaying] = useState(false);
  const [openDialog, setOpenDialog] = useState<DialogName>(null);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [renderMessage, setRenderMessage] = useState('');
  const [expectedRelinkName, setExpectedRelinkName] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeClipIndexRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const pendingImportEventRef = useRef(false);
  const relinkingProjectRef = useRef(false);
  const backwardTimerRef = useRef<number | null>(null);
  const clipHistoryRef = useRef<Clip[][]>([]);

  const duration = sequenceDuration(clips);
  const currentLesson = lessons[progress.lessonIndex];
  const currentStep = currentLesson && progress.stepIndex < currentLesson.steps.length
    ? currentLesson.steps[progress.stepIndex]
    : undefined;
  const courseComplete = progress.completedLessonIds.length === lessons.length;

  const progressPercent = useMemo(() => {
    const totalSteps = lessons.reduce((total, lesson) => total + lesson.steps.length, 0);
    const done = lessons.reduce((total, lesson, index) => {
      if (progress.completedLessonIds.includes(lesson.id)) return total + lesson.steps.length;
      if (index === progress.lessonIndex) return total + Math.min(progress.stepIndex, lesson.steps.length);
      return total;
    }, 0);
    return Math.round((done / Math.max(1, totalSteps)) * 100);
  }, [progress]);

  const emitTutorialEvent = useCallback((type: string, payload?: Record<string, unknown>) => {
    setProgress((current) => applyTutorialEvent(current, { type, payload }, lessons));
  }, [setProgress]);

  const clearBackwardTimer = useCallback(() => {
    if (backwardTimerRef.current !== null) {
      window.clearInterval(backwardTimerRef.current);
      backwardTimerRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    clearBackwardTimer();
    videoRef.current?.pause();
    setIsPlaying(false);
  }, [clearBackwardTimer]);

  useEffect(() => () => {
    clearBackwardTimer();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, [clearBackwardTimer]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = settings.playbackSpeed;
  }, [settings.playbackSpeed]);

  const syncVideoToSequence = useCallback((time: number) => {
    const video = videoRef.current;
    const mapped = sequenceToSourceTime(clips, time);
    if (!video || mapped.clipIndex < 0) return;
    activeClipIndexRef.current = mapped.clipIndex;
    if (Math.abs(video.currentTime - mapped.sourceTime) > 0.008) {
      video.currentTime = mapped.sourceTime;
    }
  }, [clips]);

  const seekSequence = useCallback((time: number, tutorialSeek = false) => {
    const next = Math.max(0, Math.min(duration, time));
    setSequenceTime(next);
    syncVideoToSequence(next);
    if (tutorialSeek) emitTutorialEvent('timeline.seeked');
  }, [duration, emitTutorialEvent, syncVideoToSequence]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const nextSource = sourceMetaFromVideo(video, sourceName);
    setSource(nextSource);
    setMediaError(null);
    video.playbackRate = settings.playbackSpeed;

    if (relinkingProjectRef.current) {
      relinkingProjectRef.current = false;
      setExpectedRelinkName(null);
      setSelectedClipId((current) => current ?? clips[0]?.id ?? null);
      seekSequence(0, false);
      return;
    }

    const firstClip: Clip = {
      id: `source-${Date.now()}`,
      name: sourceName,
      sourceStart: 0,
      sourceEnd: video.duration,
    };
    clipHistoryRef.current = [];
    setClips([firstClip]);
    setSelectedClipId(firstClip.id);
    setSequenceTime(0);
    setMarkIn(null);
    setMarkOut(null);
    setMarkers([]);
    activeClipIndexRef.current = 0;

    if (pendingImportEventRef.current) {
      pendingImportEventRef.current = false;
      emitTutorialEvent('media.imported', { filename: sourceName });
    }
  }, [clips, emitTutorialEvent, seekSequence, settings.playbackSpeed, sourceName]);

  const handleMediaError = useCallback(() => {
    stopPlayback();
    setMediaError(isDemo
      ? 'The example video is unavailable. Upload a local video to keep learning.'
      : 'This file could not be decoded by the browser. Try another video format.');
    pendingImportEventRef.current = false;
  }, [isDemo, stopPlayback]);

  const handleUpload = useCallback((file: File) => {
    stopPlayback();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;

    const isRelink = Boolean(expectedRelinkName) || relinkingProjectRef.current;
    if (!isRelink) {
      pendingImportEventRef.current = true;
      setClips([]);
      setSelectedClipId(null);
      setMarkIn(null);
      setMarkOut(null);
      setMarkers([]);
      setSequenceTime(0);
    }

    setIsDemo(false);
    setSourceName(file.name);
    setMediaError(null);
    setSourceUrl(nextUrl);
  }, [expectedRelinkName, stopPlayback]);

  const startForwardPlayback = useCallback(async (eventType: 'transport.played' | 'transport.shuttleForward') => {
    const video = videoRef.current;
    if (!video || clips.length === 0 || duration <= 0) return;
    clearBackwardTimer();

    const safeTime = sequenceTime >= duration - 0.001 ? 0 : sequenceTime;
    if (safeTime !== sequenceTime) setSequenceTime(0);
    const mapped = sequenceToSourceTime(clips, safeTime);
    if (mapped.clipIndex < 0) return;
    activeClipIndexRef.current = mapped.clipIndex;
    video.currentTime = mapped.sourceTime;
    video.playbackRate = settings.playbackSpeed;

    try {
      await video.play();
      setIsPlaying(true);
      emitTutorialEvent(eventType);
    } catch {
      setMediaError('Playback was blocked or the media is not ready yet. Click the viewer and try again.');
    }
  }, [clearBackwardTimer, clips, duration, emitTutorialEvent, sequenceTime, settings.playbackSpeed]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    void startForwardPlayback('transport.played');
  }, [isPlaying, startForwardPlayback, stopPlayback]);

  const handleShuttleForward = useCallback(() => {
    void startForwardPlayback('transport.shuttleForward');
  }, [startForwardPlayback]);

  const handleShuttleBack = useCallback(() => {
    stopPlayback();
    setIsPlaying(true);
    backwardTimerRef.current = window.setInterval(() => {
      setSequenceTime((current) => {
        const next = Math.max(0, current - 0.08 * settings.playbackSpeed);
        const mapped = sequenceToSourceTime(clips, next);
        if (videoRef.current && mapped.clipIndex >= 0) {
          activeClipIndexRef.current = mapped.clipIndex;
          videoRef.current.currentTime = mapped.sourceTime;
        }
        if (next <= 0) {
          clearBackwardTimer();
          setIsPlaying(false);
        }
        return next;
      });
    }, 80);
  }, [clearBackwardTimer, clips, settings.playbackSpeed, stopPlayback]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || clips.length === 0 || backwardTimerRef.current !== null) return;
    const clipIndex = Math.max(0, Math.min(activeClipIndexRef.current, clips.length - 1));
    const clip = clips[clipIndex];

    if (video.currentTime >= clip.sourceEnd - 0.008) {
      const nextIndex = clipIndex + 1;
      if (nextIndex < clips.length && isPlaying) {
        activeClipIndexRef.current = nextIndex;
        video.currentTime = clips[nextIndex].sourceStart;
        setSequenceTime(sourceToSequenceTime(clips, nextIndex, clips[nextIndex].sourceStart));
        void video.play().catch(() => stopPlayback());
      } else {
        stopPlayback();
        setSequenceTime(sequenceDuration(clips));
      }
      return;
    }

    setSequenceTime(sourceToSequenceTime(clips, clipIndex, video.currentTime));
  }, [clips, isPlaying, stopPlayback]);

  const handleFrameStep = useCallback((direction: -1 | 1) => {
    stopPlayback();
    const frame = 1 / Math.max(1, settings.sequenceFps);
    seekSequence(sequenceTime + direction * frame, false);
    emitTutorialEvent('transport.frameStep', { direction });
  }, [emitTutorialEvent, seekSequence, sequenceTime, settings.sequenceFps, stopPlayback]);

  const currentSourceTime = useCallback(() => {
    const mapped = sequenceToSourceTime(clips, sequenceTime);
    return mapped.clipIndex >= 0 ? mapped.sourceTime : 0;
  }, [clips, sequenceTime]);

  const handleMarkIn = useCallback(() => {
    setMarkIn(currentSourceTime());
    emitTutorialEvent('mark.in');
  }, [currentSourceTime, emitTutorialEvent]);

  const handleMarkOut = useCallback(() => {
    setMarkOut(currentSourceTime());
    emitTutorialEvent('mark.out');
  }, [currentSourceTime, emitTutorialEvent]);

  const commitClips = useCallback((next: Clip[]) => {
    if (next === clips) return false;
    clipHistoryRef.current.push(clips);
    if (clipHistoryRef.current.length > 30) clipHistoryRef.current.shift();
    setClips(next);
    return true;
  }, [clips]);

  const splitAtSequenceTime = useCallback((time: number) => {
    const mapped = sequenceToSourceTime(clips, time);
    if (mapped.clipIndex < 0) return;
    const target = clips[mapped.clipIndex];
    const next = splitClip(clips, target.id, mapped.sourceTime);
    if (commitClips(next)) {
      setSelectedClipId(null);
      setActiveTool('selection');
      emitTutorialEvent('clip.split');
    }
  }, [clips, commitClips, emitTutorialEvent]);

  const handleTrim = useCallback((edge: 'start' | 'end') => {
    if (!selectedClipId) return;
    const mapped = sequenceToSourceTime(clips, sequenceTime);
    const selectedIndex = clips.findIndex((clip) => clip.id === selectedClipId);
    if (selectedIndex < 0 || mapped.clipIndex !== selectedIndex) return;
    const next = trimClip(clips, selectedClipId, edge, mapped.sourceTime);
    if (commitClips(next)) {
      setSequenceTime(Math.min(sequenceTime, sequenceDuration(next)));
      emitTutorialEvent('clip.trimmed', { edge });
    }
  }, [clips, commitClips, emitTutorialEvent, selectedClipId, sequenceTime]);

  const handleRippleDelete = useCallback(() => {
    if (!selectedClipId || clips.length <= 1) return;
    const next = rippleDeleteClip(clips, selectedClipId);
    if (commitClips(next)) {
      setSelectedClipId(next[0]?.id ?? null);
      const nextDuration = sequenceDuration(next);
      const nextTime = Math.min(sequenceTime, nextDuration);
      setSequenceTime(nextTime);
      const mapped = sequenceToSourceTime(next, nextTime);
      if (videoRef.current && mapped.clipIndex >= 0) videoRef.current.currentTime = mapped.sourceTime;
      emitTutorialEvent('clip.rippleDeleted');
    }
  }, [clips, commitClips, emitTutorialEvent, selectedClipId, sequenceTime]);

  const handleMove = useCallback((direction: -1 | 1) => {
    if (!selectedClipId) return;
    commitClips(moveClip(clips, selectedClipId, direction));
  }, [clips, commitClips, selectedClipId]);

  const handleMarker = useCallback(() => {
    setMarkers((current) => [
      ...current,
      { id: `marker-${Date.now()}`, time: sequenceTime, label: `Marker ${current.length + 1}` },
    ]);
  }, [sequenceTime]);

  const handleUndo = useCallback(() => {
    const previous = clipHistoryRef.current.pop();
    if (!previous) return;
    stopPlayback();
    setClips(previous);
    setSelectedClipId(previous[0]?.id ?? null);
    const nextTime = Math.min(sequenceTime, sequenceDuration(previous));
    setSequenceTime(nextTime);
  }, [sequenceTime, stopPlayback]);

  const handleClipClick = useCallback((clipId: string, time: number) => {
    if (activeTool === 'razor') {
      seekSequence(time, false);
      splitAtSequenceTime(time);
      return;
    }
    setSelectedClipId(clipId);
    emitTutorialEvent('clip.selected', { clipId });
  }, [activeTool, emitTutorialEvent, seekSequence, splitAtSequenceTime]);

  const handleSettingsChange = useCallback((patch: Partial<EditorSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    emitTutorialEvent('settings.changed');
  }, [emitTutorialEvent, setSettings]);

  const handleShortcutProfileChange = useCallback((profile: 'premiere' | 'resolve') => {
    setShortcutProfile(profile);
    setShortcutBaseProfile(profile);
    setShortcutBindings(getPresetBindings(profile, isMac));
  }, [isMac, setShortcutBaseProfile, setShortcutBindings, setShortcutProfile]);

  const handleBindingChange = useCallback((commandId: string, binding: string) => {
    setShortcutBindings((current) => ({ ...current, [commandId]: binding }));
    setShortcutProfile('custom');
  }, [setShortcutBindings, setShortcutProfile]);

  const handleResetCommand = useCallback((commandId: string) => {
    const preset = getPresetBindings(shortcutBaseProfile, isMac);
    setShortcutBindings((current) => ({ ...current, [commandId]: preset[commandId] }));
  }, [isMac, setShortcutBindings, shortcutBaseProfile]);

  const handleResetShortcuts = useCallback(() => {
    setShortcutBindings(getPresetBindings(shortcutBaseProfile, isMac));
    setShortcutProfile(shortcutBaseProfile);
  }, [isMac, setShortcutBindings, setShortcutProfile, shortcutBaseProfile]);

  const dispatchCommand = useCallback((commandId: string) => {
    switch (commandId) {
      case 'playPause': handlePlayPause(); break;
      case 'shuttleBack': handleShuttleBack(); break;
      case 'shuttleStop': stopPlayback(); break;
      case 'shuttleForward': handleShuttleForward(); break;
      case 'frameBack': handleFrameStep(-1); break;
      case 'frameForward': handleFrameStep(1); break;
      case 'markIn': handleMarkIn(); break;
      case 'markOut': handleMarkOut(); break;
      case 'addEdit': splitAtSequenceTime(sequenceTime); break;
      case 'selectionTool': setActiveTool('selection'); break;
      case 'razorTool': setActiveTool('razor'); break;
      case 'rippleDelete': handleRippleDelete(); break;
      case 'addMarker': handleMarker(); break;
      case 'undo': handleUndo(); break;
      default: break;
    }
  }, [
    handleFrameStep,
    handleMarker,
    handleMarkIn,
    handleMarkOut,
    handlePlayPause,
    handleRippleDelete,
    handleShuttleBack,
    handleShuttleForward,
    handleUndo,
    sequenceTime,
    splitAtSequenceTime,
    stopPlayback,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialog) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;

      const shortcut = normalizeShortcut(event);
      const command = Object.entries(shortcutBindings).find(([, binding]) => binding === shortcut)?.[0];
      if (!command) return;
      event.preventDefault();
      dispatchCommand(command);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatchCommand, openDialog, shortcutBindings]);

  const handleShowMe = useCallback((target?: string) => {
    if (!target) return;
    const element = document.querySelector<HTMLElement>(`[data-tutorial-key="${target}"]`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    element.classList.remove('tutorial-pulse');
    void element.offsetWidth;
    element.classList.add('tutorial-pulse');
    if (element.matches('button')) element.focus({ preventScroll: true });
    window.setTimeout(() => element.classList.remove('tutorial-pulse'), 1800);
  }, []);

  const projectSnapshot = useCallback((): ProjectState => ({
    version: 1,
    name: projectName,
    source,
    clips,
    markers,
    settings,
    shortcutProfile,
    shortcutBindings,
    tutorial: progress,
  }), [clips, markers, progress, projectName, settings, shortcutBindings, shortcutProfile, source]);

  const handleDownloadProject = useCallback(() => {
    const project = projectSnapshot();
    downloadText(
      serializeProject(project),
      `${cleanFilename(projectName)}.randomedit.json`,
      'application/json;charset=utf-8',
    );
    emitTutorialEvent('project.exported');
  }, [emitTutorialEvent, projectName, projectSnapshot]);

  const handleDownloadEdl = useCallback(() => {
    downloadText(toEdl(projectSnapshot()), `${cleanFilename(projectName)}.edl`);
  }, [projectName, projectSnapshot]);

  const handleImportProject = useCallback(async (file: File) => {
    try {
      const imported = parseProject(await file.text());
      stopPlayback();
      clipHistoryRef.current = [];
      setProjectName(imported.name);
      setSource(imported.source);
      setClips(imported.clips);
      setMarkers(imported.markers ?? []);
      setSettings(imported.settings);
      setShortcutProfile(imported.shortcutProfile);
      setShortcutBindings(imported.shortcutBindings);
      setProgress(imported.tutorial);
      setSelectedClipId(imported.clips[0]?.id ?? null);
      setSequenceTime(0);
      setMarkIn(null);
      setMarkOut(null);
      setIsDemo(false);
      setSourceUrl('');
      const relinkName = imported.source?.name ?? 'the original source video';
      setExpectedRelinkName(relinkName);
      relinkingProjectRef.current = true;
      setMediaError(`Project loaded. Relink ${relinkName} with the Upload video button to preview the edit.`);
      setRenderMessage('Project imported. Source media must be relinked before review rendering.');
    } catch (error) {
      setRenderMessage(error instanceof Error ? error.message : 'Could not import that project file.');
    }
  }, [setProgress, setSettings, setShortcutBindings, setShortcutProfile, stopPlayback]);

  const handleRenderReview = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !source || isDemo || clips.length === 0) return;
    stopPlayback();
    setRenderProgress(0);
    setRenderMessage('Rendering the edited sequence in real time…');
    try {
      const result = await renderReviewVideo({
        video,
        clips,
        settings,
        source,
        onProgress: setRenderProgress,
      });
      downloadBlob(result.blob, `${cleanFilename(projectName)}-review.${result.extension}`);
      setRenderProgress(1);
      setRenderMessage(result.usedFallback
        ? `Your browser could not record the preferred ${settings.exportFormat.toUpperCase()} format, so the review was exported as ${result.extension.toUpperCase()}.`
        : `Review exported as ${result.extension.toUpperCase()}.`);
    } catch (error) {
      setRenderProgress(null);
      setRenderMessage(error instanceof Error ? error.message : 'Review rendering failed.');
    }
  }, [clips, isDemo, projectName, settings, source, stopPlayback]);

  const resetProgress = useCallback(() => setProgress(INITIAL_PROGRESS), [setProgress]);

  const shortcutProfileLabel = shortcutProfile === 'premiere'
    ? 'Premiere keys'
    : shortcutProfile === 'resolve'
      ? 'Resolve keys'
      : 'Custom keys';

  return (
    <div className="app-shell">
      <TopBar
        projectName={projectName}
        sourceName={expectedRelinkName ? `Relink: ${expectedRelinkName}` : sourceName}
        progressPercent={progressPercent}
        shortcutProfileLabel={shortcutProfileLabel}
        onProjectNameChange={setProjectName}
        onUpload={handleUpload}
        onOpenProgress={() => setOpenDialog('progress')}
        onOpenShortcuts={() => setOpenDialog('shortcuts')}
        onOpenSettings={() => setOpenDialog('settings')}
        onOpenExport={() => {
          setRenderMessage('');
          setRenderProgress(null);
          setOpenDialog('export');
        }}
      />

      <div className="workspace">
        <LessonRail lessons={lessons} progress={progress} />

        <main className="editor-workspace">
          <VideoMonitor
            videoRef={videoRef}
            sourceUrl={sourceUrl}
            sourceName={sourceName}
            isDemo={isDemo}
            timecode={formatTimecode(sequenceTime, settings.sequenceFps)}
            sequenceTime={sequenceTime}
            sequenceDuration={duration}
            markIn={markIn}
            markOut={markOut}
            mediaError={mediaError}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={stopPlayback}
            onError={handleMediaError}
          />

          <ToolBar
            isPlaying={isPlaying}
            activeTool={activeTool}
            hasSelection={Boolean(selectedClipId)}
            onPlayPause={handlePlayPause}
            onShuttleBack={handleShuttleBack}
            onStop={stopPlayback}
            onShuttleForward={handleShuttleForward}
            onFrameStep={handleFrameStep}
            onMarkIn={handleMarkIn}
            onMarkOut={handleMarkOut}
            onSplit={() => splitAtSequenceTime(sequenceTime)}
            onTrim={handleTrim}
            onRippleDelete={handleRippleDelete}
            onMove={handleMove}
            onMarker={handleMarker}
            onToolChange={setActiveTool}
          />

          <Timeline
            clips={clips}
            markers={markers}
            sequenceTime={sequenceTime}
            selectedClipId={selectedClipId}
            activeTool={activeTool}
            onSeek={(time) => seekSequence(time, true)}
            onClipClick={handleClipClick}
          />
        </main>

        <CoachPanel
          lesson={currentLesson}
          step={currentStep}
          lessonNumber={Math.min(progress.lessonIndex + 1, lessons.length)}
          totalLessons={lessons.length}
          courseComplete={courseComplete}
          onShowMe={handleShowMe}
        />
      </div>

      <footer className="statusbar">
        <span>{activeTool === 'selection' ? 'Selection' : 'Razor / Blade'} tool</span>
        <span>{clips.length} sequence clip{clips.length === 1 ? '' : 's'}</span>
        <span>{settings.sequenceFps} fps sequence</span>
        <span>{settings.playbackSpeed}× playback</span>
        <span className="statusbar__hint">Space · J K L · I O · {isMac ? 'Cmd' : 'Ctrl'}+K</span>
      </footer>

      {openDialog === 'settings' ? (
        <SettingsDialog settings={settings} onChange={handleSettingsChange} onClose={() => setOpenDialog(null)} />
      ) : null}
      {openDialog === 'shortcuts' ? (
        <ShortcutDialog
          profile={shortcutProfile}
          bindings={shortcutBindings}
          onProfileChange={handleShortcutProfileChange}
          onBindingChange={handleBindingChange}
          onResetCommand={handleResetCommand}
          onResetAll={handleResetShortcuts}
          onClose={() => setOpenDialog(null)}
        />
      ) : null}
      {openDialog === 'progress' ? (
        <ProgressDialog
          lessons={lessons}
          progress={progress}
          percent={progressPercent}
          onReset={resetProgress}
          onClose={() => setOpenDialog(null)}
        />
      ) : null}
      {openDialog === 'export' ? (
        <ExportDialog
          settings={settings}
          source={source}
          isDemo={isDemo}
          renderProgress={renderProgress}
          renderMessage={renderMessage}
          onDownloadProject={handleDownloadProject}
          onDownloadEdl={handleDownloadEdl}
          onImportProject={handleImportProject}
          onRenderReview={handleRenderReview}
          onClose={() => setOpenDialog(null)}
        />
      ) : null}
    </div>
  );
}
