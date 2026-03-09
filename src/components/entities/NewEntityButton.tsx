import { useState, useRef, useEffect } from 'react';
import { useEntityStore } from '../../store/useEntityStore';

export function NewEntityButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addEntity = useEntityStore((s) => s.addEntity);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = () => {
    // Support comma-separated batch creation
    const names = name.split(',').map((n) => n.trim()).filter(Boolean);
    names.forEach((n) => addEntity(n));
    setName('');
    setIsCreating(false);
  };

  const handleCancel = () => {
    setName('');
    setIsCreating(false);
  };

  // Count how many entities would be created
  const batchCount = name.split(',').map((n) => n.trim()).filter(Boolean).length;

  if (isCreating) {
    return (
      <div className="border-2 border-dashed border-border-active rounded-lg p-4 animate-fade-in">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
            if (e.key === 'Escape') handleCancel();
          }}
          onBlur={handleCreate}
          placeholder="entity_name  or  users, posts, comments"
          className="w-full text-sm bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
        />
        <p className="text-[10px] text-text-muted mt-2 flex items-center justify-between">
          <span>Enter to confirm · Escape to cancel</span>
          {batchCount > 1 && (
            <span className="text-accent font-medium">Creates {batchCount} entities</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsCreating(true)}
      className="border-2 border-dashed border-border-default rounded-lg p-8 flex flex-col items-center justify-center gap-2 hover:border-border-active hover:bg-bg-hover/50 transition-colors cursor-pointer w-full min-h-[120px]"
    >
      <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span className="text-xs text-text-muted">New Entity</span>
    </button>
  );
}
