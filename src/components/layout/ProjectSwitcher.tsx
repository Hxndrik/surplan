import { useState, useRef, useEffect } from 'react';
import { useProjectsStore } from '../../store/useProjectsStore';
import { useProjectStore } from '../../store/useProjectStore';

export function ProjectSwitcher() {
  const projects = useProjectsStore((s) => s.projects);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const switchProject = useProjectsStore((s) => s.switchProject);
  const createProject = useProjectsStore((s) => s.createProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const activeProjectName = useProjectStore((s) => s.meta.name);

  const [open, setOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  const handleCreate = () => {
    const name = newProjectName.trim() || 'New Project';
    createProject(name);
    setNewProjectName('');
    setCreating(false);
    setOpen(false);
  };

  const handleSwitch = (id: string) => {
    switchProject(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-4 hover:bg-bg-hover transition-colors cursor-pointer group"
      >
        <div className="flex-1 min-w-0 text-left">
          <h1 className="text-sm font-bold text-text-primary tracking-wider truncate">surplan</h1>
          <p className="text-[10px] text-text-muted mt-0.5 truncate leading-tight">
            {activeProjectName || 'Untitled Project'}
          </p>
        </div>
        <svg
          className={`w-3 h-3 text-text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setCreating(false); }} />
          <div className="absolute top-0 left-full ml-1 z-40 bg-bg-secondary border border-border-default rounded-lg shadow-2xl w-52 overflow-hidden animate-fade-in">
            <p className="text-[10px] text-text-muted uppercase tracking-wider px-3 py-2 border-b border-border-default">
              Projects
            </p>

            {/* Project list */}
            <div className="max-h-56 overflow-y-auto">
              {projects.map((p) => {
                const isActive = p.id === activeProjectId;
                const displayName = isActive ? (activeProjectName || p.name) : p.name;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isActive && handleSwitch(p.id)}
                    className={`flex items-center gap-2 px-3 py-2 group/item transition-colors ${
                      isActive
                        ? 'bg-bg-hover cursor-default'
                        : 'hover:bg-bg-hover cursor-pointer'
                    }`}
                  >
                    {/* Active indicator */}
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-accent' : 'bg-transparent'}`} />

                    <span className={`text-xs flex-1 truncate ${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                      {displayName || 'Untitled'}
                    </span>

                    {/* Delete (hidden for last project) */}
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
                        title="Delete project"
                        className="opacity-0 group-hover/item:opacity-100 text-text-muted hover:text-danger transition-all cursor-pointer flex-shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* New project */}
            <div className="border-t border-border-default">
              {creating ? (
                <div className="px-3 py-2 flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') { setCreating(false); setNewProjectName(''); }
                    }}
                    onBlur={handleCreate}
                    placeholder="Project name..."
                    className="flex-1 text-xs bg-bg-primary border border-border-focus rounded px-2 py-1 text-text-primary outline-none placeholder:text-text-placeholder"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-accent hover:bg-bg-hover transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Project
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
