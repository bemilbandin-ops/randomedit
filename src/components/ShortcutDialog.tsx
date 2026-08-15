import { RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Modal } from './Modal.tsx';
import { referenceDisplayBinding, shortcutCommands } from '../data/shortcuts.ts';
import { findShortcutConflict, normalizeShortcut } from '../lib/shortcuts.ts';
import type { ShortcutBindings, ShortcutProfile } from '../types.ts';

interface ShortcutDialogProps {
  profile: ShortcutProfile;
  bindings: ShortcutBindings;
  onProfileChange: (profile: 'premiere' | 'resolve') => void;
  onBindingChange: (commandId: string, binding: string) => void;
  onResetCommand: (commandId: string) => void;
  onResetAll: () => void;
  onClose: () => void;
}

export function ShortcutDialog({
  profile,
  bindings,
  onProfileChange,
  onBindingChange,
  onResetCommand,
  onResetAll,
  onClose,
}: ShortcutDialogProps) {
  const [query, setQuery] = useState('');
  const [recordingCommand, setRecordingCommand] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState('');
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return shortcutCommands;
    return shortcutCommands.filter((command) => {
      const haystack = [
        command.name,
        command.category,
        command.description,
        referenceDisplayBinding(command.id, 'premiere', isMac),
        referenceDisplayBinding(command.id, 'resolve', isMac),
        bindings[command.id] ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [bindings, isMac, query]);

  const record = (commandId: string, event: KeyboardEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      setRecordingCommand(null);
      setConflictMessage('');
      return;
    }

    const shortcut = normalizeShortcut(event.nativeEvent);
    if (!shortcut) return;
    const conflict = findShortcutConflict(bindings, commandId, shortcut);
    if (conflict) {
      const owner = shortcutCommands.find((command) => command.id === conflict)?.name ?? conflict;
      setConflictMessage(`${shortcut} is already assigned to ${owner}. Change or reset that command first.`);
      return;
    }

    onBindingChange(commandId, shortcut);
    setRecordingCommand(null);
    setConflictMessage('');
  };

  return (
    <Modal
      title="Keyboard commands"
      subtitle="Search commands, start from a professional preset, then customize the keys you want."
      onClose={onClose}
      wide
    >
      <div className="shortcut-toolbar">
        <div className="segmented" aria-label="Shortcut preset">
          <button
            type="button"
            className={profile === 'premiere' ? 'segmented__active' : ''}
            onClick={() => onProfileChange('premiere')}
          >
            Premiere preset
          </button>
          <button
            type="button"
            className={profile === 'resolve' ? 'segmented__active' : ''}
            onClick={() => onProfileChange('resolve')}
          >
            Resolve preset
          </button>
          {profile === 'custom' ? <span className="segmented__status">Custom</span> : null}
        </div>

        <label className="shortcut-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search command or key…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <button className="secondary-button" type="button" onClick={onResetAll}>
          <RotateCcw size={15} /> Reset preset
        </button>
      </div>

      {conflictMessage ? <div className="inline-warning">{conflictMessage}</div> : null}

      <div className="shortcut-table" role="table" aria-label="Keyboard command database">
        <div className="shortcut-row shortcut-row--header" role="row">
          <span>Command</span>
          <span>Current</span>
          <span>Premiere</span>
          <span>Resolve</span>
          <span />
        </div>
        {filtered.map((command) => {
          const recording = recordingCommand === command.id;
          return (
            <div className="shortcut-row" role="row" key={command.id}>
              <div className="shortcut-command">
                <span>{command.category}</span>
                <strong>{command.name}</strong>
                <small>{command.description}</small>
              </div>
              <button
                className={`key-recorder ${recording ? 'key-recorder--recording' : ''}`}
                type="button"
                onClick={() => {
                  setRecordingCommand(command.id);
                  setConflictMessage('');
                }}
                onKeyDown={recording ? (event) => record(command.id, event) : undefined}
              >
                {recording ? 'Press keys…' : <kbd>{bindings[command.id] || 'Unassigned'}</kbd>}
              </button>
              <kbd className="reference-key">{referenceDisplayBinding(command.id, 'premiere', isMac)}</kbd>
              <kbd className="reference-key">{referenceDisplayBinding(command.id, 'resolve', isMac)}</kbd>
              <button className="row-action" type="button" onClick={() => onResetCommand(command.id)}>
                Reset
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? <p className="empty-state">No keyboard command matches “{query}”.</p> : null}
      <p className="dialog-note">Click a current shortcut, then press the new key combination. Conflicting bindings are blocked so one key cannot trigger two edit actions.</p>
    </Modal>
  );
}
