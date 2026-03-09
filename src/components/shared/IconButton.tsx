interface IconButtonProps {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'default' | 'danger';
}

export function IconButton({ onClick, children, title, className = '', variant = 'default' }: IconButtonProps) {
  const variantClasses = variant === 'danger'
    ? 'hover:bg-danger-muted hover:text-danger'
    : 'hover:bg-bg-hover hover:text-text-primary';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded text-text-muted transition-colors cursor-pointer ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}
