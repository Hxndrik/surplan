import { useState } from 'react';
import { useFrontendStore } from '../../store/useFrontendStore';
import { useEntityStore } from '../../store/useEntityStore';
import { InlineEdit } from '../shared/InlineEdit';
import { entityToProps } from '../../lib/frontendHelpers';
import type { UIComponent, ComponentKind, PageStatus } from '../../types';

const KIND_COLORS: Record<ComponentKind, string> = {
  page: '#6366f1', layout: '#8b5cf6', container: '#06b6d4', ui: '#10b981',
  form: '#f59e0b', 'data-display': '#ec4899', navigation: '#64748b',
  feedback: '#ef4444', utility: '#94a3b8',
};

const STATUS_LABELS: Record<PageStatus, string> = {
  planned: 'Planned', 'in-progress': 'In Progress', built: 'Built',
};

interface ComponentCardProps {
  component: UIComponent;
  depth?: number;
}

export function ComponentCard({ component, depth = 0 }: ComponentCardProps) {
  const updateComponent = useFrontendStore((s) => s.updateComponent);
  const removeComponent = useFrontendStore((s) => s.removeComponent);
  const duplicateComponent = useFrontendStore((s) => s.duplicateComponent);
  const addComponentProp = useFrontendStore((s) => s.addComponentProp);
  const updateComponentProp = useFrontendStore((s) => s.updateComponentProp);
  const removeComponentProp = useFrontendStore((s) => s.removeComponentProp);
  const addComponentEvent = useFrontendStore((s) => s.addComponentEvent);
  const updateComponentEvent = useFrontendStore((s) => s.updateComponentEvent);
  const removeComponentEvent = useFrontendStore((s) => s.removeComponentEvent);
  const addComponentState = useFrontendStore((s) => s.addComponentState);
  const updateComponentState = useFrontendStore((s) => s.updateComponentState);
  const removeComponentState = useFrontendStore((s) => s.removeComponentState);
  const entities = useEntityStore((s) => s.entities);
  const allComponents = useFrontendStore((s) => s.components);
  const children = allComponents.filter((c) => c.parentId === component.id);

  const [expanded, setExpanded] = useState(false);
  const linkedEntity = entities.find((e) => e.id === component.entityRef);

  const handleGenerateProps = () => {
    if (!linkedEntity) return;
    const props = entityToProps(linkedEntity);
    for (const p of props) {
      useFrontendStore.getState().addComponentProp(component.id);
      const comp = useFrontendStore.getState().components.find((c) => c.id === component.id);
      const lastProp = comp?.props[comp.props.length - 1];
      if (lastProp) {
        useFrontendStore.getState().updateComponentProp(component.id, lastProp.id, {
          name: p.name, type: p.type, required: p.required, defaultValue: p.defaultValue, description: p.description,
        });
      }
    }
  };

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden mb-1">
        {/* Header */}
        <div className="px-3 py-2 flex items-center gap-2">
          {children.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-text-muted hover:text-text-secondary cursor-pointer">
              <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: KIND_COLORS[component.kind] }} />
          <InlineEdit
            value={component.name}
            onSave={(v: string) => updateComponent(component.id, { name: v })}
            className="text-xs font-semibold text-text-primary flex-1"
          />
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{component.kind}</span>
          <select
            value={component.status}
            onChange={(e) => updateComponent(component.id, { status: e.target.value as PageStatus })}
            className="text-[9px] bg-bg-tertiary border border-border-default rounded px-1 py-0.5 text-text-muted cursor-pointer"
          >
            {(Object.keys(STATUS_LABELS) as PageStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={component.kind}
            onChange={(e) => updateComponent(component.id, { kind: e.target.value as ComponentKind })}
            className="text-[9px] bg-bg-tertiary border border-border-default rounded px-1 py-0.5 text-text-muted cursor-pointer"
          >
            {(Object.keys(KIND_COLORS) as ComponentKind[]).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer">
            {expanded ? '−' : '+'}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-border-default px-3 py-2 space-y-3 bg-bg-primary/30">
            <InlineEdit
              value={component.description}
              onSave={(v: string) => updateComponent(component.id, { description: v })}
              placeholder="Component description..."
              className="text-[11px] text-text-muted block w-full"
            />

            {/* Entity binding */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Entity Binding</p>
                {linkedEntity && (
                  <button onClick={handleGenerateProps} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">Generate props from {linkedEntity.name}</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={component.entityRef ?? ''}
                  onChange={(e) => updateComponent(component.id, { entityRef: e.target.value || null })}
                  className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-secondary cursor-pointer flex-1"
                >
                  <option value="">No entity</option>
                  {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            {/* Props table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Props ({component.props.length})</p>
                <button onClick={() => addComponentProp(component.id)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
              </div>
              {component.props.length > 0 && (
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[1fr_1fr_40px_1fr_20px] gap-1 text-[9px] text-text-muted uppercase px-1">
                    <span>Name</span><span>Type</span><span>Req</span><span>Default</span><span />
                  </div>
                  {component.props.map((p) => (
                    <div key={p.id} className="grid grid-cols-[1fr_1fr_40px_1fr_20px] gap-1 items-center bg-bg-tertiary rounded px-1 py-0.5">
                      <InlineEdit value={p.name} onSave={(v: string) => updateComponentProp(component.id, p.id, { name: v })} placeholder="name" className="text-[10px] text-text-secondary" />
                      <InlineEdit value={p.type} onSave={(v: string) => updateComponentProp(component.id, p.id, { type: v })} placeholder="string" className="text-[10px] text-accent font-mono" />
                      <input type="checkbox" checked={p.required} onChange={(e) => updateComponentProp(component.id, p.id, { required: e.target.checked })} className="w-3 h-3" />
                      <InlineEdit value={p.defaultValue} onSave={(v: string) => updateComponentProp(component.id, p.id, { defaultValue: v })} placeholder="—" className="text-[10px] text-text-muted" />
                      <button onClick={() => removeComponentProp(component.id, p.id)} className="text-danger/60 hover:text-danger text-[10px] cursor-pointer">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Events table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Events ({component.events.length})</p>
                <button onClick={() => addComponentEvent(component.id)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
              </div>
              {component.events.map((ev) => (
                <div key={ev.id} className="grid grid-cols-[1fr_1fr_20px] gap-1 items-center bg-bg-tertiary rounded px-1 py-0.5">
                  <InlineEdit value={ev.name} onSave={(v: string) => updateComponentEvent(component.id, ev.id, { name: v })} placeholder="onClick" className="text-[10px] text-text-secondary" />
                  <InlineEdit value={ev.payload} onSave={(v: string) => updateComponentEvent(component.id, ev.id, { payload: v })} placeholder="void" className="text-[10px] text-accent font-mono" />
                  <button onClick={() => removeComponentEvent(component.id, ev.id)} className="text-danger/60 hover:text-danger text-[10px] cursor-pointer">×</button>
                </div>
              ))}
            </div>

            {/* State table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">State ({component.stateFields.length})</p>
                <button onClick={() => addComponentState(component.id)} className="text-[10px] text-accent hover:text-accent/80 cursor-pointer">+ Add</button>
              </div>
              {component.stateFields.map((sf) => (
                <div key={sf.id} className="grid grid-cols-[1fr_1fr_1fr_20px] gap-1 items-center bg-bg-tertiary rounded px-1 py-0.5">
                  <InlineEdit value={sf.name} onSave={(v: string) => updateComponentState(component.id, sf.id, { name: v })} placeholder="isOpen" className="text-[10px] text-text-secondary" />
                  <InlineEdit value={sf.type} onSave={(v: string) => updateComponentState(component.id, sf.id, { type: v })} placeholder="boolean" className="text-[10px] text-accent font-mono" />
                  <InlineEdit value={sf.initialValue} onSave={(v: string) => updateComponentState(component.id, sf.id, { initialValue: v })} placeholder="false" className="text-[10px] text-text-muted" />
                  <button onClick={() => removeComponentState(component.id, sf.id)} className="text-danger/60 hover:text-danger text-[10px] cursor-pointer">×</button>
                </div>
              ))}
            </div>

            {/* Parent selector */}
            <div className="space-y-1">
              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Parent Component</p>
              <select
                value={component.parentId ?? ''}
                onChange={(e) => useFrontendStore.getState().setComponentParent(component.id, e.target.value || null)}
                className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-0.5 text-text-secondary cursor-pointer w-full"
              >
                <option value="">None (root)</option>
                {allComponents.filter((c) => c.id !== component.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <textarea
              value={component.notes}
              onChange={(e) => updateComponent(component.id, { notes: e.target.value })}
              placeholder="Implementation notes..."
              className="w-full text-[11px] bg-bg-tertiary border border-border-default rounded p-2 text-text-secondary resize-none min-h-[40px]"
              rows={2}
            />

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => duplicateComponent(component.id)} className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer">Duplicate</button>
              <button onClick={() => removeComponent(component.id)} className="text-[10px] text-danger/60 hover:text-danger cursor-pointer">Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Render children recursively */}
      {expanded && children.map((child) => (
        <ComponentCard key={child.id} component={child} depth={depth + 1} />
      ))}
    </div>
  );
}
