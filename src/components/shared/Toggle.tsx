interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  label?: string;
}

export function Toggle({ checked, onChange, size = 'sm', label }: ToggleProps) {
  const w = size === 'sm' ? 'w-7' : 'w-9';
  const h = size === 'sm' ? 'h-4' : 'h-5';
  const dot = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const translate = size === 'sm' ? 'translate-x-3' : 'translate-x-4';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`${w} ${h} rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
        checked ? 'bg-accent' : 'bg-bg-active'
      }`}
    >
      <span
        className={`${dot} rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${
          checked ? translate : 'translate-x-0'
        }`}
      />
    </button>
  );
}
