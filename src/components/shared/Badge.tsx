import type { Priority } from '../../types';
import { PRIORITY_CONFIG } from '../../lib/constants';

interface BadgeProps {
  priority: Priority;
}

export function Badge({ priority }: BadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${config.classes}`}>
      {config.label}
    </span>
  );
}
