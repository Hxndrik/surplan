interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const Mod = isMac ? '⌘' : 'Ctrl';

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-mono text-text-secondary bg-bg-tertiary border border-border-default rounded shadow-sm">
      {children}
    </kbd>
  );
}

const SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: [Mod, 'K'], label: 'Open command palette' },
      { keys: [Mod, '1'], label: 'Go to Overview' },
      { keys: [Mod, '2'], label: 'Go to Entities' },
      { keys: [Mod, '3'], label: 'Go to Features' },
      { keys: [Mod, '4'], label: 'Go to API Endpoints' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: [Mod, 'Z'], label: 'Undo' },
      { keys: [Mod, '⇧', 'Z'], label: 'Redo' },
      { keys: [Mod, 'N'], label: 'New entity / feature / endpoint (context-aware)' },
      { keys: [Mod, 'F'], label: 'Focus search in current tab' },
      { keys: [Mod, 'H'], label: 'Find & replace across all entities' },
      { keys: [Mod, 'E'], label: 'Open export panel' },
      { keys: [Mod, '⇧', 'L'], label: 'Toggle light / dark mode' },
      { keys: ['Enter'], label: 'Confirm inline edit' },
      { keys: ['Escape'], label: 'Cancel edit / close overlay' },
    ],
  },
  {
    title: 'Entities',
    shortcuts: [
      { keys: ['Click', 'name'], label: 'Inline edit entity name' },
      { keys: ['Tab'], label: 'Move to next column field' },
      { keys: ['Enter'], label: 'Save & add another column' },
      { keys: ['Drag', '⠿'], label: 'Reorder columns within an entity' },
    ],
  },
  {
    title: 'Features',
    shortcuts: [
      { keys: ['Drag', '⠿'], label: 'Reorder features within a group' },
      { keys: ['Click', 'status'], label: 'Cycle status: todo → active → done' },
      { keys: ['Click', 'desc'], label: 'Edit feature description inline' },
      { keys: [Mod, 'Enter'], label: 'Save description / notes (in text area)' },
      { keys: ['+ notes'], label: 'Expand acceptance criteria field (hover row)' },
      { keys: ['Esc'], label: 'Cancel notes edit & revert' },
      { keys: ['📋', 'icon'], label: 'Copy feature as user story to clipboard' },
      { keys: ['due', 'badge'], label: 'Click due date badge to change date' },
      { keys: ['+ blocker'], label: 'Add a blocking dependency (hover row)' },
    ],
  },
  {
    title: 'Feature Search',
    shortcuts: [
      { keys: ['is:done'], label: 'Show completed features' },
      { keys: ['is:active'], label: 'Show in-progress features' },
      { keys: ['is:blocked'], label: 'Show features waiting on others' },
      { keys: ['is:blocking'], label: 'Show features that block others' },
      { keys: ['is:overdue'], label: 'Show features past their due date' },
      { keys: ['is:quickwin'], label: 'Low effort (≤5pt), high value (>5) features' },
      { keys: ['p:high'], label: 'Filter by priority (critical/high/medium/low)' },
      { keys: ['#tag'], label: 'Filter by tag name' },
      { keys: ['notes:text'], label: 'Search within acceptance criteria' },
      { keys: ['m:name'], label: 'Filter by milestone name' },
      { keys: ['est:5'], label: 'Filter by exact estimate value' },
      { keys: ['est:>5'], label: 'Filter features with estimate > 5 (also >=, <, <=)' },
      { keys: ['val:8'], label: 'Filter by exact business value score' },
      { keys: ['val:>8'], label: 'Filter features with value > 8 (also >=, <, <=)' },
      { keys: ['has:due'], label: 'Show features with a due date set' },
      { keys: ['has:url'], label: 'Show features with an external link' },
      { keys: ['has:cycletime'], label: 'Show features with both start and done dates' },
      { keys: ['@name'], label: 'Filter by assignee (e.g. @alice)' },
      { keys: ['has:assignee'], label: 'Show features assigned to anyone' },
      { keys: ['is:bug'], label: 'Show bug-type features' },
      { keys: ['is:improvement'], label: 'Show improvement-type features' },
      { keys: ['is:chore'], label: 'Show chore-type features' },
      { keys: ['no:milestone'], label: 'Show features without a milestone (backlog)' },
      { keys: ['has:milestone'], label: 'Show features assigned to any milestone' },
      { keys: ['no:assignee'], label: 'Show features with no assignee' },
      { keys: ['is:unestimated'], label: 'Show features with no story points' },
      { keys: ['has:notes'], label: 'Show features that have acceptance criteria' },
      { keys: ['has:checklist'], label: 'Show features with a checklist' },
      { keys: ['is:stale'], label: 'Show in-progress features stuck for >14 days' },
      { keys: ['is:fullspec'], label: 'Show fully documented features (title, notes, estimate, milestone, assignee)' },
      { keys: ['is:underspec'], label: 'Show features missing most documentation fields' },
      { keys: ['completed:today'], label: 'Completed today' },
      { keys: ['completed:yesterday'], label: 'Completed yesterday' },
      { keys: ['completed:this-week'], label: 'Completed in the last 7 days' },
      { keys: ['completed:this-month'], label: 'Completed in the current month' },
    ],
  },
  {
    title: 'API Endpoints',
    shortcuts: [
      { keys: ['↑', '↓', 'icons'], label: 'Reorder endpoints (hover row, no filters active)' },
      { keys: [Mod, 'N'], label: 'Add new endpoint (when API tab active)' },
    ],
  },
  {
    title: 'ERD View',
    shortcuts: [
      { keys: ['Scroll'], label: 'Zoom in / out' },
      { keys: ['+', '/'], label: 'Zoom in (keyboard)' },
      { keys: ['-'], label: 'Zoom out (keyboard)' },
      { keys: [Mod, '0'], label: 'Reset zoom & pan' },
      { keys: ['Drag', 'canvas'], label: 'Pan the diagram' },
      { keys: ['Drag', 'card'], label: 'Move entity card' },
    ],
  },
];

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-bg-secondary border border-border-active rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Press <Key>?</Key> anytime to show this</p>
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

        {/* Sections grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{section.title}</p>
              <div className="space-y-1.5">
                {section.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-text-secondary">{s.label}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {s.keys.map((k, j) => (
                        <Key key={j}>{k}</Key>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border-default flex items-center justify-between text-[10px] text-text-muted">
          <span>All data is stored locally — no backend required.</span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 hover:text-text-secondary transition-colors cursor-pointer"
          >
            <Key>Esc</Key>
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
