import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flag,
  MousePointer2,
  Pause,
  Play,
  Scissors,
  Trash2,
} from 'lucide-react';

interface ToolBarProps {
  isPlaying: boolean;
  activeTool: 'selection' | 'razor';
  hasSelection: boolean;
  canSplit: boolean;
  canApplyRange: boolean;
  onPlayPause: () => void;
  onShuttleBack: () => void;
  onStop: () => void;
  onShuttleForward: () => void;
  onFrameStep: (direction: -1 | 1) => void;
  onMarkIn: () => void;
  onMarkOut: () => void;
  onApplyRange: () => void;
  onSplit: () => void;
  onTrim: (edge: 'start' | 'end') => void;
  onRippleDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onMarker: () => void;
  onToolChange: (tool: 'selection' | 'razor') => void;
}

export function ToolBar({
  isPlaying,
  activeTool,
  hasSelection,
  canSplit,
  canApplyRange,
  onPlayPause,
  onShuttleBack,
  onStop,
  onShuttleForward,
  onFrameStep,
  onMarkIn,
  onMarkOut,
  onApplyRange,
  onSplit,
  onTrim,
  onRippleDelete,
  onMove,
  onMarker,
  onToolChange,
}: ToolBarProps) {
  return (
    <div className="editor-toolbar" aria-label="Editing controls">
      <div className="tool-group" aria-label="Tools">
        <button
          className={`tool-button ${activeTool === 'selection' ? 'tool-button--active' : ''}`}
          type="button"
          onClick={() => onToolChange('selection')}
          title="Selection tool"
        >
          <MousePointer2 size={16} />
          <kbd>V / A</kbd>
        </button>
        <button
          className={`tool-button ${activeTool === 'razor' ? 'tool-button--active' : ''}`}
          type="button"
          onClick={() => onToolChange('razor')}
          title="Razor / Blade edit mode"
        >
          <Scissors size={16} />
          <kbd>C / B</kbd>
        </button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group" data-tutorial-key="transport-controls" aria-label="Transport">
        <button className="tool-button" type="button" onClick={onShuttleBack} title="Shuttle backward (J)">
          <ChevronLeft size={17} />
          <kbd>J</kbd>
        </button>
        <button className="tool-button" type="button" onClick={onStop} title="Stop shuttle (K)">
          <Pause size={15} />
          <kbd>K</kbd>
        </button>
        <button
          className="tool-button tool-button--transport"
          type="button"
          onClick={onPlayPause}
          title="Play / Stop (Space)"
          data-tutorial-key="play-toggle"
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
          <kbd>Space</kbd>
        </button>
        <button className="tool-button" type="button" onClick={onShuttleForward} title="Shuttle forward (L)">
          <ChevronRight size={17} />
          <kbd>L</kbd>
        </button>
        <button className="tool-button" type="button" onClick={() => onFrameStep(-1)} title="Step back one frame">
          <ArrowLeft size={15} />
        </button>
        <button
          className="tool-button"
          type="button"
          onClick={() => onFrameStep(1)}
          title="Step forward one frame"
          data-tutorial-key="frame-step-forward"
        >
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group" aria-label="Marking">
        <button className="text-tool" type="button" onClick={onMarkIn} data-tutorial-key="mark-in">
          Mark In <kbd>I</kbd>
        </button>
        <button className="text-tool" type="button" onClick={onMarkOut} data-tutorial-key="mark-out">
          Mark Out <kbd>O</kbd>
        </button>
        <button
          className="text-tool"
          type="button"
          onClick={onApplyRange}
          disabled={!canApplyRange}
          data-tutorial-key="apply-range"
          title="Trim the clip under the playhead to the marked In/Out range"
        >
          Use In/Out
        </button>
        <button className="tool-button" type="button" onClick={onMarker} title="Add marker (M)">
          <Flag size={15} />
          <kbd>M</kbd>
        </button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group" aria-label="Edit operations">
        <button
          className="text-tool text-tool--strong"
          type="button"
          onClick={onSplit}
          disabled={!canSplit}
          data-tutorial-key="split-clip"
        >
          <Scissors size={14} /> Split
        </button>
        <span className="tool-subgroup" data-tutorial-key="trim-controls">
          <button className="text-tool" type="button" onClick={() => onTrim('start')} disabled={!hasSelection}>
            Trim start
          </button>
          <button className="text-tool" type="button" onClick={() => onTrim('end')} disabled={!hasSelection}>
            Trim end
          </button>
        </span>
        <button
          className="tool-button tool-button--danger"
          type="button"
          onClick={onRippleDelete}
          disabled={!hasSelection}
          title="Ripple delete selected clip"
          data-tutorial-key="ripple-delete"
        >
          <Trash2 size={15} />
        </button>
        <button className="tool-button" type="button" onClick={() => onMove(-1)} disabled={!hasSelection} title="Move clip left">
          <ChevronLeft size={15} />
        </button>
        <button className="tool-button" type="button" onClick={() => onMove(1)} disabled={!hasSelection} title="Move clip right">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
