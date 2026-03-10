import { useRef, useEffect } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useEntityStore } from '../../store/useEntityStore';
import { useProjectStore } from '../../store/useProjectStore';
import { ProjectSwitcher } from './ProjectSwitcher';
import { backupProject, restoreProject, exportProjectMarkdown } from '../../lib/backup';
import { useToast } from '../../hooks/useToast';
import type { ActiveTab } from '../../types';
import type { Theme } from '../../store/useUIStore';

const tabs: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'entities', label: 'Entities', icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6M9 15h4' },
  { id: 'features', label: 'Features', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'api', label: 'API', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

interface SidebarProps {
  onCommandPalette?: () => void;
  onHelp?: () => void;
  onSetTheme?: (theme: Theme) => void;
  theme?: Theme;
}

export function Sidebar({ onCommandPalette, onHelp, onSetTheme, theme }: SidebarProps) {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const entityCount = useEntityStore((s) => s.entities.length);
  const featureCount = useProjectStore((s) => s.features.length);
  const doneCount = useProjectStore((s) => s.features.filter((f) => f.done).length);
  const activeCount = useProjectStore((s) => s.features.filter((f) => f.inProgress && !f.done).length);
  const endpointCount = useProjectStore((s) => s.endpoints.length);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener('surplan:restore', handler);
    return () => window.removeEventListener('surplan:restore', handler);
  }, []);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await restoreProject(file);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    e.target.value = '';
  };

  return (
    <aside className="w-48 flex-shrink-0 bg-bg-secondary border-r border-border-default flex flex-col h-screen">
      {/* Project switcher */}
      <div className="border-b border-border-default">
        <ProjectSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}

        {/* Quick stats */}
        <div className="mt-4 pt-3 border-t border-border-default space-y-1 px-3">
          <p className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">Stats</p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Entities</span>
            <span className="text-text-secondary font-medium">{entityCount}</span>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-text-muted">Features</span>
              <span className="text-text-secondary font-medium">
                {featureCount > 0 ? `${doneCount}/${featureCount}` : '0'}
                {activeCount > 0 && <span className="text-warning ml-1 text-[9px]">·{activeCount}▶</span>}
              </span>
            </div>
            {featureCount > 0 && (
              <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((doneCount / featureCount) * 100)}%`,
                    backgroundColor: doneCount === featureCount ? '#10b981' : '#6366f1',
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Endpoints</span>
            <span className="text-text-secondary font-medium">{endpointCount}</span>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border-default space-y-1">
        {onCommandPalette && (
          <button
            type="button"
            onClick={onCommandPalette}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <span>Command palette</span>
            <kbd className="text-[9px] border border-border-default rounded px-1">⌘K</kbd>
          </button>
        )}
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <span>Keyboard shortcuts</span>
            <kbd className="text-[9px] border border-border-default rounded px-1">?</kbd>
          </button>
        )}

        {/* Backup / Restore / Export .md */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={backupProject}
            title="Download project backup as JSON"
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Backup
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Restore project from JSON backup"
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Restore
          </button>
          <button
            type="button"
            onClick={exportProjectMarkdown}
            title="Export full project as Markdown"
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            .md
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleRestore}
          />
        </div>

        {/* Theme toggle — three-way segmented control */}
        {onSetTheme && (
          <div className="flex rounded-md overflow-hidden border border-border-default">
            {([
              { value: 'system' as Theme, label: 'System', icon: 'M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z' },
              { value: 'light' as Theme, label: 'Light', icon: 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z' },
              { value: 'dark' as Theme, label: 'Dark', icon: 'M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSetTheme(opt.value)}
                title={opt.label}
                className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 text-[10px] transition-colors cursor-pointer ${
                  theme === opt.value
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover/50'
                }`}
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
