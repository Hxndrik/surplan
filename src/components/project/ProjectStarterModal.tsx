import { useState } from 'react';
import { PROJECT_STARTERS, type ProjectStarter } from '../../lib/templates';
import { useEntityStore } from '../../store/useEntityStore';
import { useProjectStore } from '../../store/useProjectStore';
import type { AuthScheme } from '../../types';

interface ProjectStarterModalProps {
  onClose: () => void;
}

export function ProjectStarterModal({ onClose }: ProjectStarterModalProps) {
  const [selected, setSelected] = useState<ProjectStarter | null>(null);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  const addEntityFromTemplate = useEntityStore((s) => s.addEntityFromTemplate);
  const { updateMeta, addMilestone, updateMilestone, addFeature, updateFeature, addEndpoint, updateEndpoint, addScopeItem } = useProjectStore();

  function applyStarter(starter: ProjectStarter) {
    setApplying(true);
    const data = starter.build();

    // Meta
    updateMeta(data.meta);

    // Milestones — build id map
    const milestoneIds: string[] = data.milestones.map((m) => {
      const id = addMilestone(m.name);
      updateMilestone(id, { description: m.description, color: m.color });
      return id;
    });

    // Scope
    data.scope.forEach((s) => addScopeItem(s.text, s.inScope));

    // Entities
    data.entities.forEach((entity) => addEntityFromTemplate(entity));

    // Features
    data.features.forEach((f) => {
      const milestoneId = f.milestoneIdx !== undefined ? (milestoneIds[f.milestoneIdx] ?? '') : '';
      addFeature(f.title, milestoneId, f.priority);
      if (f.kind || f.notes) {
        // get newly added feature — it's last in list
        const feats = useProjectStore.getState().features;
        const newId = feats[feats.length - 1].id;
        updateFeature(newId, { kind: f.kind ?? 'feature', notes: f.notes ?? '' });
      }
    });

    // Endpoints
    data.endpoints.forEach((ep) => {
      const id = addEndpoint(ep.tag);
      updateEndpoint(id, {
        method: ep.method,
        path: ep.path,
        description: ep.description,
        auth: (ep.auth ?? 'none') as AuthScheme,
      });
    });

    setApplying(false);
    setDone(true);
    setTimeout(onClose, 800);
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[8vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-bg-secondary border border-border-active rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Project Starters</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Populate your project with a full starter template — entities, features, endpoints & milestones.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Starter cards */}
        <div className="p-5 space-y-3">
          {!selected ? (
            PROJECT_STARTERS.map((starter) => {
              const preview = starter.build();
              return (
                <button
                  key={starter.id}
                  type="button"
                  onClick={() => setSelected(starter)}
                  className="w-full text-left p-4 rounded-lg border border-border-default hover:border-border-active bg-bg-tertiary hover:bg-bg-hover transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{starter.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">{starter.label}</span>
                        <div className="flex gap-1 flex-wrap">
                          {starter.tags.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-active text-text-muted font-mono">{t}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-1">{starter.description}</p>
                      <div className="flex gap-4 mt-2 text-[10px] text-text-muted font-mono">
                        <span>🗂 {preview.entities.length} entities</span>
                        <span>⚡ {preview.features.length} features</span>
                        <span>🔗 {preview.endpoints.length} endpoints</span>
                        <span>🏁 {preview.milestones.length} milestones</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-text-muted group-hover:text-accent mt-1 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })
          ) : (
            /* Confirm screen */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-text-primary">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <span className="text-text-muted">/</span>
                <span className="text-lg">{selected.icon}</span>
                <span className="font-medium">{selected.label}</span>
              </div>

              <div className="p-4 rounded-lg border border-border-default bg-bg-tertiary space-y-3">
                {(() => {
                  const preview = selected.build();
                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: 'Entities', value: preview.entities.length, icon: '🗂' },
                          { label: 'Features', value: preview.features.length, icon: '⚡' },
                          { label: 'Endpoints', value: preview.endpoints.length, icon: '🔗' },
                          { label: 'Milestones', value: preview.milestones.length, icon: '🏁' },
                        ].map((stat) => (
                          <div key={stat.label} className="text-center p-2 rounded bg-bg-active">
                            <div className="text-lg">{stat.icon}</div>
                            <div className="text-sm font-semibold text-text-primary">{stat.value}</div>
                            <div className="text-[10px] text-text-muted">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Entities</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {preview.entities.map((e) => (
                            <span key={e.name} className="text-[10px] px-2 py-0.5 rounded border border-border-default text-text-secondary font-mono">{e.name}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Milestones</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {preview.milestones.map((m) => (
                            <span key={m.name} className="text-[10px] px-2 py-0.5 rounded text-[10px]" style={{ background: m.color + '22', color: m.color, border: `1px solid ${m.color}44` }}>
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-400">
                ⚠ This will <strong>add</strong> the starter data to your current project (existing data is kept). The project name and description will be overwritten.
              </div>

              {done ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Applied! Closing…
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:border-border-active transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => applyStarter(selected)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {applying ? 'Applying…' : `Apply "${selected.label}" Starter`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!selected && (
          <div className="px-5 py-2.5 border-t border-border-default flex items-center justify-between text-[10px] text-text-muted">
            <span>Starter data is added on top of existing project data.</span>
            <button type="button" onClick={onClose} className="hover:text-text-secondary transition-colors cursor-pointer">
              Esc to close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
