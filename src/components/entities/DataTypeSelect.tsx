import { useState, useRef, useEffect } from 'react';
import { DATA_TYPES } from '../../types';
import type { DataType } from '../../types';

const TYPE_GROUPS: { label: string; types: DataType[]; color: string; dot: string }[] = [
  {
    label: 'Text',
    types: ['string', 'varchar', 'text', 'char'],
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  {
    label: 'Numeric',
    types: ['integer', 'bigint', 'smallint', 'float', 'decimal', 'numeric', 'number'],
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  {
    label: 'Boolean',
    types: ['boolean'],
    color: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  {
    label: 'Date / Time',
    types: ['date', 'datetime', 'timestamp', 'timestamptz', 'time'],
    color: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  {
    label: 'UUID',
    types: ['uuid'],
    color: 'text-cyan-400',
    dot: 'bg-cyan-400',
  },
  {
    label: 'JSON',
    types: ['json', 'jsonb'],
    color: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  {
    label: 'Enum',
    types: ['enum'],
    color: 'text-pink-400',
    dot: 'bg-pink-400',
  },
  {
    label: 'Binary / Array',
    types: ['blob', 'bytea', 'array'],
    color: 'text-slate-400',
    dot: 'bg-slate-400',
  },
];

function getTypeColor(type: DataType): string {
  for (const g of TYPE_GROUPS) {
    if ((g.types as string[]).includes(type)) return g.color;
  }
  return 'text-text-secondary';
}

function getTypeDot(type: DataType): string {
  for (const g of TYPE_GROUPS) {
    if ((g.types as string[]).includes(type)) return g.dot;
  }
  return 'bg-text-muted';
}

interface DataTypeSelectProps {
  value: DataType;
  onChange: (value: DataType) => void;
}

export function DataTypeSelect({ value, onChange }: DataTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFiltering = filter.trim().length > 0;
  const filteredFlat = isFiltering
    ? DATA_TYPES.filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    : null;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilter('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (type: DataType) => {
    onChange(type);
    setIsOpen(false);
    setFilter('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`text-xs px-2 py-1 rounded bg-bg-tertiary border border-border-default hover:border-border-active transition-colors cursor-pointer w-full text-left flex items-center gap-1.5 ${getTypeColor(value)}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTypeDot(value)}`} />
        {value}
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-40 bg-bg-secondary border border-border-default rounded-md shadow-lg overflow-hidden animate-fade-in">
          <div className="p-1.5 border-b border-border-default">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                  setFilter('');
                } else if (e.key === 'Enter') {
                  const first = isFiltering && filteredFlat && filteredFlat.length > 0
                    ? filteredFlat[0]
                    : null;
                  if (first) handleSelect(first);
                }
              }}
              placeholder="Filter..."
              className="w-full text-xs px-2 py-1 bg-bg-tertiary rounded border border-border-default text-text-primary outline-none placeholder:text-text-placeholder"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {isFiltering && filteredFlat ? (
              filteredFlat.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className={`w-full text-left text-xs px-3 py-1.5 cursor-pointer transition-colors flex items-center gap-2 ${
                    type === value
                      ? 'bg-accent-muted text-accent'
                      : `${getTypeColor(type)} hover:bg-bg-hover`
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTypeDot(type)}`} />
                  {type}
                </button>
              ))
            ) : (
              TYPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[9px] text-text-muted uppercase tracking-wider px-3 py-1 mt-1 first:mt-0">
                    {group.label}
                  </p>
                  {group.types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelect(type)}
                      className={`w-full text-left text-xs px-3 py-1 cursor-pointer transition-colors flex items-center gap-2 ${
                        type === value
                          ? 'bg-accent-muted text-accent'
                          : `${group.color} hover:bg-bg-hover`
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${group.dot}`} />
                      {type}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
