import { useToast } from '../../hooks/useToast';

const typeConfig = {
  success: { icon: '✓', bar: 'bg-success' },
  error: { icon: '✕', bar: 'bg-danger' },
  info: { icon: 'i', bar: 'bg-accent' },
  warning: { icon: '⚠', bar: 'bg-warning' },
};

const typeText = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
  warning: 'text-warning',
};

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const cfg = typeConfig[toast.type];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-bg-secondary border border-border-default rounded-lg px-4 py-3 shadow-xl min-w-[260px] max-w-[360px] animate-fade-in-up relative overflow-hidden"
          >
            <span className={`text-xs font-bold flex-shrink-0 ${typeText[toast.type]}`}>
              {cfg.icon}
            </span>
            <p className="text-xs text-text-primary flex-1">{toast.message}</p>
            <button
              onClick={() => remove(toast.id)}
              className="text-text-muted hover:text-text-secondary text-xs ml-1 cursor-pointer"
            >
              ✕
            </button>
            {/* Progress bar */}
            <div
              className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} opacity-60`}
              style={{
                animation: `shrink ${toast.duration ?? 3000}ms linear forwards`,
                width: '100%',
              }}
            />
          </div>
        );
      })}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
