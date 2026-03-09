import type React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-text-muted mb-4 text-3xl">{icon}</div>
      <h3 className="text-text-secondary text-sm font-medium mb-1">{title}</h3>
      <p className="text-text-muted text-xs mb-4 max-w-xs">{description}</p>
      <div className="flex items-center gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white transition-colors cursor-pointer"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="text-xs px-3 py-1.5 rounded border border-border-default text-text-secondary hover:border-border-active hover:text-text-primary transition-colors cursor-pointer"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
