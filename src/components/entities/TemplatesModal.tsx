import { useEntityStore } from '../../store/useEntityStore';
import { useUIStore } from '../../store/useUIStore';
import { useToast } from '../../hooks/useToast';
import { ENTITY_TEMPLATES } from '../../lib/templates';

interface TemplatesModalProps {
  onClose: () => void;
}

export function TemplatesModal({ onClose }: TemplatesModalProps) {
  const addEntityFromTemplate = useEntityStore((s) => s.addEntityFromTemplate);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const toast = useToast();

  const handleAdd = (templateId: string) => {
    const t = ENTITY_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    addEntityFromTemplate(t.build());
    setActiveTab('entities');
    toast.success(`${t.label} entity added`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Entity Templates</h2>
            <p className="text-xs text-text-muted mt-0.5">Add a pre-built entity to your schema</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-6 max-h-[60vh] overflow-y-auto">
          {ENTITY_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleAdd(t.id)}
              className="flex items-start gap-3 p-4 rounded-lg border border-border-default hover:border-accent hover:bg-accent-muted transition-all cursor-pointer text-left group"
            >
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {t.label}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">{t.description}</p>
                <p className="text-[10px] text-text-muted mt-1">
                  {t.build().columns.length} columns
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
