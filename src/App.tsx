import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MainContent } from './components/layout/MainContent';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer } from './components/shared/ToastContainer';
import { ExportPanel } from './components/export/ExportPanel';
import { SqlImportModal } from './components/entities/SqlImportModal';
import { JsonImportModal } from './components/entities/JsonImportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { FindReplaceModal } from './components/entities/FindReplaceModal';
import { ProjectStarterModal } from './components/project/ProjectStarterModal';
import { useUIStore } from './store/useUIStore';
import { useEntityStore } from './store/useEntityStore';
import { useProjectStore } from './store/useProjectStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useHistoryManager } from './hooks/useHistoryManager';
import { Landing } from './pages/Landing';
import { Docs } from './pages/Docs';
import { Pricing } from './pages/Pricing';
import { Guide } from './pages/Guide';
import { Features } from './pages/Features';
import { Changelog } from './pages/Changelog';
import type { ExportFormat } from './types';

function PlannerApp() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const addEntity = useEntityStore((s) => s.addEntity);
  const addFeature = useProjectStore((s) => s.addFeature);
  const addEndpoint = useProjectStore((s) => s.addEndpoint);
  const projectName = useProjectStore((s) => s.meta.name);
  const features = useProjectStore((s) => s.features);

  // Sync theme class on <html>, resolving 'system' via matchMedia
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      if (resolved === 'light') {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
    };

    apply();

    if (theme === 'system') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  // Update browser tab title with project name and completion %
  useEffect(() => {
    const done = features.filter((f) => f.done).length;
    const total = features.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : null;
    const name = projectName || 'Untitled Project';
    document.title = pct !== null ? `${name} — ${pct}% · surplan` : `${name} · surplan`;
  }, [projectName, features]);
  const { undo, redo } = useHistoryStore();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showStarter, setShowStarter] = useState(false);

  useHistoryManager();

  const openExport = useCallback((format?: ExportFormat) => {
    setExportFormat(format ?? 'sql-postgres');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;

      // Cmd+K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }

      // Ctrl+Z / Cmd+Z — undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y — redo
      if (
        ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) ||
        (e.ctrlKey && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+F — focus search in active tab (works even from inputs)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('surplan:focus-search'));
        return;
      }

      // Ctrl+H — find & replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace((v) => !v);
        return;
      }

      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('overview'); }
        if (e.key === '2') { e.preventDefault(); setActiveTab('entities'); }
        if (e.key === '3') { e.preventDefault(); setActiveTab('features'); }
        if (e.key === '4') { e.preventDefault(); setActiveTab('api'); }

        // Ctrl+N — new entity / feature / endpoint depending on active tab
        if (e.key === 'n') {
          e.preventDefault();
          if (activeTab === 'entities') {
            addEntity('New Entity');
          } else if (activeTab === 'features') {
            addFeature('New feature');
          } else if (activeTab === 'api') {
            addEndpoint();
          }
          return;
        }

        // Ctrl+E — export
        if (e.key === 'e') {
          e.preventDefault();
          openExport();
          return;
        }
      }

      // Ctrl+Shift+L — cycle theme (system → light → dark → system)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
        setTheme(next);
        return;
      }

      // ? key — show keyboard shortcuts (not in inputs)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape closes overlays
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setExportFormat(null);
        setShowImport(false);
        setShowJsonImport(false);
        setShowHelp(false);
        setShowFindReplace(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, setActiveTab, undo, redo, addEntity, addFeature, addEndpoint, openExport, setShowFindReplace, theme, setTheme]);

  // Listen for export events from command palette
  useEffect(() => {
    const handler = (e: Event) => {
      const format = (e as CustomEvent<ExportFormat>).detail;
      setExportFormat(format);
    };
    window.addEventListener('surplan:export', handler);
    return () => window.removeEventListener('surplan:export', handler);
  }, []);

  // Listen for import open events
  useEffect(() => {
    const handler = () => setShowImport(true);
    window.addEventListener('surplan:open-sql-import', handler);
    return () => window.removeEventListener('surplan:open-sql-import', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowJsonImport(true);
    window.addEventListener('surplan:open-json-import', handler);
    return () => window.removeEventListener('surplan:open-json-import', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowFindReplace(true);
    window.addEventListener('surplan:find-replace', handler);
    return () => window.removeEventListener('surplan:find-replace', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowStarter(true);
    window.addEventListener('surplan:open-starter', handler);
    return () => window.removeEventListener('surplan:open-starter', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onCommandPalette={() => setShowCommandPalette(true)} onHelp={() => setShowHelp(true)} onSetTheme={setTheme} theme={theme} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onImport={() => setShowImport(true)} onExport={() => openExport()} />
        <MainContent onExport={() => openExport()} />
      </div>

      {/* Overlays */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
      {exportFormat && (
        <ExportPanel
          initialFormat={exportFormat}
          onClose={() => setExportFormat(null)}
        />
      )}
      {showImport && <SqlImportModal onClose={() => setShowImport(false)} />}
      {showJsonImport && <JsonImportModal onClose={() => setShowJsonImport(false)} />}
      {showHelp && <KeyboardShortcutsModal onClose={() => setShowHelp(false)} />}
      {showFindReplace && <FindReplaceModal onClose={() => setShowFindReplace(false)} />}
      {showStarter && <ProjectStarterModal onClose={() => setShowStarter(false)} />}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<PlannerApp />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/guide" element={<Guide />} />
      <Route path="/features" element={<Features />} />
      <Route path="/changelog" element={<Changelog />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
