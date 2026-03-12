import { useState, useRef, useEffect, useCallback } from 'react';
import type React from 'react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  selectOnFocus?: boolean;
  onCancel?: () => void;
  multiline?: boolean;
  renderDisplay?: (value: string) => React.ReactNode;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit...',
  className = '',
  inputClassName = '',
  autoFocus = false,
  selectOnFocus = true,
  onCancel,
  multiline = false,
  renderDisplay,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const escapingRef = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (selectOnFocus) {
        inputRef.current.select();
      }
    }
  }, [isEditing, selectOnFocus]);

  const save = useCallback(() => {
    if (escapingRef.current) {
      escapingRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    escapingRef.current = true;
    setDraft(value);
    setIsEditing(false);
    onCancel?.();
  }, [value, onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      inputRef.current?.blur();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }, [save, cancel, multiline]);

  if (!isEditing) {
    return (
      <span
        onClick={() => setIsEditing(true)}
        className={`cursor-text rounded px-1 py-0.5 hover:bg-bg-hover transition-colors inline-block min-w-[2rem] ${
          value ? 'text-text-primary' : 'text-text-placeholder'
        } ${className}`}
      >
        {renderDisplay ? renderDisplay(value || placeholder) : (value || placeholder)}
      </span>
    );
  }

  const sharedClasses = `text-text-primary bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-focus outline-none w-full ${inputClassName}`;

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={`${sharedClasses} resize-y min-h-[4rem]`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={handleKeyDown}
      className={sharedClasses}
      placeholder={placeholder}
    />
  );
}
