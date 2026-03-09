import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Feature, Priority, Estimate, FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { useEntityStore } from '../../store/useEntityStore';
import { InlineEdit } from '../shared/InlineEdit';
import { IconButton } from '../shared/IconButton';
import { PRIORITIES, PRIORITY_CONFIG } from '../../lib/constants';

const KIND_ORDER: FeatureKind[] = ['feature', 'bug', 'improvement', 'chore'];
const KIND_LABEL: Record<FeatureKind, string> = {
  feature: 'feat',
  bug: 'bug',
  improvement: 'impr',
  chore: 'chore',
};
const KIND_COLOR: Record<FeatureKind, string> = {
  feature: 'text-accent bg-accent-muted border-accent/25',
  bug: 'text-danger bg-danger/10 border-danger/25',
  improvement: 'text-success bg-success/10 border-success/25',
  chore: 'text-text-muted bg-bg-tertiary border-border-default',
};

interface FeatureItemProps {
  feature: Feature;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onTagClick?: (tag: string) => void;
  allTags?: string[];
  allFeatures?: Feature[];
}

export function FeatureItem({ feature, selectionMode, isSelected, onToggleSelect, onTagClick, allTags = [], allFeatures = [] }: FeatureItemProps) {
  const updateFeature = useProjectStore((s) => s.updateFeature);
  const removeFeature = useProjectStore((s) => s.removeFeature);
  const duplicateFeature = useProjectStore((s) => s.duplicateFeature);
  const addChecklistItem = useProjectStore((s) => s.addChecklistItem);
  const toggleChecklistItem = useProjectStore((s) => s.toggleChecklistItem);
  const updateChecklistItem = useProjectStore((s) => s.updateChecklistItem);
  const removeChecklistItem = useProjectStore((s) => s.removeChecklistItem);
  const milestones = useProjectStore((s) => s.milestones);
  const entities = useEntityStore((s) => s.entities);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistInputId, setChecklistInputId] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [storyCopied, setStoryCopied] = useState(false);
  const [showBlockerPicker, setShowBlockerPicker] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [assigneeDraft, setAssigneeDraft] = useState('');
  const [editingSprint, setEditingSprint] = useState(false);
  const [sprintDraft, setSprintDraft] = useState('');

  const now = new Date();
  const due = feature.dueDate ? new Date(feature.dueDate) : null;
  const daysUntil = due ? Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000) : null;
  const isOverdue = !feature.done && daysUntil !== null && daysUntil < 0;
  const isDueSoon = !feature.done && daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

  const activeBlockers = allFeatures.filter(
    (f) => (feature.blockedBy ?? []).includes(f.id) && !f.done
  );
  const allBlockerFeatures = allFeatures.filter((f) => (feature.blockedBy ?? []).includes(f.id));
  // Reverse: features that are blocked by this feature (and not done)
  const blockingFeatures = allFeatures.filter(
    (f) => !f.done && (f.blockedBy ?? []).includes(feature.id)
  );

  const wouldCreateCycle = (blockerId: string): boolean => {
    // DFS: check if feature.id is reachable from blockerId via blockedBy
    const visited = new Set<string>();
    const queue = [blockerId];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === feature.id) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const f = allFeatures.find((x) => x.id === cur);
      if (f) (f.blockedBy ?? []).forEach((id) => queue.push(id));
    }
    return false;
  };

  const toggleBlocker = (blockerId: string) => {
    const current = feature.blockedBy ?? [];
    if (!current.includes(blockerId) && wouldCreateCycle(blockerId)) return; // prevent cycle
    const updated = current.includes(blockerId)
      ? current.filter((id) => id !== blockerId)
      : [...current, blockerId];
    updateFeature(feature.id, { blockedBy: updated });
  };

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !(feature.tags ?? []).includes(t)) {
      updateFeature(feature.id, { tags: [...(feature.tags ?? []), t] });
    }
    setTagDraft('');
    setAddingTag(false);
  };

  const removeTag = (tag: string) => {
    updateFeature(feature.id, { tags: (feature.tags ?? []).filter((t) => t !== tag) });
  };

  const getUrlLabel = (url: string): string => {
    try {
      const host = new URL(url).hostname.replace('www.', '');
      if (host.includes('github')) return 'GitHub';
      if (host.includes('gitlab')) return 'GitLab';
      if (host.includes('linear.app')) return 'Linear';
      if (host.includes('atlassian.net') || host.includes('jira')) return 'Jira';
      if (host.includes('trello.com')) return 'Trello';
      if (host.includes('notion.so')) return 'Notion';
      if (host.includes('asana.com')) return 'Asana';
      if (host.includes('clickup.com')) return 'ClickUp';
      return host.split('.')[0];
    } catch {
      return 'link';
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (editingDesc && descRef.current) {
      descRef.current.focus();
      descRef.current.selectionStart = descRef.current.value.length;
    }
  }, [editingDesc]);

  useEffect(() => {
    if (showNotes && notesRef.current) {
      notesRef.current.focus();
      notesRef.current.selectionStart = notesRef.current.value.length;
    }
  }, [showNotes]);

  const startEditDesc = () => {
    setDescDraft(feature.description);
    setEditingDesc(true);
  };

  const saveDesc = () => {
    updateFeature(feature.id, { description: descDraft });
    setEditingDesc(false);
  };

  const linkedEntities = entities.filter((e) => feature.entityRefs.includes(e.id));

  const toggleEntityRef = (entityId: string) => {
    const current = feature.entityRefs;
    const updated = current.includes(entityId)
      ? current.filter((id) => id !== entityId)
      : [...current, entityId];
    updateFeature(feature.id, { entityRefs: updated });
  };

  // Spec completeness: 0–100 score based on how well-documented the feature is
  const specScore = (() => {
    const checks: [boolean, number, string][] = [
      [!!feature.title?.trim(), 15, 'Title'],
      [!!feature.description?.trim(), 15, 'Description'],
      [!!feature.notes?.trim(), 20, 'Acceptance criteria'],
      [!!feature.estimate && feature.estimate !== '?', 10, 'Estimate'],
      [!!feature.milestone, 10, 'Milestone'],
      [!!feature.assignee?.trim(), 10, 'Assignee'],
      [(feature.entityRefs?.length ?? 0) > 0, 10, 'Entity link'],
      [(feature.tags?.length ?? 0) > 0, 5, 'Tags'],
      [!!feature.dueDate, 5, 'Due date'],
    ];
    const score = checks.filter(([pass]) => pass).reduce((s, [, pts]) => s + pts, 0);
    const missing = checks.filter(([pass]) => !pass).map(([, , label]) => label);
    return { score, missing };
  })();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-border-default group hover:bg-bg-hover transition-colors ${isSelected ? 'bg-accent-muted/40' : ''}`}
    >
    <div className="grid grid-cols-[20px_24px_1fr_110px_52px_52px_90px_88px] gap-2 items-start px-3 py-1.5">
      {/* Drag handle or select checkbox in selection mode */}
      {selectionMode ? (
        <div className="flex justify-center items-center">
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={onToggleSelect}
            className="w-3.5 h-3.5 rounded border-border-default accent-accent cursor-pointer"
          />
        </div>
      ) : (
        <div
          {...attributes}
          {...listeners}
          className="flex justify-center items-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-secondary"
          title="Drag to reorder"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}

      {/* Tri-state status button: todo → in-progress → done → todo */}
      <div className="flex justify-center items-center">
        <button
          type="button"
          title={feature.done ? 'Done — click to reset' : feature.inProgress ? 'In progress — click to mark done' : 'Todo — click to start'}
          onClick={() => {
            if (feature.done) {
              updateFeature(feature.id, { done: false, inProgress: false });
            } else if (feature.inProgress) {
              updateFeature(feature.id, { done: true, inProgress: false });
            } else {
              const today = new Date().toISOString().slice(0, 10);
              updateFeature(feature.id, {
                inProgress: true,
                startDate: feature.startDate ?? today,
              });
            }
          }}
          className="w-4 h-4 flex items-center justify-center cursor-pointer transition-all hover:scale-110"
        >
          {feature.done ? (
            /* Done: filled green circle with checkmark */
            <svg className="w-4 h-4 text-success" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="7" />
              <path d="M5 8.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          ) : feature.inProgress ? (
            /* In progress: amber half-filled circle */
            <svg className="w-4 h-4 text-warning" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1a7 7 0 0 1 0 14V1z" fill="currentColor" />
            </svg>
          ) : (
            /* Todo: empty circle */
            <svg className="w-4 h-4 text-text-muted hover:text-text-secondary" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="7" />
            </svg>
          )}
        </button>
      </div>

      {/* Title + description + entity refs */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <InlineEdit
            value={feature.title}
            onSave={(v) => updateFeature(feature.id, { title: v })}
            className={`text-xs ${feature.done ? 'line-through text-text-muted' : feature.inProgress ? 'text-warning' : ''}`}
            placeholder="Feature title..."
          />
          {activeBlockers.length > 0 && (
            <span
              title={`Blocked by: ${activeBlockers.map((f) => f.title).join(', ')}`}
              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/30 font-medium flex-shrink-0"
            >
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {activeBlockers.length} blocked
            </span>
          )}
          {blockingFeatures.length > 0 && !feature.done && (
            <span
              title={`Blocking: ${blockingFeatures.map((f) => f.title).join(', ')}`}
              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-warning/12 text-warning/80 border border-warning/25 font-medium flex-shrink-0"
            >
              <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M4 9l4 4 4-4"/>
              </svg>
              blocking {blockingFeatures.length}
            </span>
          )}
          {/* Kind badge — click to cycle */}
          {(() => {
            const kind = feature.kind ?? 'feature';
            if (kind === 'feature') {
              // Show on hover only for default kind
              return (
                <button
                  type="button"
                  title="Click to set type: feature → bug → improvement → chore"
                  onClick={() => updateFeature(feature.id, { kind: 'bug' })}
                  className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-[9px] px-1.5 py-0.5 rounded border border-transparent hover:border-border-default hover:text-text-muted cursor-pointer flex-shrink-0 text-text-placeholder"
                >
                  feat
                </button>
              );
            }
            return (
              <button
                type="button"
                title={`Type: ${kind} — click to cycle (→ ${KIND_ORDER[(KIND_ORDER.indexOf(kind) + 1) % KIND_ORDER.length]})`}
                onClick={() => {
                  const next = KIND_ORDER[(KIND_ORDER.indexOf(kind) + 1) % KIND_ORDER.length];
                  updateFeature(feature.id, { kind: next === 'feature' ? undefined : next });
                }}
                className={`text-[9px] px-1.5 py-0.5 rounded border font-medium cursor-pointer flex-shrink-0 transition-colors hover:opacity-80 ${KIND_COLOR[kind]}`}
              >
                {KIND_LABEL[kind]}
              </button>
            );
          })()}
          {/* Checklist progress badge */}
          {(feature.checklist ?? []).length > 0 && (
            <button
              type="button"
              onClick={() => setShowChecklist((v) => !v)}
              title={`${(feature.checklist ?? []).filter((c) => c.done).length}/${(feature.checklist ?? []).length} checklist items done`}
              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border-default hover:border-border-active cursor-pointer flex-shrink-0"
            >
              ☑ {(feature.checklist ?? []).filter((c) => c.done).length}/{(feature.checklist ?? []).length}
            </button>
          )}
          {/* Quick win badge */}
          {!feature.done && (() => {
            const v = parseInt(feature.value ?? '', 10);
            const e = parseInt(feature.estimate ?? '', 10);
            return !isNaN(v) && !isNaN(e) && e > 0 && e <= 5 && v > 5 ? (
              <span
                title={`Quick win — ${e}pt effort, ${v} value, efficiency ${(v/e).toFixed(1)}x`}
                className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded-full bg-success/12 text-success/80 border border-success/25 font-medium flex-shrink-0"
              >
                ⚡
              </span>
            ) : null;
          })()}
          {/* Cycle time badge — shown when done + has both startDate and completedAt */}
          {feature.done && feature.startDate && feature.completedAt && (() => {
            const start = new Date(feature.startDate).getTime();
            const end = new Date(feature.completedAt).getTime();
            const days = Math.round((end - start) / 86400000);
            return days >= 0 ? (
              <span
                title={`Cycle time: ${feature.startDate} → ${feature.completedAt} (${days} day${days === 1 ? '' : 's'})`}
                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success/70 border border-success/20 font-medium flex-shrink-0"
              >
                ⏱ {days}d
              </span>
            ) : null;
          })()}
          {/* Stale badge — in-progress for >14 days without completion */}
          {feature.inProgress && !feature.done && feature.startDate && (() => {
            const startMs = new Date(feature.startDate).getTime();
            const daysInProgress = Math.round((Date.now() - startMs) / 86400000);
            if (daysInProgress < 14) return null;
            return (
              <span
                title={`In progress for ${daysInProgress} days since ${feature.startDate} — might be stale or blocked`}
                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/25 font-medium flex-shrink-0"
              >
                🕐 {daysInProgress}d
              </span>
            );
          })()}
          {/* Spec completeness score — shown on hover when score < 100 and feature not done */}
          {!feature.done && specScore.score < 100 && (
            <span
              title={`Spec: ${specScore.score}% complete\nMissing: ${specScore.missing.join(', ')}`}
              className={`opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 cursor-help ${
                specScore.score >= 80 ? 'bg-success/8 text-success/60 border-success/20' :
                specScore.score >= 50 ? 'bg-warning/8 text-warning/60 border-warning/20' :
                'bg-text-muted/8 text-text-muted/60 border-text-muted/15'
              }`}
            >
              {specScore.score}%
            </span>
          )}
          {/* External link */}
          {feature.url ? (
            <span className="inline-flex items-center gap-0.5 flex-shrink-0">
              <a
                href={feature.url}
                target="_blank"
                rel="noopener noreferrer"
                title={feature.url}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-accent border border-accent/25 hover:border-accent/50 transition-colors flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {getUrlLabel(feature.url)}
              </a>
              <button
                type="button"
                onClick={() => { setUrlDraft(feature.url ?? ''); setEditingUrl(true); }}
                className="text-text-muted opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-text-secondary transition-opacity cursor-pointer"
                title="Edit link"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setUrlDraft(''); setEditingUrl(true); }}
              className="text-[9px] text-text-muted opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
              title="Add external link (Jira, GitHub, Linear...)"
            >
              + link
            </button>
          )}
          {/* Start date badge (hidden unless set) */}
          {feature.startDate && !feature.done && (
            <span className="relative inline-flex items-center flex-shrink-0">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full border bg-bg-secondary text-text-muted border-border-default"
                title={`Start: ${new Date(feature.startDate).toLocaleDateString()}`}
              >
                ▶ {new Date(feature.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <input
                type="date"
                value={feature.startDate ?? ''}
                onChange={(e) => updateFeature(feature.id, { startDate: e.target.value || undefined })}
                title="Change start date"
                className="absolute inset-0 opacity-0 hover:opacity-100 focus:opacity-100 bg-transparent outline-none cursor-pointer text-[9px] w-full"
                style={{ colorScheme: 'dark' }}
              />
            </span>
          )}
          {/* Due date badge */}
          <span className="relative inline-flex items-center flex-shrink-0">
            {due && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${
                  feature.done
                    ? 'bg-bg-secondary text-text-muted border-border-default line-through'
                    : isOverdue
                    ? 'bg-danger/15 text-danger border-danger/30'
                    : isDueSoon
                    ? 'bg-warning/15 text-warning border-warning/30'
                    : 'bg-bg-secondary text-text-muted border-border-default'
                }`}
                title={`Due: ${due.toLocaleDateString()}`}
              >
                {isOverdue ? `${Math.abs(daysUntil!)}d overdue` : daysUntil === 0 ? 'due today' : daysUntil === 1 ? 'due tomorrow' : `${daysUntil}d`}
              </span>
            )}
            <input
              type="date"
              value={feature.dueDate ?? ''}
              onChange={(e) => updateFeature(feature.id, { dueDate: e.target.value || undefined })}
              title={due ? `Due: ${due.toLocaleDateString()} — change due date` : 'Set due date'}
              className={`bg-transparent outline-none cursor-pointer text-[9px] transition-opacity ${
                due ? 'absolute inset-0 opacity-0 hover:opacity-100 focus:opacity-100 w-full' : 'opacity-0 group-hover:opacity-60 hover:opacity-100 focus:opacity-100 w-4'
              }`}
              style={{ colorScheme: 'dark' }}
            />
            {!due && (
              <span className="text-[9px] text-text-muted opacity-0 group-hover:opacity-60 pointer-events-none ml-0.5">due</span>
            )}
          </span>
          {/* Add start date (hover only, when no start date yet) */}
          {!feature.startDate && !feature.done && (
            <span className="relative inline-flex items-center flex-shrink-0">
              <span className="text-[9px] text-text-muted opacity-0 group-hover:opacity-40 pointer-events-none">start</span>
              <input
                type="date"
                value=""
                onChange={(e) => updateFeature(feature.id, { startDate: e.target.value || undefined })}
                title="Set start date"
                className="absolute inset-0 opacity-0 hover:opacity-100 focus:opacity-100 bg-transparent outline-none cursor-pointer text-[9px] w-full"
                style={{ colorScheme: 'dark' }}
              />
            </span>
          )}
          {/* Assignee */}
          {editingAssignee ? (
            <input
              autoFocus
              type="text"
              value={assigneeDraft}
              onChange={(e) => setAssigneeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { updateFeature(feature.id, { assignee: assigneeDraft.trim() || undefined }); setEditingAssignee(false); }
                if (e.key === 'Escape') setEditingAssignee(false);
              }}
              onBlur={() => { updateFeature(feature.id, { assignee: assigneeDraft.trim() || undefined }); setEditingAssignee(false); }}
              placeholder="name"
              className="text-[9px] bg-bg-tertiary border border-border-focus rounded-full px-1.5 py-0.5 outline-none text-text-primary placeholder:text-text-placeholder w-16 flex-shrink-0"
            />
          ) : feature.assignee ? (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-violet/10 text-violet border border-violet/25 cursor-pointer flex-shrink-0"
              onClick={() => { setAssigneeDraft(feature.assignee ?? ''); setEditingAssignee(true); }}
              title={`Assigned to ${feature.assignee} — click to change`}
            >
              @{feature.assignee}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); updateFeature(feature.id, { assignee: undefined }); }}
                className="text-violet/60 hover:text-danger transition-colors cursor-pointer"
                title="Unassign"
              >
                <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setAssigneeDraft(''); setEditingAssignee(true); }}
              className="text-[9px] text-text-muted opacity-0 group-hover:opacity-40 hover:opacity-100 hover:text-text-secondary transition-opacity cursor-pointer flex-shrink-0"
              title="Assign to someone"
            >
              + @
            </button>
          )}
          {/* Sprint */}
          {editingSprint ? (
            <input
              autoFocus
              type="text"
              value={sprintDraft}
              onChange={(e) => setSprintDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { updateFeature(feature.id, { sprint: sprintDraft.trim() || undefined }); setEditingSprint(false); }
                if (e.key === 'Escape') setEditingSprint(false);
              }}
              onBlur={() => { updateFeature(feature.id, { sprint: sprintDraft.trim() || undefined }); setEditingSprint(false); }}
              placeholder="Sprint 1"
              className="text-[9px] bg-bg-tertiary border border-border-focus rounded px-1.5 py-0.5 outline-none text-text-primary placeholder:text-text-placeholder w-16 flex-shrink-0"
            />
          ) : feature.sprint ? (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 cursor-pointer flex-shrink-0"
              onClick={() => { setSprintDraft(feature.sprint ?? ''); setEditingSprint(true); }}
              title={`Sprint: ${feature.sprint} — click to change`}
            >
              ⚡{feature.sprint}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); updateFeature(feature.id, { sprint: undefined }); }}
                className="text-cyan-400/60 hover:text-danger transition-colors cursor-pointer"
                title="Remove sprint"
              >
                <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setSprintDraft(''); setEditingSprint(true); }}
              className="text-[9px] text-text-muted opacity-0 group-hover:opacity-30 hover:opacity-80 hover:text-text-secondary transition-opacity cursor-pointer flex-shrink-0"
              title="Assign to sprint"
            >
              + sprint
            </button>
          )}
        </div>
        {/* URL inline editor */}
        {editingUrl && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="w-2.5 h-2.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <input
              autoFocus
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateFeature(feature.id, { url: urlDraft.trim() || undefined });
                  setEditingUrl(false);
                }
                if (e.key === 'Escape') setEditingUrl(false);
              }}
              onBlur={() => {
                updateFeature(feature.id, { url: urlDraft.trim() || undefined });
                setEditingUrl(false);
              }}
              placeholder="https://jira.example.com/browse/TICKET-123"
              className="flex-1 text-[10px] bg-bg-primary border border-border-focus rounded px-1.5 py-0.5 text-accent outline-none placeholder:text-text-placeholder"
            />
            {feature.url && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); updateFeature(feature.id, { url: undefined }); setEditingUrl(false); }}
                className="text-[9px] text-danger hover:text-danger/80 cursor-pointer flex-shrink-0"
                title="Remove link"
              >
                ×
              </button>
            )}
          </div>
        )}
        {/* Description - click to edit */}
        {editingDesc ? (
          <textarea
            ref={descRef}
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditingDesc(false);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveDesc();
            }}
            rows={2}
            placeholder="Add a description..."
            className="mt-1 w-full text-[10px] bg-bg-primary border border-border-focus rounded px-1.5 py-1 text-text-secondary outline-none resize-none placeholder:text-text-placeholder"
          />
        ) : (
          <button
            type="button"
            onClick={startEditDesc}
            className={`mt-0.5 text-left text-[10px] w-full cursor-text transition-colors ${
              feature.description
                ? 'text-text-muted hover:text-text-secondary truncate'
                : 'text-text-placeholder opacity-0 group-hover:opacity-60 hover:text-text-muted'
            }`}
          >
            {feature.description || 'Add description...'}
          </button>
        )}
        {/* Entity refs */}
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {linkedEntities.map((e) => (
            <span
              key={e.id}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${e.color}25`, color: e.color }}
            >
              {e.name}
            </span>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEntityPicker((v) => !v)}
              title="Link to entities"
              className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors opacity-0 group-hover:opacity-100 ${
                feature.entityRefs.length > 0
                  ? 'opacity-100 text-text-muted hover:text-text-secondary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {feature.entityRefs.length === 0 ? '+ entity' : '·'}
            </button>
            {showEntityPicker && entities.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEntityPicker(false)} />
                <div className="absolute bottom-full left-0 mb-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                  {entities.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { toggleEntityRef(e.id); setShowEntityPicker(false); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-bg-hover transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                      <span className={`text-xs flex-1 truncate ${feature.entityRefs.includes(e.id) ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        {e.name}
                      </span>
                      {feature.entityRefs.includes(e.id) && (
                        <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        {/* Tags */}
        {((feature.tags ?? []).length > 0 || addingTag) && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {(feature.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="group/tag inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border-default hover:border-border-active transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onTagClick?.(tag)}
                  className={`hover:text-accent transition-colors ${onTagClick ? 'cursor-pointer' : ''}`}
                  title={onTagClick ? `Filter by #${tag}` : undefined}
                >
                  #{tag}
                </button>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="opacity-0 group-hover/tag:opacity-100 transition-opacity text-text-muted hover:text-danger cursor-pointer"
                >
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {addingTag ? (
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTag();
                    if (e.key === 'Escape') { setTagDraft(''); setAddingTag(false); }
                    if (e.key === ' ') { e.preventDefault(); addTag(); }
                  }}
                  onBlur={() => setTimeout(addTag, 100)}
                  placeholder="tag-name"
                  className="text-[9px] bg-bg-tertiary border border-border-focus rounded-full px-1.5 py-0.5 outline-none text-text-primary placeholder:text-text-placeholder w-16"
                />
                {(() => {
                  const suggestions = tagDraft.trim()
                    ? allTags.filter((t) =>
                        t.includes(tagDraft.trim().toLowerCase()) &&
                        t !== tagDraft.trim().toLowerCase() &&
                        !(feature.tags ?? []).includes(t)
                      )
                    : allTags.filter((t) => !(feature.tags ?? []).includes(t));
                  return suggestions.length > 0 ? (
                    <div className="absolute top-full left-0 mt-1 z-30 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden min-w-[100px] max-h-32 overflow-y-auto">
                      {suggestions.slice(0, 8).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setTagDraft(s); setTimeout(() => { const t = s.trim().toLowerCase(); if (t && !(feature.tags ?? []).includes(t)) { updateFeature(feature.id, { tags: [...(feature.tags ?? []), t] }); } setTagDraft(''); setAddingTag(false); }, 0); }}
                          className="w-full text-left px-2 py-1 text-[9px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
                        >
                          #{s}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            ) : null}
          </div>
        )}
        {/* + tag button (only on group hover, hidden when already adding) */}
        {!addingTag && (
          <button
            type="button"
            onClick={() => setAddingTag(true)}
            className="mt-0.5 text-[9px] text-text-muted opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-text-secondary transition-opacity cursor-pointer"
          >
            + tag
          </button>
        )}
      </div>

      {/* Priority */}
      <select
        value={feature.priority}
        onChange={(e) => updateFeature(feature.id, { priority: e.target.value as Priority })}
        className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-1 text-text-secondary outline-none cursor-pointer mt-0.5"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_CONFIG[p].label}
          </option>
        ))}
      </select>

      {/* Estimate (story points) */}
      <select
        value={feature.estimate ?? ''}
        onChange={(e) => updateFeature(feature.id, { estimate: e.target.value as Estimate })}
        title="Story point estimate"
        className={`text-[10px] border border-border-default rounded px-1.5 py-1 outline-none cursor-pointer mt-0.5 text-center ${
          feature.estimate
            ? 'bg-accent-muted text-accent border-accent/30'
            : 'bg-bg-tertiary text-text-muted'
        }`}
      >
        <option value="">—</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="5">5</option>
        <option value="8">8</option>
        <option value="13">13</option>
        <option value="?">?</option>
      </select>

      {/* Value (business value score) */}
      <select
        value={feature.value ?? ''}
        onChange={(e) => updateFeature(feature.id, { value: e.target.value as Estimate })}
        title={(() => {
          const v = parseInt(feature.value ?? '', 10);
          const e = parseInt(feature.estimate ?? '', 10);
          const eff = !isNaN(v) && !isNaN(e) && e > 0 ? ` — Efficiency: ${(v / e).toFixed(1)}x` : '';
          return `Business value score${eff}`;
        })()}
        className={`text-[10px] border border-border-default rounded px-1.5 py-1 outline-none cursor-pointer mt-0.5 text-center ${
          feature.value
            ? 'bg-success/10 text-success border-success/30'
            : 'bg-bg-tertiary text-text-muted'
        }`}
      >
        <option value="">—</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="5">5</option>
        <option value="8">8</option>
        <option value="13">13</option>
        <option value="?">?</option>
      </select>

      {/* Milestone selector */}
      <select
        value={feature.milestone}
        onChange={(e) => updateFeature(feature.id, { milestone: e.target.value })}
        className="text-[10px] bg-bg-tertiary border border-border-default rounded px-1.5 py-1 text-text-secondary outline-none cursor-pointer"
      >
        <option value="">No milestone</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Pin button — always visible when pinned, hover-only when not */}
      <button
        type="button"
        title={feature.pinned ? 'Pinned — click to unpin' : 'Pin to top of group'}
        onClick={() => updateFeature(feature.id, { pinned: feature.pinned ? undefined : true })}
        className={`flex-shrink-0 transition-all cursor-pointer ${
          feature.pinned
            ? 'text-accent opacity-80 hover:opacity-100'
            : 'text-text-muted opacity-0 group-hover:opacity-40 hover:!opacity-80'
        }`}
      >
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill={feature.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 1.5L14.5 6.5L10 9.5L8.5 14.5L5.5 8.5L1.5 5.5L6.5 4L9.5 1.5Z" />
        </svg>
      </button>

      {/* Actions: copy / duplicate / delete */}
      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          onClick={() => {
            // Build rich Markdown card
            const status = feature.done ? '✅ Done' : feature.inProgress ? '🔄 In Progress' : '⬜ Todo';
            const lines: string[] = [];
            lines.push(`## ${feature.title}`);
            lines.push('');
            lines.push(`**Status:** ${status}  `);
            lines.push(`**Priority:** ${feature.priority}  `);
            if (feature.estimate) lines.push(`**Effort:** ${feature.estimate}pt  `);
            if (feature.value) lines.push(`**Value:** ${feature.value}  `);
            if (feature.dueDate) lines.push(`**Due:** ${feature.dueDate}  `);
            if (feature.startDate) lines.push(`**Start:** ${feature.startDate}  `);
            if (feature.url) lines.push(`**Link:** ${feature.url}  `);
            if (feature.assignee) lines.push(`**Assignee:** @${feature.assignee}  `);
            if (feature.sprint) lines.push(`**Sprint:** ${feature.sprint}  `);
            if ((feature.tags ?? []).length > 0) lines.push(`**Tags:** ${feature.tags!.map((t) => `#${t}`).join(' ')}  `);
            if (feature.description) {
              lines.push('');
              lines.push('### Description');
              lines.push(feature.description);
            }
            if (feature.notes?.trim()) {
              lines.push('');
              lines.push('### Acceptance Criteria');
              lines.push(feature.notes.trim());
            }
            const refNames = entities.filter((e) => feature.entityRefs.includes(e.id)).map((e) => e.name);
            if (refNames.length > 0) {
              lines.push('');
              lines.push(`**Entities:** ${refNames.join(', ')}`);
            }
            navigator.clipboard.writeText(lines.join('\n')).then(() => {
              setStoryCopied(true);
              setTimeout(() => setStoryCopied(false), 1500);
            });
          }}
          title="Copy as Markdown card (status, priority, estimate, description, notes)"
        >
          {storyCopied ? (
            <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10H5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-3M10 2h9a1 1 0 011 1v9a1 1 0 01-1 1h-9a1 1 0 01-1-1V3a1 1 0 011-1z" />
            </svg>
          )}
        </IconButton>
        <IconButton onClick={() => duplicateFeature(feature.id)} title="Duplicate feature">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </IconButton>
        <IconButton onClick={() => removeFeature(feature.id)} variant="danger">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>
    </div>

    {/* Notes / Acceptance criteria - expandable */}
    {(showNotes || feature.notes) && (
      <div className="px-10 pb-2">
        {showNotes ? (
          <textarea
            ref={notesRef}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              updateFeature(feature.id, { notes: notesDraft });
              if (!notesDraft.trim()) setShowNotes(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNotesDraft(feature.notes ?? '');
                setShowNotes(false);
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                updateFeature(feature.id, { notes: notesDraft });
                setShowNotes(false);
              }
            }}
            rows={3}
            placeholder="Acceptance criteria / notes... (Ctrl+Enter to save)"
            className="w-full text-[10px] font-mono bg-bg-primary border border-border-default rounded px-2 py-1.5 text-text-secondary outline-none focus:border-border-focus resize-y placeholder:text-text-placeholder"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setNotesDraft(feature.notes ?? ''); setShowNotes(true); }}
            className="text-left text-[10px] font-mono text-text-muted hover:text-text-secondary w-full transition-colors cursor-text whitespace-pre-wrap"
          >
            {feature.notes}
          </button>
        )}
      </div>
    )}
    {/* + notes button */}
    {!showNotes && !feature.notes && (
      <button
        type="button"
        onClick={() => { setNotesDraft(''); setShowNotes(true); }}
        className="ml-10 mb-1 text-[9px] text-text-muted opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-text-secondary transition-opacity cursor-pointer"
      >
        + notes
      </button>
    )}
    {/* Checklist */}
    {((feature.checklist ?? []).length > 0 || showChecklist) && (
      <div className="px-10 pb-2 space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] text-text-muted uppercase tracking-wider">Checklist</span>
          {(feature.checklist ?? []).length > 0 && (
            <span className="text-[9px] text-text-muted">
              {(feature.checklist ?? []).filter((c) => c.done).length}/{(feature.checklist ?? []).length}
            </span>
          )}
          {(feature.checklist ?? []).length > 0 && (
            <div className="flex-1 h-0.5 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-300"
                style={{ width: `${Math.round(((feature.checklist ?? []).filter((c) => c.done).length / (feature.checklist ?? []).length) * 100)}%` }}
              />
            </div>
          )}
        </div>
        {(feature.checklist ?? []).map((item) => (
          <div key={item.id} className="flex items-start gap-1.5 group/ci">
            <button
              type="button"
              onClick={() => toggleChecklistItem(feature.id, item.id)}
              className={`flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded border transition-colors cursor-pointer ${
                item.done ? 'bg-success border-success' : 'bg-transparent border-border-active hover:border-accent'
              }`}
              title={item.done ? 'Mark undone' : 'Mark done'}
            >
              {item.done && (
                <svg className="w-full h-full text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </button>
            {checklistInputId === item.id ? (
              <input
                autoFocus
                className="flex-1 text-[10px] bg-transparent border-b border-border-focus outline-none text-text-primary"
                defaultValue={item.text}
                onBlur={(e) => { updateChecklistItem(feature.id, item.id, e.target.value || item.text); setChecklistInputId(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { updateChecklistItem(feature.id, item.id, e.currentTarget.value || item.text); setChecklistInputId(null); }
                  if (e.key === 'Escape') setChecklistInputId(null);
                }}
              />
            ) : (
              <span
                className={`flex-1 text-[10px] cursor-text ${item.done ? 'line-through text-text-muted' : 'text-text-secondary'}`}
                onClick={() => setChecklistInputId(item.id)}
              >{item.text}</span>
            )}
            <button
              type="button"
              onClick={() => removeChecklistItem(feature.id, item.id)}
              className="opacity-0 group-hover/ci:opacity-100 text-text-muted hover:text-danger transition-opacity cursor-pointer flex-shrink-0"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {/* Add checklist item */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex-shrink-0 w-3.5 h-3.5 rounded border border-dashed border-border-active/50" />
          <input
            className="flex-1 text-[10px] bg-transparent border-b border-transparent focus:border-border-focus outline-none text-text-placeholder placeholder:text-text-placeholder"
            placeholder="Add a sub-task…"
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newChecklistText.trim()) {
                addChecklistItem(feature.id, newChecklistText.trim());
                setNewChecklistText('');
              }
              if (e.key === 'Escape') { setNewChecklistText(''); setShowChecklist(false); }
            }}
            onBlur={() => { if (!newChecklistText.trim()) setShowChecklist(false); }}
          />
        </div>
      </div>
    )}
    {/* + checklist button */}
    {(feature.checklist ?? []).length === 0 && !showChecklist && (
      <button
        type="button"
        onClick={() => setShowChecklist(true)}
        className="ml-10 mb-1 text-[9px] text-text-muted opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-text-secondary transition-opacity cursor-pointer"
      >
        + checklist
      </button>
    )}
    {/* Blockers section */}
    {(allBlockerFeatures.length > 0 || showBlockerPicker) && (
      <div className="px-10 pb-2 flex items-center flex-wrap gap-1">
        <span className="text-[9px] text-text-muted mr-0.5">blocked by:</span>
        {allBlockerFeatures.map((blocker) => (
          <span
            key={blocker.id}
            className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border ${
              blocker.done
                ? 'bg-success/10 text-success/60 border-success/20 line-through'
                : 'bg-danger/10 text-danger border-danger/25'
            }`}
          >
            {blocker.title.length > 24 ? blocker.title.slice(0, 24) + '…' : blocker.title}
            <button
              type="button"
              onClick={() => toggleBlocker(blocker.id)}
              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              title="Remove blocker"
            >
              <svg className="w-2 h-2" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBlockerPicker((v) => !v)}
            className="text-[9px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer px-1 py-0.5"
            title="Add blocker"
          >
            + blocker
          </button>
          {showBlockerPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowBlockerPicker(false)} />
              <div className="absolute bottom-full left-0 mb-1 z-20 bg-bg-secondary border border-border-default rounded-lg shadow-xl overflow-hidden min-w-[180px] max-h-40 overflow-y-auto">
                {allFeatures
                  .filter((f) => f.id !== feature.id)
                  .map((f) => {
                    const isLinked = (feature.blockedBy ?? []).includes(f.id);
                    const isCycle = !isLinked && wouldCreateCycle(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { if (!isCycle) { toggleBlocker(f.id); setShowBlockerPicker(false); } }}
                        disabled={isCycle}
                        title={isCycle ? 'Would create a circular dependency' : undefined}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                          isCycle ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg-hover cursor-pointer'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.done ? 'bg-success' : f.inProgress ? 'bg-warning' : 'bg-text-muted'}`} />
                        <span className={`text-xs flex-1 truncate ${isLinked ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                          {f.title || '(untitled)'}
                        </span>
                        {isLinked && (
                          <svg className="w-3 h-3 text-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {isCycle && (
                          <span className="text-[9px] text-danger flex-shrink-0">cycle</span>
                        )}
                      </button>
                    );
                  })}
                {allFeatures.filter((f) => f.id !== feature.id).length === 0 && (
                  <div className="px-3 py-2 text-[10px] text-text-muted">No other features</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )}
    {/* + blocker button (only on hover, when none yet) */}
    {allBlockerFeatures.length === 0 && !showBlockerPicker && (
      <button
        type="button"
        onClick={() => setShowBlockerPicker(true)}
        className="ml-10 mb-1 text-[9px] text-text-muted opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-text-secondary transition-opacity cursor-pointer"
      >
        + blocker
      </button>
    )}
    </div>
  );
}
