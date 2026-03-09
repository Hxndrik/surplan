import { useProjectStore } from '../../store/useProjectStore';
import { useEntityStore } from '../../store/useEntityStore';
import { exportFeaturesCSV } from '../../lib/backup';
import { FeatureItem } from './FeatureItem';
import { EmptyState } from '../shared/EmptyState';
import { InlineEdit } from '../shared/InlineEdit';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PRIORITIES, PRIORITY_CONFIG } from '../../lib/constants';
import type { Priority } from '../../types';

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  'nice-to-have': '#71717a',
};
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function FeatureList() {
  const features = useProjectStore((s) => s.features);
  const milestones = useProjectStore((s) => s.milestones);
  const addFeature = useProjectStore((s) => s.addFeature);
  const updateFeature = useProjectStore((s) => s.updateFeature);
  const removeFeature = useProjectStore((s) => s.removeFeature);
  const addMilestone = useProjectStore((s) => s.addMilestone);
  const updateMilestone = useProjectStore((s) => s.updateMilestone);
  const removeMilestone = useProjectStore((s) => s.removeMilestone);
  const reorderFeatures = useProjectStore((s) => s.reorderFeatures);
  const entities = useEntityStore((s) => s.entities);

  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [filterPriority, setFilterPriority] = useState<'' | Priority>('');
  const [filterTag, setFilterTag] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterMilestone, setFilterMilestone] = useState('');
  const [filterBlocked, setFilterBlocked] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterSprint, setFilterSprint] = useState('');
  const [filterHideDone, setFilterHideDone] = useState(false);
  const [filterQuickWins, setFilterQuickWins] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'priority' | 'status' | 'estimate' | 'due' | 'start' | 'value' | 'efficiency' | 'cycle' | 'assignee'>('default');
  const [groupBy, setGroupBy] = useState<'milestone' | 'priority' | 'status' | 'entity' | 'assignee' | 'tag' | 'kind' | 'sprint'>('milestone');
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'board' | 'deps' | 'retro'>('list');
  const [timelineGranularity, setTimelineGranularity] = useState<'months' | 'weeks'>('months');
  const [focusMode, setFocusMode] = useState(false);
  const [wipLimit, setWipLimit] = useState<number | null>(null);
  const [copiedBoardCol, setCopiedBoardCol] = useState<string | null>(null);
  const [boardDraggingId, setBoardDraggingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener('surplan:focus-search', handler);
    return () => window.removeEventListener('surplan:focus-search', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const title = (e as CustomEvent<string>).detail;
      if (title) {
        setSearch(title);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    };
    window.addEventListener('surplan:search-feature', handler);
    return () => window.removeEventListener('surplan:search-feature', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent<string>).detail as typeof groupBy;
      if (mode === 'milestone' || mode === 'priority' || mode === 'status' || mode === 'entity' || mode === 'assignee' || mode === 'tag' || mode === 'kind' || mode === 'sprint') {
        setGroupBy(mode);
      }
    };
    window.addEventListener('surplan:group-features', handler);
    return () => window.removeEventListener('surplan:group-features', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent<string>).detail;
      const valid = ['default', 'priority', 'status', 'estimate', 'due', 'start', 'value', 'efficiency', 'cycle', 'assignee'] as const;
      if (valid.includes(mode as typeof valid[number])) {
        setSortBy(mode as typeof sortBy);
      }
    };
    window.addEventListener('surplan:sort-features', handler);
    return () => window.removeEventListener('surplan:sort-features', handler);
  }, []);

  useEffect(() => {
    const handler = () => setViewMode((v) => v === 'list' ? 'timeline' : 'list');
    window.addEventListener('surplan:toggle-timeline', handler);
    return () => window.removeEventListener('surplan:toggle-timeline', handler);
  }, []);

  useEffect(() => {
    const handler = () => setViewMode((v) => v === 'board' ? 'list' : 'board');
    window.addEventListener('surplan:toggle-board', handler);
    return () => window.removeEventListener('surplan:toggle-board', handler);
  }, []);

  useEffect(() => {
    const handler = () => setViewMode((v) => v === 'retro' ? 'list' : 'retro');
    window.addEventListener('surplan:toggle-retro', handler);
    return () => window.removeEventListener('surplan:toggle-retro', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setSearch(''); setFilterStatus('all'); setFilterPriority(''); setFilterTag('');
      setFilterEntity(''); setFilterMilestone(''); setSortBy('default');
      setFilterBlocked(false); setFilterOverdue(false); setFilterHideDone(false); setFilterQuickWins(false);
      setGroupBy('milestone'); setFilterAssignee('');
    };
    window.addEventListener('surplan:reset-filters', handler);
    return () => window.removeEventListener('surplan:reset-filters', handler);
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState('');
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');
  const csvImportRef = useRef<HTMLInputElement>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showOverflow) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOverflow]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const done = features.filter((f) => f.done).length;
  const inProgressCount = features.filter((f) => f.inProgress && !f.done).length;
  const total = features.length;
  const blockedCount = features.filter((f) =>
    !f.done && (f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done))
  ).length;
  const nowMs = new Date().setHours(0, 0, 0, 0);
  const overdueCount = features.filter((f) => {
    if (f.done || !f.dueDate) return false;
    return new Date(f.dueDate).getTime() < nowMs;
  }).length;
  const quickWinsCount = features.filter((f) => {
    if (f.done) return false;
    const v = parseInt(f.value ?? '', 10);
    const e = parseInt(f.estimate ?? '', 10);
    return !isNaN(v) && !isNaN(e) && e <= 5 && v > 5;
  }).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalPoints = features.reduce((sum, f) => {
    const n = parseInt(f.estimate ?? '', 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const donePoints = features.filter((f) => f.done).reduce((sum, f) => {
    const n = parseInt(f.estimate ?? '', 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const hasFilters = filterStatus !== 'all' || filterPriority !== '' || filterTag !== '' || filterEntity !== '' || filterMilestone !== '' || sortBy !== 'default' || search.trim() !== '' || filterBlocked || filterOverdue || filterHideDone || filterQuickWins || groupBy !== 'milestone' || filterAssignee !== '' || filterSprint !== '';

  // Collect unique tags across all features for the tag filter bar
  const allTags = useMemo(() => {
    const set = new Set<string>();
    features.forEach((f) => (f.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [features]);

  // Collect unique assignees
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    features.forEach((f) => { if (f.assignee) set.add(f.assignee); });
    return Array.from(set).sort();
  }, [features]);

  const PRIORITY_ORDER: Record<Priority, number> = {
    critical: 0, high: 1, medium: 2, low: 3, 'nice-to-have': 4,
  };

  const filtered = useMemo(() => {
    const arr = features.filter((f) => {
      if (filterStatus === 'todo' && (f.done || f.inProgress)) return false;
      if (filterStatus === 'in-progress' && (!f.inProgress || f.done)) return false;
      if (filterStatus === 'done' && !f.done) return false;
      if (filterPriority && f.priority !== filterPriority) return false;
      if (filterTag && !(f.tags ?? []).includes(filterTag)) return false;
      if (filterEntity && !f.entityRefs.includes(filterEntity)) return false;
      if (filterMilestone !== '') {
        if (filterMilestone === '__backlog__' ? f.milestone !== '' : f.milestone !== filterMilestone) return false;
      }
      if (filterBlocked) {
        const isBlocked = !f.done && (f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done));
        if (!isBlocked) return false;
      }
      if (filterOverdue) {
        if (f.done || !f.dueDate || new Date(f.dueDate).getTime() >= nowMs) return false;
      }
      if (filterHideDone && f.done) return false;
      if (filterQuickWins) {
        const v = parseInt(f.value ?? '', 10);
        const e = parseInt(f.estimate ?? '', 10);
        if (f.done || isNaN(v) || isNaN(e) || e > 5 || v <= 5) return false;
      }
      if (filterAssignee && f.assignee !== filterAssignee) return false;
      if (filterSprint && (f.sprint ?? '') !== filterSprint) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        // Advanced search tokens
        if (q === 'is:blocked') {
          const isBlocked = !f.done && (f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done));
          if (!isBlocked) return false;
        } else if (q === 'is:blocking') {
          const isBlocking = !f.done && features.some((other) => !other.done && (other.blockedBy ?? []).includes(f.id));
          if (!isBlocking) return false;
        } else if (q === 'is:overdue') {
          if (f.done || !f.dueDate || new Date(f.dueDate).getTime() >= nowMs) return false;
        } else if (q === 'is:done') {
          if (!f.done) return false;
        } else if (q === 'is:todo') {
          if (f.done || f.inProgress) return false;
        } else if (q === 'is:active' || q === 'is:in-progress') {
          if (!f.inProgress || f.done) return false;
        } else if (q === 'has:notes') {
          if (!f.notes?.trim()) return false;
        } else if (q === 'has:estimate') {
          if (!f.estimate || f.estimate === '?') return false;
        } else if (q === 'has:due') {
          if (!f.dueDate) return false;
        } else if (q === 'has:url') {
          if (!f.url) return false;
        } else if (q === 'has:checklist') {
          if (!f.checklist?.length) return false;
        } else if (q === 'no:checklist') {
          if (f.checklist?.length) return false;
        } else if (q === 'is:quickwin' || q === 'is:quick-win') {
          const v = parseInt(f.value ?? '', 10);
          const e = parseInt(f.estimate ?? '', 10);
          if (f.done || isNaN(v) || isNaN(e) || e > 5 || v <= 5) return false;
        } else if (q === 'has:value') {
          if (!f.value || f.value === '?') return false;
        } else if (q === 'has:start' || q === 'has:startdate') {
          if (!f.startDate) return false;
        } else if (q === 'is:unestimated' || q === 'no:estimate') {
          if (f.estimate && f.estimate !== '?') return false;
        } else if (q.startsWith('est:') || q.startsWith('e:')) {
          const eVal = q.startsWith('e:') ? q.slice(2) : q.slice(4);
          const featureEst = parseInt(f.estimate ?? '', 10);
          if (eVal.startsWith('>=')) { const n = parseInt(eVal.slice(2), 10); if (isNaN(n) || isNaN(featureEst) || featureEst < n) return false; }
          else if (eVal.startsWith('<=')) { const n = parseInt(eVal.slice(2), 10); if (isNaN(n) || isNaN(featureEst) || featureEst > n) return false; }
          else if (eVal.startsWith('>')) { const n = parseInt(eVal.slice(1), 10); if (isNaN(n) || isNaN(featureEst) || featureEst <= n) return false; }
          else if (eVal.startsWith('<')) { const n = parseInt(eVal.slice(1), 10); if (isNaN(n) || isNaN(featureEst) || featureEst >= n) return false; }
          else if ((f.estimate ?? '') !== eVal) return false;
        } else if (q.startsWith('val:') || q.startsWith('v:')) {
          const vVal = q.startsWith('v:') ? q.slice(2) : q.slice(4);
          const featureVal = parseInt(f.value ?? '', 10);
          if (vVal.startsWith('>=')) { const n = parseInt(vVal.slice(2), 10); if (isNaN(n) || isNaN(featureVal) || featureVal < n) return false; }
          else if (vVal.startsWith('<=')) { const n = parseInt(vVal.slice(2), 10); if (isNaN(n) || isNaN(featureVal) || featureVal > n) return false; }
          else if (vVal.startsWith('>')) { const n = parseInt(vVal.slice(1), 10); if (isNaN(n) || isNaN(featureVal) || featureVal <= n) return false; }
          else if (vVal.startsWith('<')) { const n = parseInt(vVal.slice(1), 10); if (isNaN(n) || isNaN(featureVal) || featureVal >= n) return false; }
          else if ((f.value ?? '') !== vVal) return false;
        } else if (q.startsWith('p:')) {
          const pVal = q.slice(2);
          if (!f.priority.startsWith(pVal)) return false;
        } else if (q.startsWith('#') || q.startsWith('tag:')) {
          const tq = q.startsWith('tag:') ? q.slice(4) : q.slice(1);
          if (!(f.tags ?? []).some((t) => t.includes(tq))) return false;
        } else if (q.startsWith('notes:') || q.startsWith('note:')) {
          const nq = q.replace(/^notes?:/, '');
          if (!f.notes?.toLowerCase().includes(nq)) return false;
        } else if (q.startsWith('m:') || q.startsWith('milestone:')) {
          const mq = q.replace(/^(milestones?|m):/, '');
          const ms = milestones.find((m) => f.milestone === m.id);
          if (!ms?.name.toLowerCase().includes(mq)) return false;
        } else if (q === 'has:cycletime' || q === 'has:cycle') {
          if (!f.startDate || !f.completedAt) return false;
        } else if (q === 'has:assignee' || q === 'is:assigned') {
          if (!f.assignee) return false;
        } else if (q === 'no:milestone' || q === 'is:backlog') {
          if (f.milestone) return false;
        } else if (q === 'has:milestone') {
          if (!f.milestone) return false;
        } else if (q === 'is:pinned' || q === 'has:pin') {
          if (!f.pinned) return false;
        } else if (q === 'is:bug' || q === 'type:bug') {
          if (f.kind !== 'bug') return false;
        } else if (q === 'is:improvement' || q === 'type:improvement') {
          if (f.kind !== 'improvement') return false;
        } else if (q === 'is:chore' || q === 'type:chore') {
          if (f.kind !== 'chore') return false;
        } else if (q === 'is:feature' || q === 'type:feature') {
          if (f.kind && f.kind !== 'feature') return false;
        } else if (q === 'no:assignee' || q === 'is:unassigned') {
          if (f.assignee) return false;
        } else if (q === 'no:notes' || q === 'is:nodescription') {
          if (f.notes?.trim()) return false;
        } else if (q === 'no:sprint' || q === 'is:unscheduled') {
          if (f.sprint) return false;
        } else if (q === 'has:sprint') {
          if (!f.sprint) return false;
        } else if (q.startsWith('sprint:') || q.startsWith('s:')) {
          const sq = q.startsWith('s:') ? q.slice(2) : q.slice(7);
          if (!(f.sprint ?? '').toLowerCase().includes(sq)) return false;
        } else if (q.startsWith('@')) {
          const aq = q.slice(1);
          if (!f.assignee?.toLowerCase().includes(aq)) return false;
        } else if (q === 'completed:yesterday') {
          const yesterday = new Date(nowMs - 86400000).toISOString().slice(0, 10);
          if (f.completedAt !== yesterday) return false;
        } else if (q === 'completed:today') {
          const today = new Date().toISOString().slice(0, 10);
          if (f.completedAt !== today) return false;
        } else if (q === 'completed:this-week') {
          if (!f.completedAt) return false;
          const weekAgo = new Date(nowMs - 7 * 86400000).toISOString().slice(0, 10);
          if (f.completedAt < weekAgo) return false;
        } else if (q === 'completed:this-month') {
          if (!f.completedAt) return false;
          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
          if (f.completedAt < monthStart) return false;
        } else if (q === 'is:stale') {
          // In-progress for >14 days without completion
          if (f.done || !f.inProgress || !f.startDate) return false;
          const daysInProgress = Math.round((nowMs - new Date(f.startDate).getTime()) / 86400000);
          if (daysInProgress < 14) return false;
        } else if (q === 'is:fullspec' || q === 'spec:complete') {
          // Features with all important fields filled
          if (!f.title?.trim() || !f.notes?.trim() || !f.estimate || f.estimate === '?' || !f.milestone || !f.assignee?.trim()) return false;
        } else if (q === 'is:underspec' || q === 'spec:low') {
          // Features missing most key fields (spec score < 50)
          const specScore = [
            !!f.title?.trim(), !!f.description?.trim(), !!f.notes?.trim(),
            !!f.estimate && f.estimate !== '?', !!f.milestone, !!f.assignee?.trim(),
          ].filter(Boolean).length;
          if (specScore >= 3) return false;
        } else {
          if (
            !f.title.toLowerCase().includes(q) &&
            !f.description.toLowerCase().includes(q) &&
            !f.notes?.toLowerCase().includes(q)
          ) return false;
        }
      }
      return true;
    });
    // Pinned features always float to top — apply a stable secondary comparator
    const pinnedFirst = (a: typeof arr[0], b: typeof arr[0]) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    if (sortBy === 'priority') {
      return [...arr].sort((a, b) => pinnedFirst(a, b) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    }
    if (sortBy === 'status') {
      const statusOrder = (f: typeof arr[0]) => f.done ? 2 : f.inProgress ? 1 : 0;
      return [...arr].sort((a, b) => pinnedFirst(a, b) || statusOrder(a) - statusOrder(b));
    }
    if (sortBy === 'estimate') {
      const toNum = (e: string) => { const n = parseInt(e, 10); return isNaN(n) ? Infinity : n; };
      return [...arr].sort((a, b) => pinnedFirst(a, b) || toNum(a.estimate ?? '') - toNum(b.estimate ?? ''));
    }
    if (sortBy === 'due') {
      const toDue = (f: typeof arr[0]) => f.dueDate ? new Date(f.dueDate).getTime() : Infinity;
      return [...arr].sort((a, b) => pinnedFirst(a, b) || toDue(a) - toDue(b));
    }
    if (sortBy === 'start') {
      const toStart = (f: typeof arr[0]) => f.startDate ? new Date(f.startDate).getTime() : Infinity;
      return [...arr].sort((a, b) => pinnedFirst(a, b) || toStart(a) - toStart(b));
    }
    if (sortBy === 'value') {
      const toVal = (e: string | undefined) => { const n = parseInt(e ?? '', 10); return isNaN(n) ? -Infinity : n; };
      return [...arr].sort((a, b) => pinnedFirst(a, b) || toVal(b.value) - toVal(a.value)); // descending (highest value first)
    }
    if (sortBy === 'cycle') {
      // Sort by cycle time ascending (fastest first) — features without cycle time go last
      const toCycle = (f: typeof arr[0]) => {
        if (!f.startDate || !f.completedAt) return Infinity;
        return Math.round((new Date(f.completedAt).getTime() - new Date(f.startDate).getTime()) / 86400000);
      };
      return [...arr].sort((a, b) => pinnedFirst(a, b) || toCycle(a) - toCycle(b));
    }
    if (sortBy === 'efficiency') {
      // value ÷ effort ratio descending — features with no scores go last
      const toN = (e: string | undefined) => { const n = parseInt(e ?? '', 10); return isNaN(n) ? null : n; };
      const ratio = (f: typeof arr[0]) => {
        const v = toN(f.value); const e = toN(f.estimate);
        if (v === null || e === null || e === 0) return -Infinity;
        return v / e;
      };
      return [...arr].sort((a, b) => pinnedFirst(a, b) || ratio(b) - ratio(a));
    }
    if (sortBy === 'assignee') {
      return [...arr].sort((a, b) => {
        const aa = a.assignee ?? '\uffff'; // unassigned last
        const ba = b.assignee ?? '\uffff';
        return pinnedFirst(a, b) || aa.localeCompare(ba);
      });
    }
    // Default sort: pinned features float to top
    return [...arr].sort(pinnedFirst);
  }, [features, filterStatus, filterPriority, filterTag, filterEntity, filterMilestone, filterBlocked, filterOverdue, filterHideDone, filterQuickWins, filterAssignee, filterSprint, nowMs, search, sortBy, milestones]);

  // Focus mode: show in-progress features + top unblocked undone (up to 8 total)
  const PRIORITY_ORDER_FL: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3, 'nice-to-have': 4 };
  const focusFiltered = useMemo(() => {
    if (!focusMode) return filtered;
    const inProgress = filtered.filter((f) => f.inProgress && !f.done);
    const unblocked = filtered
      .filter((f) => {
        if (f.done || f.inProgress) return false;
        return !(f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done));
      })
      .sort((a, b) => PRIORITY_ORDER_FL[a.priority] - PRIORITY_ORDER_FL[b.priority]);
    const combined = [...inProgress];
    for (const f of unblocked) {
      if (combined.length >= 8) break;
      combined.push(f);
    }
    return combined;
  }, [focusMode, filtered, features]);

  const handleAddMilestone = () => {
    const name = milestoneDraft.trim();
    if (name) addMilestone(name);
    setMilestoneDraft('');
    setAddingMilestone(false);
  };

  const handleAddInGroup = (groupId: string) => {
    const name = groupDraft.trim();
    if (name) {
      if (groupId.startsWith('__priority__')) {
        const priority = groupId.replace('__priority__', '') as Priority;
        addFeature(name, '', priority);
      } else if (groupId.startsWith('__status__') || groupId.startsWith('__entity__')) {
        addFeature(name, '');
      } else {
        addFeature(name, groupId);
      }
    }
    setGroupDraft('');
    setAddingInGroup(null);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const bulkMarkDone = (done: boolean) => {
    selectedIds.forEach((id) => updateFeature(id, { done, inProgress: false }));
    exitSelectionMode();
  };

  const bulkDelete = () => {
    selectedIds.forEach((id) => removeFeature(id));
    exitSelectionMode();
  };

  const bulkChangePriority = (priority: Priority) => {
    selectedIds.forEach((id) => updateFeature(id, { priority }));
    exitSelectionMode();
  };

  const importFromCsv = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return 0;
    const headerLine = lines[0];
    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === ',' && !inQuote) {
          result.push(cur.trim()); cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    };
    const headers = parseRow(headerLine).map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    const titleIdx = headers.findIndex((h) => h.includes('title') || h === 'name' || h === 'feature');
    if (titleIdx === -1) return 0;
    const descIdx = headers.findIndex((h) => h.includes('desc'));
    const priorityIdx = headers.findIndex((h) => h.includes('priority') || h === 'prio');
    const estimateIdx = headers.findIndex((h) => h.includes('estimate') || h === 'pts' || h === 'points' || h === 'effort');
    const milestoneIdx = headers.findIndex((h) => h.includes('milestone') || h === 'sprint');
    const tagsIdx = headers.findIndex((h) => h.includes('tag'));
    const PRIORITY_MAP: Record<string, Priority> = {
      critical: 'critical', high: 'high', medium: 'medium', low: 'low',
      'nice-to-have': 'nice-to-have', nicetohave: 'nice-to-have',
      p0: 'critical', p1: 'high', p2: 'medium', p3: 'low', p4: 'nice-to-have',
    };
    const ESTIMATE_VALS = new Set(['1','2','3','5','8','13','?','']);
    let added = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const title = cols[titleIdx]?.replace(/^"|"$/g, '') ?? '';
      if (!title) continue;
      const desc = descIdx >= 0 ? (cols[descIdx] ?? '') : '';
      const priorityRaw = priorityIdx >= 0 ? cols[priorityIdx]?.toLowerCase().trim() : '';
      const priority: Priority = (priorityRaw && PRIORITY_MAP[priorityRaw]) || 'medium';
      const estimateRaw = estimateIdx >= 0 ? cols[estimateIdx]?.trim() : '';
      const estimate = ESTIMATE_VALS.has(estimateRaw ?? '') ? (estimateRaw as import('../../types').Estimate) : '';
      const milestoneRaw = milestoneIdx >= 0 ? cols[milestoneIdx]?.trim() : '';
      let milestoneId = '';
      if (milestoneRaw) {
        const found = milestones.find((m) => m.name.toLowerCase() === milestoneRaw.toLowerCase());
        milestoneId = found?.id ?? '';
      }
      const tagsRaw = tagsIdx >= 0 ? cols[tagsIdx]?.trim() : '';
      addFeature(title, milestoneId, priority);
      // Update additional fields via updateFeature after adding
      const newFeature = useProjectStore.getState().features.at(-1);
      if (newFeature) {
        const extra: Partial<Omit<import('../../types').Feature, 'id'>> = {};
        if (desc) extra.description = desc;
        if (estimate) extra.estimate = estimate;
        if (tagsRaw) extra.tags = tagsRaw.split(/[;|]/).map((t) => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
        if (Object.keys(extra).length > 0) updateFeature(newFeature.id, extra);
      }
      added++;
    }
    return added;
  };

  const [bulkTagDraft, setBulkTagDraft] = useState('');
  const [bulkAssigneeDraft, setBulkAssigneeDraft] = useState('');
  const [mdCopied, setMdCopied] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [copiedAllMd, setCopiedAllMd] = useState(false);

  const copyGroupAsMd = (g: typeof groups[0]) => {
    const lines: string[] = [`### ${g.label}`];
    g.features.forEach((f) => {
      const check = f.done ? '[x]' : f.inProgress ? '[-]' : '[ ]';
      const pts = f.estimate ? ` (${f.estimate}pt)` : '';
      lines.push(`- ${check} **${f.title}**${pts}`);
      if (f.description) lines.push(`  > ${f.description}`);
    });
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedGroupId(g.milestoneId);
      setTimeout(() => setCopiedGroupId(null), 1500);
    });
  };
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (milestoneId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);
      return next;
    });
  };
  const copyFilteredAsMd = () => {
    const lines: string[] = [];
    groups.forEach((g) => {
      if (g.features.length === 0) return;
      lines.push(`### ${g.label}`);
      g.features.forEach((f) => {
        const check = f.done ? '[x]' : f.inProgress ? '[-]' : '[ ]';
        const pts = f.estimate ? ` (${f.estimate}pt)` : '';
        lines.push(`- ${check} **${f.title}**${pts}`);
        if (f.description) lines.push(`  > ${f.description}`);
      });
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n').trim()).then(() => {
      setMdCopied(true);
      setTimeout(() => setMdCopied(false), 1500);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortBy !== 'default' || groupBy !== 'milestone') return; // drag-reorder disabled when sorted/grouped
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderFeatures(active.id as string, over.id as string);
    }
  };

  // Use focusFiltered for rendering (focus mode or normal)
  const displayFeatures = focusFiltered;

  // Group features
  const groups: { milestoneId: string; label: string; color: string; dueDate?: string; description?: string; features: typeof features }[] =
    groupBy === 'priority'
      ? (['critical', 'high', 'medium', 'low', 'nice-to-have'] as Priority[])
          .map((p) => ({
            milestoneId: `__priority__${p}`,
            label: PRIORITY_CONFIG[p].label,
            color: PRIORITY_COLORS[p],
            features: displayFeatures.filter((f) => f.priority === p),
          }))
          .filter((g) => g.features.length > 0)
      : groupBy === 'status'
      ? [
          { milestoneId: '__status__todo', label: 'To Do', color: '#64748b', features: displayFeatures.filter((f) => !f.done && !f.inProgress) },
          { milestoneId: '__status__active', label: 'In Progress', color: '#f59e0b', features: displayFeatures.filter((f) => f.inProgress && !f.done) },
          { milestoneId: '__status__done', label: 'Done', color: '#10b981', features: displayFeatures.filter((f) => f.done) },
        ].filter((g) => g.features.length > 0)
      : groupBy === 'entity'
      ? [
          ...entities.map((e) => ({
            milestoneId: `__entity__${e.id}`,
            label: e.name,
            color: e.color,
            features: displayFeatures.filter((f) => f.entityRefs.includes(e.id)),
          })).filter((g) => g.features.length > 0),
          {
            milestoneId: '__entity__none',
            label: 'No Entity',
            color: '#64748b',
            features: displayFeatures.filter((f) => f.entityRefs.length === 0),
          },
        ].filter((g) => g.features.length > 0)
      : groupBy === 'assignee'
      ? [
          ...allAssignees.map((a) => ({
            milestoneId: `__assignee__${a}`,
            label: `@${a}`,
            color: '#8b5cf6',
            features: displayFeatures.filter((f) => f.assignee === a),
          })).filter((g) => g.features.length > 0),
          {
            milestoneId: '__assignee__none',
            label: 'Unassigned',
            color: '#64748b',
            features: displayFeatures.filter((f) => !f.assignee),
          },
        ].filter((g) => g.features.length > 0)
      : groupBy === 'tag'
      ? (() => {
          const allTagsUsed = [...new Set(displayFeatures.flatMap((f) => f.tags ?? []))].sort();
          return [
            ...allTagsUsed.map((t) => ({
              milestoneId: `__tag__${t}`,
              label: `#${t}`,
              color: '#06b6d4',
              features: displayFeatures.filter((f) => (f.tags ?? []).includes(t)),
            })),
            {
              milestoneId: '__tag__none',
              label: 'No Tag',
              color: '#64748b',
              features: displayFeatures.filter((f) => !(f.tags ?? []).length),
            },
          ].filter((g) => g.features.length > 0);
        })()
      : groupBy === 'kind'
      ? (['feature', 'bug', 'improvement', 'chore'] as const).map((k) => ({
          milestoneId: `__kind__${k}`,
          label: k === 'feature' ? 'Features' : k === 'bug' ? 'Bugs' : k === 'improvement' ? 'Improvements' : 'Chores',
          color: k === 'feature' ? '#6366f1' : k === 'bug' ? '#ef4444' : k === 'improvement' ? '#10b981' : '#64748b',
          features: displayFeatures.filter((f) => (f.kind ?? 'feature') === k),
        })).filter((g) => g.features.length > 0)
      : groupBy === 'sprint'
      ? (() => {
          const sprints = [...new Set(displayFeatures.map((f) => f.sprint ?? ''))].sort((a, b) => {
            if (!a) return 1;
            if (!b) return -1;
            return a.localeCompare(b, undefined, { numeric: true });
          });
          return sprints.map((s) => ({
            milestoneId: `__sprint__${s}`,
            label: s || 'No Sprint',
            color: s ? '#06b6d4' : '#64748b',
            features: displayFeatures.filter((f) => (f.sprint ?? '') === s),
          })).filter((g) => g.features.length > 0);
        })()
      : [
          ...milestones.map((m) => ({
            milestoneId: m.id,
            label: m.name,
            color: m.color,
            dueDate: m.dueDate,
            description: m.description || undefined,
            features: displayFeatures.filter((f) => f.milestone === m.id),
          })),
          {
            milestoneId: '',
            label: 'Backlog',
            color: '#64748b',
            features: displayFeatures.filter((f) => !f.milestone),
          },
        ];

  if (features.length === 0 && milestones.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
        title="No features yet"
        description="Start mapping out the features your software needs."
        action={{ label: 'Add First Feature', onClick: () => addFeature('New feature') }}
      />
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            title="Search features — supports: is:blocked, is:blocking, is:overdue, is:stale, is:done, is:active, is:unestimated, is:quickwin, is:fullspec, is:underspec, has:notes, has:estimate, has:due, has:url, has:value, has:start, has:cycletime, p:priority, #tag, tag:name, notes:keyword, m:milestone, est:N (e.g. est:5), est:>5, est:<=8, val:N (e.g. val:8), val:>5, val:<=10, completed:today, completed:this-week, completed:this-month, @assignee"
            className="w-full text-xs bg-bg-secondary border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filtered count */}
        {hasFilters && (
          <span className="text-[10px] text-text-muted flex-shrink-0 px-1">
            <span className="text-text-primary font-medium">{filtered.length}</span>
            <span className="opacity-70"> / {total}</span>
          </span>
        )}

        {/* Status filter pills */}
        <div className="flex gap-1">
          {([
            { id: 'all', label: `All (${total})` },
            { id: 'todo', label: `Todo (${total - done - inProgressCount})` },
            { id: 'in-progress', label: `Active (${inProgressCount})` },
            { id: 'done', label: `Done (${done})` },
          ] as const).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFilterStatus(s.id)}
              className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors ${
                filterStatus === s.id
                  ? s.id === 'in-progress'
                    ? 'bg-warning text-black'
                    : 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-secondary bg-bg-secondary border border-border-default'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Blocked filter pill */}
        {blockedCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterBlocked((v) => !v)}
            className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors border ${
              filterBlocked
                ? 'bg-danger/20 text-danger border-danger/40'
                : 'text-text-muted hover:text-text-secondary bg-bg-secondary border-border-default'
            }`}
          >
            ⛔ Blocked ({blockedCount})
          </button>
        )}
        {/* Overdue filter pill */}
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterOverdue((v) => !v)}
            className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors border ${
              filterOverdue
                ? 'bg-danger/20 text-danger border-danger/40'
                : 'text-text-muted hover:text-text-secondary bg-bg-secondary border-border-default'
            }`}
          >
            ⚠ Overdue ({overdueCount})
          </button>
        )}
        {/* Quick wins filter pill */}
        {quickWinsCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterQuickWins((v) => !v)}
            className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors border ${
              filterQuickWins
                ? 'bg-success/20 text-success border-success/40'
                : 'text-text-muted hover:text-text-secondary bg-bg-secondary border-border-default'
            }`}
            title="Quick wins: low effort (≤5pt), high value (>5) features"
          >
            ⚡ Quick Wins ({quickWinsCount})
          </button>
        )}
        {/* Hide done toggle */}
        {done > 0 && (
          <button
            type="button"
            onClick={() => setFilterHideDone((v) => !v)}
            title="Toggle visibility of done features"
            className={`text-[10px] px-2 py-1 rounded-full cursor-pointer transition-colors border ${
              filterHideDone
                ? 'bg-bg-hover text-text-primary border-border-active'
                : 'text-text-muted hover:text-text-secondary bg-bg-secondary border-border-default'
            }`}
          >
            {filterHideDone ? '⊙ Showing active' : 'Hide done'}
          </button>
        )}

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as '' | Priority)}
          className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
            filterPriority
              ? 'bg-accent-muted text-accent border-accent/30'
              : 'bg-bg-secondary text-text-muted border-border-default'
          }`}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
          ))}
        </select>

        {/* Entity filter */}
        {entities.length > 0 && (
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
              filterEntity
                ? 'bg-accent-muted text-accent border-accent/30'
                : 'bg-bg-secondary text-text-muted border-border-default'
            }`}
          >
            <option value="">All entities</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPriority(''); setFilterTag(''); setFilterEntity(''); setFilterMilestone(''); setSortBy('default'); setFilterBlocked(false); setFilterOverdue(false); setFilterHideDone(false); setFilterQuickWins(false); setGroupBy('milestone'); setFilterAssignee(''); }}
            className="text-[10px] text-text-muted hover:text-danger transition-colors cursor-pointer px-2 py-1"
          >
            Clear
          </button>
        )}

        {/* Milestone filter */}
        {milestones.length > 0 && (
          <select
            value={filterMilestone}
            onChange={(e) => setFilterMilestone(e.target.value)}
            className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
              filterMilestone
                ? 'bg-accent-muted text-accent border-accent/30'
                : 'bg-bg-secondary text-text-muted border-border-default'
            }`}
          >
            <option value="">All milestones</option>
            <option value="__backlog__">Backlog</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
            sortBy !== 'default'
              ? 'bg-accent-muted text-accent border-accent/30'
              : 'bg-bg-secondary text-text-muted border-border-default'
          }`}
        >
          <option value="default">Sort: Default</option>
          <option value="priority">Sort: Priority</option>
          <option value="status">Sort: Status</option>
          <option value="estimate">Sort: Estimate</option>
          <option value="due">Sort: Due Date</option>
          <option value="start">Sort: Start Date</option>
          <option value="value">Sort: Value ↓</option>
          <option value="efficiency">Sort: Efficiency ↓</option>
          <option value="cycle">Sort: Cycle Time ↑</option>
          <option value="assignee">Sort: Assignee A→Z</option>
        </select>

        {/* Group by */}
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
          className={`text-[10px] border rounded-full px-2.5 py-1 outline-none cursor-pointer transition-colors ${
            groupBy !== 'milestone'
              ? 'bg-accent-muted text-accent border-accent/30'
              : 'bg-bg-secondary text-text-muted border-border-default'
          }`}
        >
          <option value="milestone">Group: Milestone</option>
          <option value="priority">Group: Priority</option>
          <option value="status">Group: Status</option>
          {entities.length > 0 && <option value="entity">Group: Entity</option>}
          {allAssignees.length > 0 && <option value="assignee">Group: Assignee</option>}
          {allTags.length > 0 && <option value="tag">Group: Tag</option>}
          <option value="kind">Group: Kind</option>
          <option value="sprint">Group: Sprint</option>
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Hidden file input for CSV file picking */}
          <input
            ref={csvImportRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setCsvImportText(text);
                setShowCsvImport(true);
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
          />
          {/* Overflow ⋯ menu — CSV, Markdown copy, Bulk Add */}
          <div className="relative" ref={overflowRef}>
            <button
              type="button"
              onClick={() => setShowOverflow((v) => !v)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                showOverflow || showBulkImport || showCsvImport
                  ? 'bg-bg-hover text-text-primary border-border-active'
                  : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
              }`}
              title="More actions: CSV import/export, Markdown copy, Bulk add"
            >
              ⋯
            </button>
            {showOverflow && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 w-44 text-[11px]">
                {features.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { exportFeaturesCSV(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-secondary hover:bg-bg-hover cursor-pointer"
                  >
                    <span className="text-text-muted">↓</span> Export CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowCsvImport((v) => !v); setCsvImportText(''); setShowOverflow(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-secondary hover:bg-bg-hover cursor-pointer"
                >
                  <span className="text-text-muted">↑</span> Import CSV
                </button>
                {filtered.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { copyFilteredAsMd(); setShowOverflow(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover cursor-pointer ${mdCopied ? 'text-success' : 'text-text-secondary'}`}
                  >
                    <span className="text-text-muted">📋</span> {mdCopied ? 'Copied!' : 'Copy filtered MD'}
                  </button>
                )}
                {displayFeatures.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const lines: string[] = [];
                      groups.forEach((g) => {
                        if (g.features.length === 0) return;
                        lines.push(`## ${g.label}`);
                        g.features.forEach((f) => {
                          const check = f.done ? 'x' : f.inProgress ? '-' : ' ';
                          lines.push(`- [${check}] ${f.title}${f.estimate && f.estimate !== '?' ? ` (${f.estimate}pt)` : ''}${f.assignee ? ` @${f.assignee}` : ''}`);
                        });
                        lines.push('');
                      });
                      navigator.clipboard.writeText(lines.join('\n').trimEnd());
                      setCopiedAllMd(true);
                      setTimeout(() => setCopiedAllMd(false), 1500);
                      setShowOverflow(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-bg-hover cursor-pointer ${copiedAllMd ? 'text-success' : 'text-text-secondary'}`}
                  >
                    <span className="text-text-muted">📝</span> {copiedAllMd ? 'Copied!' : 'Copy all MD'}
                  </button>
                )}
                <div className="border-t border-border-default my-1" />
                <button
                  type="button"
                  onClick={() => { setShowBulkImport((v) => !v); setBulkImportText(''); setShowOverflow(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-text-secondary hover:bg-bg-hover cursor-pointer"
                >
                  <span className="text-text-muted">+</span> Bulk add features
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}
            className={`text-[10px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              selectionMode
                ? 'bg-accent text-white border-accent'
                : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
            }`}
          >
            {selectionMode ? `${selectedIds.size} selected` : 'Select'}
          </button>
          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              focusMode
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
            }`}
            title="Focus mode: show only in-progress + next-up features"
          >
            {focusMode ? '⚡ Focus' : '⚡'}
          </button>
          {viewMode === 'timeline' && (
            <button
              type="button"
              onClick={() => setTimelineGranularity((g) => g === 'months' ? 'weeks' : 'months')}
              className="text-[10px] px-2 py-1 rounded-lg border cursor-pointer transition-colors text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary"
              title="Toggle timeline granularity: Months / Weeks"
            >
              {timelineGranularity === 'months' ? 'By Month' : 'By Week'}
            </button>
          )}
          {viewMode === 'board' && (
            <div
              className="flex items-center border border-border-default rounded-lg overflow-hidden"
              title="WIP limit: max In Progress items (0 = disabled)"
            >
              <span className="text-[10px] text-text-muted px-2 py-1 bg-bg-secondary select-none border-r border-border-default">WIP</span>
              <button
                type="button"
                onClick={() => setWipLimit((v) => v === null || v <= 1 ? null : v - 1)}
                disabled={wipLimit === null}
                className="text-[10px] px-2 py-1 text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-r border-border-default"
              >−</button>
              <span className="text-[10px] text-text-muted px-1.5 py-1 min-w-[20px] text-center tabular-nums">
                {wipLimit ?? '–'}
              </span>
              <button
                type="button"
                onClick={() => setWipLimit((v) => v === null ? 3 : v + 1)}
                className="text-[10px] px-2 py-1 text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer border-l border-border-default"
              >+</button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setViewMode((v) => v === 'list' ? 'board' : v === 'board' ? 'timeline' : v === 'timeline' ? 'deps' : v === 'deps' ? 'retro' : 'list')}
            className={`text-[10px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              viewMode !== 'list'
                ? 'bg-accent text-white border-accent'
                : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
            }`}
            title="Toggle view: List → Board → Timeline → Deps → Retro"
          >
            {viewMode === 'board' ? '🗂 Board' : viewMode === 'timeline' ? '📅 Timeline' : viewMode === 'deps' ? '🕸 Deps' : viewMode === 'retro' ? '📋 Retro' : '☰ List'}
          </button>
        </div>
      </div>

      {/* Bulk import panel */}
      {showBulkImport && (
        <div className="bg-bg-secondary border border-border-active rounded-lg p-3 space-y-2 animate-fade-in">
          <p className="text-[10px] text-text-muted">Paste feature names — one per line</p>
          <textarea
            autoFocus
            value={bulkImportText}
            onChange={(e) => setBulkImportText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowBulkImport(false); setBulkImportText(''); }
            }}
            rows={4}
            placeholder={"User authentication\nPassword reset\nEmail notifications"}
            className="w-full text-xs bg-bg-primary border border-border-default rounded px-3 py-2 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors resize-y font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const lines = bulkImportText.split('\n').map((l) => l.trim()).filter(Boolean);
                lines.forEach((title) => addFeature(title));
                setBulkImportText('');
                setShowBulkImport(false);
              }}
              disabled={!bulkImportText.trim()}
              className="text-xs text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent-muted rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add {bulkImportText.split('\n').filter((l) => l.trim()).length || 0} features
            </button>
            <button
              type="button"
              onClick={() => { setShowBulkImport(false); setBulkImportText(''); }}
              className="text-xs text-text-muted hover:text-text-secondary cursor-pointer px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CSV import panel */}
      {showCsvImport && (
        <div className="bg-bg-secondary border border-border-active rounded-lg p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-text-muted">
              Paste CSV or{' '}
              <button
                type="button"
                onClick={() => csvImportRef.current?.click()}
                className="text-accent hover:underline cursor-pointer"
              >
                browse file
              </button>
              {' '}— columns: <code className="text-accent">Title</code>, Description, Priority, Estimate, Milestone, Tags
            </p>
          </div>
          <textarea
            autoFocus
            value={csvImportText}
            onChange={(e) => setCsvImportText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowCsvImport(false); setCsvImportText(''); }
            }}
            rows={5}
            placeholder={'Title,Priority,Estimate\nUser auth,high,5\nPassword reset,medium,3'}
            className="w-full text-xs bg-bg-primary border border-border-default rounded px-3 py-2 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors resize-y font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const count = importFromCsv(csvImportText);
                if (count > 0) {
                  setCsvImportText('');
                  setShowCsvImport(false);
                }
              }}
              disabled={!csvImportText.trim()}
              className="text-xs text-accent border border-accent/30 hover:border-accent/60 hover:bg-accent-muted rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => { setShowCsvImport(false); setCsvImportText(''); }}
              className="text-xs text-text-muted hover:text-text-secondary cursor-pointer px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mr-1">Tags:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`text-[9px] px-2 py-0.5 rounded-full transition-colors cursor-pointer border ${
                filterTag === tag
                  ? 'bg-accent-muted text-accent border-accent/40'
                  : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
              }`}
            >
              #{tag}
              <span className="ml-1 opacity-60">
                {features.filter((f) => (f.tags ?? []).includes(tag)).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Assignee filter chips */}
      {allAssignees.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mr-1">Assignees:</span>
          {allAssignees.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setFilterAssignee(filterAssignee === a ? '' : a)}
              className={`text-[9px] px-2 py-0.5 rounded-full transition-colors cursor-pointer border ${
                filterAssignee === a
                  ? 'bg-violet/15 text-violet border-violet/40'
                  : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
              }`}
            >
              @{a}
              <span className="ml-1 opacity-60">
                {features.filter((f) => f.assignee === a).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Sprint filter chips */}
      {(() => {
        const allSprints = [...new Set(features.map((f) => f.sprint).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        if (!allSprints.length) return null;
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mr-1">Sprints:</span>
            {allSprints.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterSprint(filterSprint === s ? '' : s)}
                className={`text-[9px] px-2 py-0.5 rounded-full transition-colors cursor-pointer border ${
                  filterSprint === s
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40'
                    : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-bg-secondary'
                }`}
              >
                ⚡{s}
                <span className="ml-1 opacity-60">
                  {features.filter((f) => f.sprint === s).length}
                </span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Bulk action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-bg-secondary border border-accent/30 rounded-lg px-3 py-2 animate-fade-in">
          <span className="text-xs text-text-primary font-medium flex-shrink-0">
            {selectedIds.size} feature{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          {(() => {
            const pts = [...selectedIds].reduce((sum, id) => {
              const f = features.find((feat) => feat.id === id);
              const n = parseInt(f?.estimate ?? '', 10);
              return sum + (isNaN(n) ? 0 : n);
            }, 0);
            return pts > 0 ? (
              <span className="text-xs text-accent flex-shrink-0" title="Total story points of selected features">
                {pts}pt
              </span>
            ) : null;
          })()}
          <div className="h-4 w-px bg-border-default" />
          <button
            type="button"
            onClick={() => bulkMarkDone(true)}
            className="text-xs text-success hover:bg-success/10 px-2 py-1 rounded cursor-pointer transition-colors"
          >
            Mark done
          </button>
          <button
            type="button"
            onClick={() => bulkMarkDone(false)}
            className="text-xs text-text-secondary hover:bg-bg-hover px-2 py-1 rounded cursor-pointer transition-colors"
          >
            Mark undone
          </button>
          <button
            type="button"
            onClick={() => { selectedIds.forEach((id) => updateFeature(id, { inProgress: true, done: false })); exitSelectionMode(); }}
            className="text-xs text-warning hover:bg-warning/10 px-2 py-1 rounded cursor-pointer transition-colors"
          >
            Set active
          </button>
          <select
            onChange={(e) => { if (e.target.value) bulkChangePriority(e.target.value as Priority); }}
            className="text-xs bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-secondary outline-none cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Set priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val !== '') {
                const milestone = val === '__backlog__' ? '' : val;
                selectedIds.forEach((id) => updateFeature(id, { milestone }));
                exitSelectionMode();
              }
            }}
            className="text-xs bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-secondary outline-none cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Set milestone…</option>
            <option value="__backlog__">No milestone</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val !== '') {
                selectedIds.forEach((id) => updateFeature(id, { estimate: val as import('../../types').Estimate }));
                exitSelectionMode();
              }
            }}
            className="text-xs bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-secondary outline-none cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Set estimate…</option>
            {['1','2','3','5','8','13','?'].map((v) => <option key={v} value={v}>{v}pt</option>)}
          </select>
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val !== '') {
                selectedIds.forEach((id) => updateFeature(id, { value: val as import('../../types').Estimate }));
                exitSelectionMode();
              }
            }}
            className="text-xs bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-secondary outline-none cursor-pointer"
            defaultValue=""
          >
            <option value="" disabled>Set value…</option>
            {['1','2','3','5','8','13','?'].map((v) => <option key={v} value={v}>val {v}</option>)}
          </select>
          {/* Bulk tag */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = bulkTagDraft.trim().toLowerCase().replace(/\s+/g, '-');
              if (t) {
                selectedIds.forEach((id) => {
                  const f = features.find((feat) => feat.id === id);
                  if (f && !(f.tags ?? []).includes(t)) {
                    updateFeature(id, { tags: [...(f.tags ?? []), t] });
                  }
                });
              }
              setBulkTagDraft('');
              exitSelectionMode();
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={bulkTagDraft}
              onChange={(e) => setBulkTagDraft(e.target.value)}
              placeholder="Tag to add..."
              className="text-xs bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-secondary outline-none focus:border-border-focus placeholder:text-text-placeholder w-24"
            />
            <button
              type="submit"
              disabled={!bulkTagDraft.trim()}
              className="text-xs text-text-secondary hover:bg-bg-hover px-2 py-1 rounded cursor-pointer transition-colors disabled:opacity-40"
            >
              + tag
            </button>
          </form>
          {/* Bulk assignee */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const a = bulkAssigneeDraft.trim();
              selectedIds.forEach((id) => updateFeature(id, { assignee: a || undefined }));
              setBulkAssigneeDraft('');
              exitSelectionMode();
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              value={bulkAssigneeDraft}
              onChange={(e) => setBulkAssigneeDraft(e.target.value)}
              placeholder="Assign to..."
              className="text-xs bg-bg-tertiary border border-border-default rounded px-2 py-1 text-text-secondary outline-none focus:border-border-focus placeholder:text-text-placeholder w-24"
            />
            <button
              type="submit"
              className="text-xs text-violet/80 hover:bg-violet/10 px-2 py-1 rounded cursor-pointer transition-colors"
              title="Assign selected features (leave blank to unassign)"
            >
              @assign
            </button>
          </form>
          <div className="flex-1" />
          <button
            type="button"
            onClick={bulkDelete}
            className="text-xs text-danger hover:bg-danger/10 px-2 py-1 rounded cursor-pointer transition-colors"
          >
            Delete all
          </button>
          <button
            type="button"
            onClick={exitSelectionMode}
            className="text-xs text-text-muted hover:text-text-secondary px-2 py-1 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Overall progress — compact single row */}
      {total > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-bg-secondary border border-border-default rounded-lg">
          {/* Progress bar */}
          <div className="flex-1 h-1 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-success' : inProgressCount > 0 ? 'bg-accent' : 'bg-accent/60'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Stats */}
          <span className="text-[11px] tabular-nums text-text-secondary font-medium flex-shrink-0">
            {done}/{total}
          </span>
          <span className={`text-[10px] tabular-nums flex-shrink-0 ${pct === 100 ? 'text-success' : 'text-text-muted'}`}>
            {pct}%
          </span>
          {totalPoints > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-muted text-accent flex-shrink-0" title="Story points done / total">
              {donePoints}/{totalPoints}pt
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 flex-shrink-0">
              {inProgressCount} active
            </span>
          )}
          {/* Priority dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {PRIORITIES.map((p) => {
              const count = features.filter((f) => f.priority === p).length;
              if (count === 0) return null;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterPriority(filterPriority === p ? '' : p)}
                  className={`flex items-center gap-0.5 text-[10px] cursor-pointer rounded px-1 py-0.5 transition-colors ${filterPriority === p ? 'bg-bg-hover ring-1 ring-border-active' : 'hover:bg-bg-hover'}`}
                  title={`Filter: ${PRIORITY_CONFIG[p].label} (${count})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                  <span className="text-text-muted">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestones header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {milestones.map((m) => {
            const mDone = features.filter((f) => f.milestone === m.id && f.done).length;
            const mActive = features.filter((f) => f.milestone === m.id && f.inProgress && !f.done).length;
            const mTotal = features.filter((f) => f.milestone === m.id).length;
            const now = new Date();
            const due = m.dueDate ? new Date(m.dueDate) : null;
            const daysUntil = due ? Math.ceil((due.getTime() - now.setHours(0,0,0,0)) / 86400000) : null;
            const isOverdue = daysUntil !== null && daysUntil < 0;
            const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;
            return (
              <div
                key={m.id}
                className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border"
                style={{ borderColor: `${m.color}40`, backgroundColor: `${m.color}15` }}
                title={m.description || undefined}
              >
                <span className="relative w-1.5 h-1.5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: m.color }} />
                  <input
                    type="color"
                    value={m.color}
                    onChange={(e) => updateMilestone(m.id, { color: e.target.value })}
                    title="Change milestone color"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    style={{ padding: 0, border: 'none' }}
                  />
                </span>
                <InlineEdit
                  value={m.name}
                  onSave={(v) => updateMilestone(m.id, { name: v })}
                  className="text-[10px] text-text-secondary"
                />
                {m.description && (
                  <span className="text-[9px] text-text-muted italic opacity-70 max-w-[100px] truncate" title={m.description}>
                    {m.description}
                  </span>
                )}
                <span className="text-text-muted">{mDone}/{mTotal}{mActive > 0 ? <span className="text-warning ml-0.5">·{mActive}▶</span> : null}</span>
                {/* Due date */}
                <input
                  type="date"
                  value={m.dueDate ?? ''}
                  onChange={(e) => updateMilestone(m.id, { dueDate: e.target.value || undefined })}
                  title={due ? `Due: ${due.toLocaleDateString()}` : 'Set due date'}
                  className="bg-transparent outline-none cursor-pointer text-[10px] w-5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                  style={{ colorScheme: 'dark' }}
                />
                {due && (
                  <span
                    className={`text-[9px] font-medium leading-none ${isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-text-muted'}`}
                    title={due.toLocaleDateString()}
                  >
                    {isOverdue ? `${Math.abs(daysUntil!)}d overdue` : daysUntil === 0 ? 'due today' : `${daysUntil}d`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeMilestone(m.id)}
                  title="Remove milestone"
                  className="text-text-muted hover:text-danger transition-colors cursor-pointer ml-0.5"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          {/* Add milestone */}
          {addingMilestone ? (
            <input
              autoFocus
              type="text"
              value={milestoneDraft}
              onChange={(e) => setMilestoneDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMilestone();
                if (e.key === 'Escape') { setMilestoneDraft(''); setAddingMilestone(false); }
              }}
              onBlur={handleAddMilestone}
              placeholder="Milestone name..."
              className="text-[10px] bg-bg-secondary border border-border-focus rounded-full px-2 py-1 text-text-primary outline-none placeholder:text-text-placeholder"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingMilestone(true)}
              className="text-[10px] text-text-muted hover:text-text-secondary flex items-center gap-1 cursor-pointer px-2 py-1 rounded-full border border-dashed border-border-default hover:border-border-active transition-colors"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Milestone
            </button>
          )}
        </div>
        {/* Collapse / expand all groups */}
        {(milestones.length > 0 || groupBy !== 'milestone') && (
          <button
            type="button"
            onClick={() => {
              const allIds = groups.map((g) => g.milestoneId);
              const anyExpanded = allIds.some((id) => !collapsedGroups.has(id));
              if (anyExpanded) {
                setCollapsedGroups(new Set(allIds));
              } else {
                setCollapsedGroups(new Set());
              }
            }}
            className="text-[10px] text-text-muted hover:text-text-secondary cursor-pointer px-2 py-1 flex-shrink-0 transition-colors"
            title="Toggle collapse/expand all groups"
          >
            {groups.every((g) => collapsedGroups.has(g.milestoneId)) ? '▶ Expand all' : '▼ Collapse all'}
          </button>
        )}
      </div>

      {/* Timeline view */}
      {viewMode === 'timeline' && (() => {
        const featuresWithDates = displayFeatures.filter((f) => f.dueDate || f.startDate);
        const featuresNoDates = displayFeatures.filter((f) => !f.dueDate && !f.startDate);

        if (displayFeatures.length === 0) {
          return (
            <div className="text-center py-8 text-sm text-text-muted">
              {hasFilters ? 'No features match your filters.' : 'No features to display on timeline.'}
            </div>
          );
        }

        if (featuresWithDates.length === 0) {
          return (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-8 text-center">
              <p className="text-sm text-text-muted">No features have due dates.</p>
              <p className="text-xs text-text-placeholder mt-1">Set due dates on features to see them on the timeline.</p>
            </div>
          );
        }

        // Build time buckets (months or weeks)
        const dates = featuresWithDates.flatMap((f) => [
          f.dueDate ? new Date(f.dueDate).getTime() : null,
          f.startDate ? new Date(f.startDate).getTime() : null,
        ].filter(Boolean) as number[]);
        const milestoneTimestamps = milestones.filter((m) => m.dueDate).map((m) => new Date(m.dueDate!).getTime());
        const allTimestamps = [...dates, ...milestoneTimestamps];
        const minTs = Math.min(...allTimestamps);
        const maxTs = Math.max(...allTimestamps);
        const nowTs = new Date().setHours(0, 0, 0, 0);
        const nowD = new Date(nowTs);
        const nowMonth = nowD.getMonth();
        const nowYear = nowD.getFullYear();

        type Bucket = { key: string; label: string; isCurrent: boolean; bucketStart: number; bucketEnd: number; features: typeof filtered; milestones: typeof milestones };
        const buckets: Bucket[] = [];

        if (timelineGranularity === 'weeks') {
          // Week buckets — align to Monday of the week containing minTs or now (whichever is earlier)
          const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
          const baseDate = new Date(Math.min(minTs, nowTs));
          const dow = baseDate.getDay(); // 0=Sun,1=Mon,...
          const mondayOffset = dow === 0 ? -6 : 1 - dow;
          baseDate.setDate(baseDate.getDate() + mondayOffset);
          baseDate.setHours(0, 0, 0, 0);
          const limitTs = maxTs + MS_WEEK;
          const cur = new Date(baseDate);
          while (cur.getTime() <= limitTs) {
            const bucketStart = cur.getTime();
            const bucketEnd = bucketStart + MS_WEEK;
            const bucketNow = nowTs >= bucketStart && nowTs < bucketEnd;
            const label = cur.toLocaleString('default', { month: 'short', day: 'numeric' });
            buckets.push({
              key: `w-${bucketStart}`,
              label,
              isCurrent: bucketNow,
              bucketStart,
              bucketEnd,
              features: featuresWithDates.filter((f) => {
                const t = f.dueDate ? new Date(f.dueDate).getTime() : new Date(f.startDate!).getTime();
                return t >= bucketStart && t < bucketEnd;
              }),
              milestones: milestones.filter((ms) => {
                if (!ms.dueDate) return false;
                const t = new Date(ms.dueDate).getTime();
                return t >= bucketStart && t < bucketEnd;
              }),
            });
            cur.setTime(cur.getTime() + MS_WEEK);
          }
        } else {
          // Month buckets
          const startDate = new Date(Math.min(minTs, nowTs));
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(maxTs);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(1);
          endDate.setHours(0, 0, 0, 0);
          const cursor = new Date(startDate);
          while (cursor < endDate) {
            const y = cursor.getFullYear();
            const m = cursor.getMonth();
            const bucketStart = new Date(y, m, 1).getTime();
            const bucketEnd = new Date(y, m + 1, 0).getTime() + 86400000;
            buckets.push({
              key: `m-${y}-${m}`,
              label: cursor.toLocaleString('default', { month: 'short', year: 'numeric' }),
              isCurrent: y === nowYear && m === nowMonth,
              bucketStart,
              bucketEnd,
              features: featuresWithDates.filter((f) => {
                const t = f.dueDate ? new Date(f.dueDate).getTime() : new Date(f.startDate!).getTime();
                return t >= bucketStart && t < bucketEnd;
              }),
              milestones: milestones.filter((ms) => {
                if (!ms.dueDate) return false;
                const t = new Date(ms.dueDate).getTime();
                return t >= bucketStart && t < bucketEnd;
              }),
            });
            cursor.setMonth(cursor.getMonth() + 1);
          }
        }

        return (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-2">
                {/* No-date column */}
                {featuresNoDates.length > 0 && (
                  <div className="flex-shrink-0 w-44">
                    <div className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2 px-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-border-active inline-block" />
                      No Date
                      <span className="opacity-60">({featuresNoDates.length})</span>
                    </div>
                    <div className="space-y-1">
                      {featuresNoDates.map((f) => (
                        <div
                          key={f.id}
                          className={`px-2 py-1.5 rounded-lg text-[10px] border cursor-default ${
                            f.done ? 'opacity-40 line-through' : ''
                          }`}
                          style={{
                            borderColor: `${PRIORITY_COLORS[f.priority]}40`,
                            backgroundColor: `${PRIORITY_COLORS[f.priority]}12`,
                          }}
                          title={`${f.title}${f.description ? ` — ${f.description}` : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: PRIORITY_COLORS[f.priority] }}
                            />
                            <span className={`text-text-primary truncate ${f.inProgress ? 'text-warning' : ''}`}>{f.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time buckets (months or weeks) */}
                {buckets.map(({ key, label, isCurrent, features: mFeatures, milestones: mMilestones }) => {
                  return (
                    <div
                      key={key}
                      className={`flex-shrink-0 w-44 ${isCurrent ? 'ring-1 ring-accent/30 rounded-lg' : ''}`}
                    >
                      <div className={`text-[10px] uppercase tracking-wider mb-2 px-1 flex items-center gap-1 ${isCurrent ? 'text-accent font-medium' : 'text-text-muted'}`}>
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                        {label}
                        {mFeatures.length > 0 && <span className="opacity-60">({mFeatures.length})</span>}
                      </div>

                      {/* Milestone markers */}
                      {mMilestones.map((ms) => (
                        <div
                          key={ms.id}
                          className="flex items-center gap-1 px-2 py-1 mb-1 rounded-lg text-[9px] border"
                          style={{ borderColor: `${ms.color}60`, backgroundColor: `${ms.color}15`, color: ms.color }}
                        >
                          <span>🏁</span>
                          <span className="font-medium truncate">{ms.name}</span>
                          {ms.dueDate && (
                            <span className="ml-auto opacity-70">{new Date(ms.dueDate).getDate()}</span>
                          )}
                        </div>
                      ))}

                      <div className="space-y-1">
                        {mFeatures.length === 0 ? (
                          <div className="h-8 rounded-lg border border-dashed border-border-default/40" />
                        ) : mFeatures.map((f) => {
                          const due = new Date(f.dueDate!);
                          const daysLeft = Math.ceil((due.getTime() - nowTs) / 86400000);
                          const isOverdue = daysLeft < 0;
                          const isSoon = daysLeft >= 0 && daysLeft <= 7;
                          return (
                            <div
                              key={f.id}
                              className={`px-2 py-1.5 rounded-lg text-[10px] border cursor-default group ${
                                f.done ? 'opacity-40' : ''
                              } ${isOverdue && !f.done ? 'border-danger/40 bg-danger/8' : ''}`}
                              style={!isOverdue || f.done ? {
                                borderColor: `${PRIORITY_COLORS[f.priority]}40`,
                                backgroundColor: `${PRIORITY_COLORS[f.priority]}12`,
                              } : undefined}
                              title={`${f.title}${f.description ? ` — ${f.description}` : ''}${f.dueDate ? ` · Due ${due.toLocaleDateString()}` : ''}`}
                            >
                              <div className="flex items-center gap-1">
                                {f.done ? (
                                  <span className="text-success text-[9px] flex-shrink-0">✓</span>
                                ) : f.inProgress ? (
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-warning" />
                                ) : (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: PRIORITY_COLORS[f.priority] }}
                                  />
                                )}
                                <span className={`text-text-primary truncate flex-1 ${f.done ? 'line-through' : ''} ${f.inProgress && !f.done ? 'text-warning' : ''}`}>
                                  {f.title}
                                </span>
                                {!f.done && (
                                  <span className={`flex-shrink-0 text-[9px] ${isOverdue ? 'text-danger' : isSoon ? 'text-warning' : 'text-text-muted'}`}>
                                    {due.getDate()}
                                  </span>
                                )}
                              </div>
                              {f.estimate && f.estimate !== '?' && (
                                <div className="mt-0.5 text-[9px] text-text-muted">{f.estimate}pt</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-text-muted px-1">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />Done</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />Active</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" />Overdue</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />Current {timelineGranularity === 'weeks' ? 'week' : 'month'}</span>
            </div>
          </div>
        );
      })()}

      {/* Board / Kanban view */}
      {viewMode === 'board' && (() => {
        const milestoneMap = new Map(milestones.map((m) => [m.id, m]));
        const cols: { id: string; label: string; color: string; features: typeof filtered }[] = [
          { id: 'todo', label: 'To Do', color: '#64748b', features: displayFeatures.filter((f) => !f.done && !f.inProgress) },
          { id: 'active', label: 'In Progress', color: '#f59e0b', features: displayFeatures.filter((f) => f.inProgress && !f.done) },
          { id: 'done', label: 'Done', color: '#10b981', features: displayFeatures.filter((f) => f.done) },
        ];
        const draggingFeature = boardDraggingId ? displayFeatures.find((f) => f.id === boardDraggingId) : null;
        function BoardDroppable({ id, children, color }: { id: string; children: React.ReactNode; color: string }) {
          const { setNodeRef, isOver } = useDroppable({ id });
          return (
            <div ref={setNodeRef} className="space-y-2 min-h-[48px] rounded-lg transition-colors" style={isOver ? { boxShadow: `inset 0 0 0 1px ${color}` } : undefined}>
              {children}
            </div>
          );
        }
        function BoardCard({ featureId, children }: { featureId: string; children: React.ReactNode }) {
          const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: featureId });
          return (
            <div
              ref={setNodeRef}
              {...attributes}
              style={transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50, opacity: isDragging ? 0.4 : 1 } : undefined}
            >
              <div {...listeners} className="cursor-grab active:cursor-grabbing">
                {children}
              </div>
            </div>
          );
        }
        return (
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => setBoardDraggingId(String(active.id))}
            onDragEnd={({ active, over }) => {
              setBoardDraggingId(null);
              if (!over) return;
              const fid = String(active.id);
              const target = String(over.id);
              if (target === 'todo') updateFeature(fid, { done: false, inProgress: false });
              else if (target === 'active') updateFeature(fid, { done: false, inProgress: true, startDate: features.find((f) => f.id === fid)?.startDate || new Date().toISOString().slice(0, 10) });
              else if (target === 'done') updateFeature(fid, { done: true, inProgress: false });
            }}
            onDragCancel={() => setBoardDraggingId(null)}
          >
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {cols.map((col) => {
                const colPoints = col.features.reduce((s, f) => { const n = parseInt(f.estimate ?? '', 10); return s + (isNaN(n) ? 0 : n); }, 0);
                return (
                <div key={col.id} className="flex-shrink-0 w-72">
                  {/* Column header */}
                  {(() => {
                    const isOverWip = col.id === 'active' && wipLimit !== null && col.features.length > wipLimit;
                    const isAtWip = col.id === 'active' && wipLimit !== null && col.features.length === wipLimit;
                    return (
                      <div
                        className={`group/colhdr flex items-center justify-between px-3 py-2 mb-2 rounded-lg border transition-colors ${isOverWip ? 'border-danger/50 bg-danger/10' : ''}`}
                        style={isOverWip || isAtWip ? undefined : { borderColor: `${col.color}40`, backgroundColor: `${col.color}15` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isOverWip ? '#ef4444' : col.color }} />
                          <span className="text-xs font-medium" style={{ color: isOverWip ? '#ef4444' : col.color }}>{col.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          {colPoints > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-bg-tertiary" title="Story points in column">
                              {colPoints}pt
                            </span>
                          )}
                          <span>{col.features.length}</span>
                          {col.id === 'active' && wipLimit !== null && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                              isOverWip
                                ? 'text-danger bg-danger/10 border-danger/30'
                                : isAtWip
                                ? 'text-warning bg-warning/10 border-warning/30'
                                : 'text-success/70 bg-success/5 border-success/20'
                            }`}>
                              {col.features.length}/{wipLimit}
                            </span>
                          )}
                          {col.features.length > 0 && (
                            <button
                              type="button"
                              title="Copy column as Markdown checklist"
                              onClick={() => {
                                const statusIcon = col.id === 'done' ? 'x' : col.id === 'active' ? '-' : ' ';
                                const lines = [`## ${col.label} (${col.features.length})`, ''];
                                col.features.forEach((f) => {
                                  lines.push(`- [${statusIcon}] ${f.title}${f.estimate && f.estimate !== '?' ? ` (${f.estimate}pt)` : ''}${f.assignee ? ` @${f.assignee}` : ''}`);
                                });
                                navigator.clipboard.writeText(lines.join('\n'));
                                setCopiedBoardCol(col.id);
                                setTimeout(() => setCopiedBoardCol(null), 1500);
                              }}
                              className="opacity-0 group-hover/colhdr:opacity-100 transition-opacity cursor-pointer hover:text-text-primary"
                            >
                              {copiedBoardCol === col.id ? (
                                <svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Cards */}
                  <BoardDroppable id={col.id} color={col.color}>
                    {col.features.length === 0 && !boardDraggingId ? (
                      <div className="h-16 rounded-lg border border-dashed border-border-default/40 flex items-center justify-center">
                        <span className="text-[10px] text-text-placeholder">Drop here</span>
                      </div>
                    ) : col.features.map((f) => {
                      const due = f.dueDate ? new Date(f.dueDate) : null;
                      const daysLeft = due ? Math.ceil((due.getTime() - nowMs) / 86400000) : null;
                      const isOverdueFeat = !f.done && daysLeft !== null && daysLeft < 0;
                      const isDueSoonFeat = !f.done && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
                      const blockers = (f.blockedBy ?? []).filter((bid) => features.find((bf) => bf.id === bid && !bf.done));
                      const milestone = f.milestone ? milestoneMap.get(f.milestone) : null;
                      const linkedEntitiesBoard = entities.filter((e) => f.entityRefs.includes(e.id));
                      const cycleDays = f.done && f.startDate && f.completedAt
                        ? Math.round((new Date(f.completedAt).getTime() - new Date(f.startDate).getTime()) / 86400000)
                        : null;
                      return (
                        <BoardCard key={f.id} featureId={f.id}>
                        <div
                          className={`bg-bg-secondary border rounded-lg px-3 py-2.5 space-y-1.5 hover:border-border-active transition-colors ${
                            isOverdueFeat ? 'border-danger/40' : 'border-border-default'
                          }`}
                        >
                          {/* Title row */}
                          <div className="flex items-start gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: PRIORITY_COLORS[f.priority] }}
                              title={f.priority}
                            />
                            <span className={`text-xs text-text-primary flex-1 leading-snug ${f.done ? 'line-through text-text-muted' : ''}`}>
                              {f.title || <span className="text-text-placeholder italic">Untitled</span>}
                            </span>
                          </div>
                          {/* Description */}
                          {f.description && (
                            <p className="text-[10px] text-text-muted leading-snug line-clamp-2 pl-3.5">{f.description}</p>
                          )}
                          {/* Meta row */}
                          <div className="flex items-center gap-1.5 flex-wrap pl-3.5">
                            {f.estimate && f.estimate !== '?' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/20">
                                {f.estimate}pt
                              </span>
                            )}
                            {f.value && f.value !== '?' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                                val {f.value}
                              </span>
                            )}
                            {cycleDays !== null && cycleDays >= 0 && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success/70 border border-success/20"
                                title={`Cycle time: ${cycleDays}d`}
                              >
                                ⏱{cycleDays}d
                              </span>
                            )}
                            {(() => {
                              const v = parseInt(f.value ?? '', 10);
                              const e = parseInt(f.estimate ?? '', 10);
                              return !isNaN(v) && !isNaN(e) && e > 0 && e <= 5 && v > 5 ? (
                                <span className="text-[9px] text-success/80" title="Quick win">⚡</span>
                              ) : null;
                            })()}
                            {blockers.length > 0 && (
                              <span className="text-[9px] text-danger" title={`Blocked by ${blockers.length}`}>⛔</span>
                            )}
                            {due && (
                              <span className={`text-[9px] ${isOverdueFeat ? 'text-danger' : isDueSoonFeat ? 'text-warning' : 'text-text-muted'}`}>
                                {isOverdueFeat ? `${Math.abs(daysLeft!)}d overdue` : daysLeft === 0 ? 'today' : `${daysLeft}d`}
                              </span>
                            )}
                            {f.notes?.trim() && (
                              <span className="text-[9px] text-text-muted" title="Has acceptance criteria">📝</span>
                            )}
                            {f.assignee && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet/10 text-violet border border-violet/25 cursor-pointer"
                                onClick={() => setFilterAssignee(filterAssignee === f.assignee ? '' : f.assignee!)}
                                title={`Filter by @${f.assignee}`}
                              >
                                @{f.assignee}
                              </span>
                            )}
                            {(f.tags ?? []).map((t) => (
                              <span key={t} className="text-[9px] text-text-muted">#{t}</span>
                            ))}
                          </div>
                          {/* Entity refs + Milestone */}
                          {(linkedEntitiesBoard.length > 0 || milestone) && (
                            <div className="flex items-center gap-1 flex-wrap pl-3.5">
                              {linkedEntitiesBoard.map((e) => (
                                <span
                                  key={e.id}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: `${e.color}25`, color: e.color }}
                                >
                                  {e.name}
                                </span>
                              ))}
                              {milestone && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium"
                                  style={{ borderColor: `${milestone.color}40`, backgroundColor: `${milestone.color}15`, color: milestone.color }}
                                >
                                  {milestone.name}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Status toggle */}
                          <div className="flex items-center gap-1.5 pt-0.5 border-t border-border-default/40 pl-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (f.done) updateFeature(f.id, { done: false, inProgress: false });
                                else if (f.inProgress) updateFeature(f.id, { done: true, inProgress: false });
                                else updateFeature(f.id, { inProgress: true });
                              }}
                              className="text-[9px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-bg-hover"
                              title={f.done ? 'Reset to todo' : f.inProgress ? 'Mark done' : 'Start'}
                            >
                              {f.done ? '↩ Reset' : f.inProgress ? '✓ Done' : '▶ Start'}
                            </button>
                          </div>
                        </div>
                        </BoardCard>
                      );
                    })}
                  </BoardDroppable>
                  {/* Add in column */}
                  <button
                    type="button"
                    onClick={() => {
                      const id = String(Date.now());
                      addFeature('New feature');
                      if (col.id === 'active') setTimeout(() => updateFeature(features[features.length - 1]?.id ?? id, { inProgress: true }), 0);
                      else if (col.id === 'done') setTimeout(() => updateFeature(features[features.length - 1]?.id ?? id, { done: true }), 0);
                    }}
                    className="mt-2 w-full text-[10px] text-text-muted hover:text-text-secondary flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border-default hover:border-border-active transition-colors cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add feature
                  </button>
                </div>
                );
              })}
            </div>
          </div>
          {/* Drag overlay ghost */}
          <DragOverlay>
            {draggingFeature && (
              <div className="bg-bg-secondary border border-accent rounded-lg px-3 py-2.5 w-72 shadow-2xl opacity-95">
                <div className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: PRIORITY_COLORS[draggingFeature.priority] }} />
                  <span className="text-xs text-text-primary flex-1 leading-snug">{draggingFeature.title || 'Untitled'}</span>
                </div>
              </div>
            )}
          </DragOverlay>
          </DndContext>
        );
      })()}

      {/* Dependency graph view */}
      {viewMode === 'deps' && (() => {
        // Only show features that have blockedBy or are blockedBy others
        const featuresWithDeps = displayFeatures.filter(
          (f) => (f.blockedBy ?? []).length > 0 || features.some((o) => (o.blockedBy ?? []).includes(f.id))
        );
        if (featuresWithDeps.length === 0) {
          return (
            <div className="py-12 text-center text-sm text-text-muted space-y-2">
              <p className="text-2xl">🕸</p>
              <p>No dependency links yet.</p>
              <p className="text-[11px]">Add blockers to features via the "+ blocker" button on hover.</p>
            </div>
          );
        }
        // Simple horizontal layout: columns = depth level
        const depthMap = new Map<string, number>();
        const visited = new Set<string>();
        function getDepth(id: string): number {
          if (depthMap.has(id)) return depthMap.get(id)!;
          if (visited.has(id)) return 0;
          visited.add(id);
          const feat = features.find((f) => f.id === id);
          const blockers = (feat?.blockedBy ?? []).filter((bid) => featuresWithDeps.some((f) => f.id === bid));
          const d = blockers.length === 0 ? 0 : 1 + Math.max(...blockers.map(getDepth));
          depthMap.set(id, d);
          return d;
        }
        featuresWithDeps.forEach((f) => getDepth(f.id));
        const maxDepth = Math.max(...[...depthMap.values()]);
        const columns: typeof featuresWithDeps[] = [];
        for (let d = 0; d <= maxDepth; d++) {
          columns.push(featuresWithDeps.filter((f) => (depthMap.get(f.id) ?? 0) === d));
        }
        const COL_W = 200;
        const ROW_H = 56;
        const COL_GAP = 80;
        const nodePositions = new Map<string, { x: number; y: number }>();
        columns.forEach((col, ci) => {
          col.forEach((f, ri) => {
            nodePositions.set(f.id, {
              x: ci * (COL_W + COL_GAP),
              y: ri * (ROW_H + 12),
            });
          });
        });
        const svgW = columns.length * (COL_W + COL_GAP) - COL_GAP;
        const svgH = Math.max(...columns.map((c) => c.length)) * (ROW_H + 12) + 20;
        const edges: { x1: number; y1: number; x2: number; y2: number; done: boolean }[] = [];
        featuresWithDeps.forEach((f) => {
          (f.blockedBy ?? []).forEach((bid) => {
            const from = nodePositions.get(bid);
            const to = nodePositions.get(f.id);
            if (from && to) {
              const blocker = features.find((bf) => bf.id === bid);
              edges.push({
                x1: from.x + COL_W,
                y1: from.y + ROW_H / 2,
                x2: to.x,
                y2: to.y + ROW_H / 2,
                done: blocker?.done ?? false,
              });
            }
          });
        });
        return (
          <div className="overflow-x-auto pb-4">
            <div className="flex items-start gap-1 mb-3 text-[10px] text-text-muted">
              <span className="w-3 h-0.5 bg-danger/60 mt-1.5 rounded"></span>
              <span className="mr-3">Blocked edge</span>
              <span className="w-3 h-0.5 bg-success/60 mt-1.5 rounded border-dashed"></span>
              <span>Resolved (blocker done)</span>
            </div>
            <div className="relative" style={{ width: svgW + 32, minWidth: 300 }}>
              <svg className="absolute top-0 left-0 pointer-events-none" width={svgW + 32} height={svgH + 20} style={{ overflow: 'visible' }}>
                <defs>
                  <marker id="arrowBlocked" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" fillOpacity="0.7" />
                  </marker>
                  <marker id="arrowDone" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" fillOpacity="0.5" />
                  </marker>
                </defs>
                {edges.map((e, i) => {
                  const cx = (e.x1 + e.x2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M${e.x1},${e.y1} C${cx},${e.y1} ${cx},${e.y2} ${e.x2},${e.y2}`}
                      fill="none"
                      stroke={e.done ? '#10b981' : '#ef4444'}
                      strokeOpacity={e.done ? 0.4 : 0.65}
                      strokeWidth={1.5}
                      strokeDasharray={e.done ? '4 3' : undefined}
                      markerEnd={e.done ? 'url(#arrowDone)' : 'url(#arrowBlocked)'}
                    />
                  );
                })}
              </svg>
              {featuresWithDeps.map((f) => {
                const pos = nodePositions.get(f.id)!;
                const isBlocked = (f.blockedBy ?? []).some((bid) => {
                  const blocker = features.find((b) => b.id === bid);
                  return blocker && !blocker.done;
                });
                return (
                  <div
                    key={f.id}
                    className={`absolute rounded-lg border px-2.5 py-2 cursor-default hover:border-border-active transition-colors ${
                      f.done
                        ? 'border-success/30 bg-success/5'
                        : isBlocked
                        ? 'border-danger/40 bg-danger/5'
                        : 'border-border-default bg-bg-secondary'
                    }`}
                    style={{ left: pos.x, top: pos.y, width: COL_W, height: ROW_H }}
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: PRIORITY_COLORS[f.priority] }} />
                      <span className={`text-[10px] leading-snug flex-1 line-clamp-2 ${f.done ? 'line-through text-text-muted' : isBlocked ? 'text-danger/90' : 'text-text-primary'}`}>
                        {f.title || 'Untitled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 pl-3">
                      {f.done && <span className="text-[9px] text-success">✓ done</span>}
                      {isBlocked && !f.done && <span className="text-[9px] text-danger">⛔ blocked</span>}
                      {f.inProgress && !f.done && <span className="text-[9px] text-warning">▶ active</span>}
                      {f.estimate && f.estimate !== '?' && (
                        <span className="text-[9px] text-text-muted">{f.estimate}pt</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Sprint Retrospective View */}
      {viewMode === 'retro' && (() => {
        const today = new Date().toISOString().slice(0, 10);
        // Group done features by sprint (or 'Unscheduled' if no sprint but done)
        const doneFeatures = features.filter((f) => f.done);
        if (doneFeatures.length === 0) {
          return (
            <div className="py-12 text-center text-sm text-text-muted space-y-2">
              <p className="text-2xl">📋</p>
              <p>No completed features yet.</p>
              <p className="text-[11px]">Mark features as done to see your retrospective.</p>
            </div>
          );
        }

        // Collect all sprints from ALL features (not just done) for velocity
        const allSprintNames = [...new Set([
          ...features.map((f) => f.sprint ?? '').filter(Boolean),
          ...doneFeatures.map((f) => f.sprint ?? '').filter(Boolean),
        ])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        if (allSprintNames.length === 0) {
          // No sprints assigned — show retrospective by completion date week
          const byWeek = new Map<string, typeof doneFeatures>();
          doneFeatures.forEach((f) => {
            const week = f.completedAt
              ? (() => {
                  const d = new Date(f.completedAt);
                  const startOfWeek = new Date(d);
                  startOfWeek.setDate(d.getDate() - d.getDay());
                  return `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                })()
              : 'No date';
            if (!byWeek.has(week)) byWeek.set(week, []);
            byWeek.get(week)!.push(f);
          });
          const weeks = [...byWeek.keys()].sort().reverse();

          return (
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-3 px-1">
                <p className="text-xs text-text-muted">
                  Assign sprints to features (via the sprint field) to see sprint-based retrospectives.
                  Showing by completion date instead.
                </p>
              </div>
              {weeks.map((week) => {
                const wFeatures = byWeek.get(week)!;
                const pts = wFeatures.reduce((s, f) => s + (f.estimate && f.estimate !== '?' ? Number(f.estimate) : 0), 0);
                return (
                  <div key={week} className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-primary/40">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-text-primary">{week}</span>
                        <span className="text-[10px] text-text-muted bg-bg-hover px-2 py-0.5 rounded-full">{wFeatures.length} done</span>
                        {pts > 0 && <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">{pts} pts</span>}
                      </div>
                    </div>
                    <div className="divide-y divide-border-default">
                      {wFeatures.map((f) => (
                        <div key={f.id} className="flex items-start gap-3 px-4 py-2.5">
                          <span className="text-success mt-0.5 text-sm">✓</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary truncate">{f.title}</p>
                            {(f.tags?.length > 0 || f.estimate) && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {f.estimate && f.estimate !== '?' && <span className="text-[9px] text-text-muted">{f.estimate}pt</span>}
                                {f.tags?.slice(0, 2).map((tag) => (
                                  <span key={tag} className="text-[9px] text-text-muted bg-bg-hover px-1.5 py-0.5 rounded-full">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {f.completedAt && <span className="text-[9px] text-text-muted shrink-0 mt-0.5">{f.completedAt}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // Sprint-based retrospective
        const sprintData = allSprintNames.map((sprint) => {
          const sprintFeatures = features.filter((f) => f.sprint === sprint);
          const done = sprintFeatures.filter((f) => f.done);
          const inProg = sprintFeatures.filter((f) => f.inProgress && !f.done);
          const todo = sprintFeatures.filter((f) => !f.done && !f.inProgress);
          const blocked = sprintFeatures.filter((f) => (f.blockedBy ?? []).length > 0 && !f.done);
          const totalPts = sprintFeatures.reduce((s, f) => s + (f.estimate && f.estimate !== '?' ? Number(f.estimate) : 0), 0);
          const donePts = done.reduce((s, f) => s + (f.estimate && f.estimate !== '?' ? Number(f.estimate) : 0), 0);
          const velocity = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;
          return { sprint, sprintFeatures, done, inProg, todo, blocked, totalPts, donePts, velocity };
        });

        // Overall stats
        const totalDone = doneFeatures.length;
        const avgVelocity = sprintData.length > 0
          ? Math.round(sprintData.reduce((s, sd) => s + sd.velocity, 0) / sprintData.length)
          : 0;
        const totalPtsDelivered = sprintData.reduce((s, sd) => s + sd.donePts, 0);

        return (
          <div className="space-y-4 pb-4">
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Sprints', value: allSprintNames.length, color: 'text-text-primary' },
                { label: 'Done', value: totalDone, color: 'text-success' },
                { label: 'Avg Velocity', value: `${avgVelocity}%`, color: 'text-accent' },
                { label: 'Pts Delivered', value: totalPtsDelivered || '—', color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-bg-secondary border border-border-default rounded-xl p-3 text-center">
                  <p className={`text-lg font-semibold ${color}`}>{value}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Per-sprint cards */}
            {sprintData.map(({ sprint, done, inProg, todo, blocked, totalPts, donePts, velocity }) => {
              const isCurrentSprint = features.some((f) => f.sprint === sprint && (f.inProgress || (!f.done && f.dueDate && f.dueDate >= today)));
              return (
                <div key={sprint} className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-primary/40">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text-primary">{sprint}</span>
                      {isCurrentSprint && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">current</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {done.length > 0 && <span className="text-success">✓ {done.length}</span>}
                        {inProg.length > 0 && <span className="text-amber-400">▶ {inProg.length}</span>}
                        {todo.length > 0 && <span className="text-text-muted">○ {todo.length}</span>}
                        {blocked.length > 0 && <span className="text-red-400">⛔ {blocked.length}</span>}
                      </div>
                      {totalPts > 0 && (
                        <span className="text-[10px] text-accent">{donePts}/{totalPts} pts</span>
                      )}
                      {/* Velocity bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${velocity}%`, backgroundColor: velocity >= 80 ? '#10b981' : velocity >= 50 ? '#f59e0b' : '#ef4444' }}
                          />
                        </div>
                        <span className="text-[10px] text-text-muted">{velocity}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Done features */}
                  {done.length > 0 && (
                    <div className="divide-y divide-border-default">
                      {done.map((f) => (
                        <div key={f.id} className="flex items-start gap-3 px-4 py-2">
                          <span className="text-success mt-0.5 text-sm shrink-0">✓</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-primary">{f.title}</p>
                            {f.notes && (
                              <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{f.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {f.assignee && <span className="text-[9px] text-text-muted">@{f.assignee}</span>}
                            {f.estimate && f.estimate !== '?' && <span className="text-[9px] text-text-muted">{f.estimate}pt</span>}
                            {f.completedAt && <span className="text-[9px] text-text-muted">{f.completedAt}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Incomplete features (collapsed) */}
                  {(inProg.length > 0 || todo.length > 0) && (
                    <div className="px-4 py-2 border-t border-border-default bg-bg-hover/30">
                      <p className="text-[10px] text-text-muted">
                        Carried over: {[
                          inProg.length > 0 && `${inProg.length} in progress`,
                          todo.length > 0 && `${todo.length} todo`,
                        ].filter(Boolean).join(', ')}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[...inProg, ...todo].slice(0, 6).map((f) => (
                          <span key={f.id} className={`text-[9px] px-1.5 py-0.5 rounded border ${f.inProgress ? 'border-amber-500/30 text-amber-400/70' : 'border-border-default text-text-muted'}`}>
                            {f.title.length > 28 ? f.title.slice(0, 25) + '…' : f.title}
                          </span>
                        ))}
                        {inProg.length + todo.length > 6 && (
                          <span className="text-[9px] text-text-muted">+{inProg.length + todo.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Feature groups */}
      {viewMode === 'list' && <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {displayFeatures.length === 0 && (hasFilters || focusMode) && (() => {
          const q = search.trim();
          // Check if search looks like a plain title (not a special token)
          const isPlainTitle = q.length > 0 && !q.includes(':') && !q.startsWith('#') && !q.startsWith('p:') && !q.startsWith('m:');
          return (
            <div className="text-center py-8 text-sm text-text-muted space-y-2">
              <p>
                No features match your filters.{' '}
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPriority(''); setFilterTag(''); setFilterEntity(''); setFilterMilestone(''); setSortBy('default'); setFilterBlocked(false); setFilterOverdue(false); setFilterHideDone(false); setFilterQuickWins(false); setGroupBy('milestone'); setFilterAssignee(''); }}
                  className="text-accent hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </p>
              {isPlainTitle && (
                <button
                  type="button"
                  onClick={() => { addFeature(q); setSearch(''); }}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-accent/30 hover:border-accent/60 hover:bg-accent-muted text-accent transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add "{q}" as feature
                </button>
              )}
            </div>
          );
        })()}
        {groups.map((group) => {
          // Hide empty groups when filtering
          if (group.features.length === 0 && (hasFilters || (group.milestoneId === '' && milestones.length > 0))) {
            return null;
          }

          const gDone = group.features.filter((f) => f.done).length;
          const gActive = group.features.filter((f) => f.inProgress && !f.done).length;
          const gTotal = group.features.length;
          const gPct = gTotal > 0 ? Math.round((gDone / gTotal) * 100) : 0;
          const gActivePct = gTotal > 0 ? Math.round((gActive / gTotal) * 100) : 0;
          const gPoints = group.features.reduce((s, f) => { const n = parseInt(f.estimate ?? '', 10); return s + (isNaN(n) ? 0 : n); }, 0);
          const gDonePoints = group.features.filter((f) => f.done).reduce((s, f) => { const n = parseInt(f.estimate ?? '', 10); return s + (isNaN(n) ? 0 : n); }, 0);

          const isGroupCollapsed = collapsedGroups.has(group.milestoneId);
          return (
            <div key={group.milestoneId} className="group/group bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b border-border-default cursor-pointer hover:bg-bg-hover transition-colors"
                style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
                onClick={() => toggleGroupCollapse(group.milestoneId)}
              >
                <svg
                  className={`w-3 h-3 text-text-muted flex-shrink-0 transition-transform ${isGroupCollapsed ? '' : 'rotate-90'}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-primary">{group.label}</span>
                  {group.description && (
                    <span className="ml-2 text-[10px] text-text-muted italic truncate">{group.description}</span>
                  )}
                </span>
                {group.dueDate && (() => {
                  const d = new Date(group.dueDate);
                  const dy = Math.ceil((d.getTime() - nowMs) / 86400000);
                  const over = dy < 0;
                  const soon = dy >= 0 && dy <= 7;
                  return (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium mr-1 ${
                        over ? 'bg-danger/15 text-danger border-danger/30' :
                        soon ? 'bg-warning/15 text-warning border-warning/30' :
                        'bg-bg-tertiary text-text-muted border-border-default'
                      }`}
                      title={`Milestone due: ${d.toLocaleDateString()}`}
                    >
                      {over ? `${Math.abs(dy)}d overdue` : dy === 0 ? 'due today' : `${dy}d`}
                    </span>
                  );
                })()}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => copyGroupAsMd(group)}
                    title="Copy this group as Markdown checklist"
                    className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer transition-colors opacity-0 group-hover/group:opacity-100 ${
                      copiedGroupId === group.milestoneId
                        ? 'text-success border-success/30 bg-success/10 opacity-100'
                        : 'text-text-muted border-border-default hover:border-border-active hover:text-text-secondary bg-transparent'
                    }`}
                  >
                    {copiedGroupId === group.milestoneId ? '✓' : 'MD'}
                  </button>
                  <div className="h-1 w-16 bg-bg-tertiary rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-l-full transition-all duration-300"
                      style={{ width: `${gPct}%`, backgroundColor: group.color }}
                    />
                    {gActivePct > 0 && (
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${gActivePct}%`, backgroundColor: '#f59e0b', opacity: 0.6 }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {gDone}/{gTotal}
                    {gActive > 0 && <span className="text-warning ml-0.5">·{gActive}▶</span>}
                    {gPoints > 0 && (
                      <span className="ml-1 text-accent/70" title={`${gDonePoints}/${gPoints} story points done`}>
                        {gDonePoints}/{gPoints}pt
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {!isGroupCollapsed && <>
              {/* Column header */}
              <div className="grid grid-cols-[20px_24px_1fr_110px_52px_52px_90px_88px] gap-2 items-center px-3 py-1.5 text-[10px] text-text-muted/80 uppercase tracking-wide font-medium bg-bg-tertiary/30">
                {selectionMode ? (
                  <input
                    type="checkbox"
                    checked={group.features.length > 0 && group.features.every((f) => selectedIds.has(f.id))}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        group.features.forEach((f) => e.target.checked ? next.add(f.id) : next.delete(f.id));
                        return next;
                      });
                    }}
                    className="w-3.5 h-3.5 rounded border-border-default accent-accent cursor-pointer"
                  />
                ) : <span />}
                <span />
                <span>Feature</span>
                <button
                  type="button"
                  onClick={() => setSortBy((s) => s === 'priority' ? 'default' : 'priority')}
                  className={`cursor-pointer hover:text-text-secondary transition-colors text-left ${sortBy === 'priority' ? 'text-accent' : ''}`}
                  title="Sort by priority"
                >Priority{sortBy === 'priority' ? ' ↑' : ''}</button>
                <button
                  type="button"
                  onClick={() => setSortBy((s) => s === 'estimate' ? 'default' : 'estimate')}
                  className={`cursor-pointer hover:text-text-secondary transition-colors text-center ${sortBy === 'estimate' ? 'text-accent' : ''}`}
                  title="Sort by story points (effort)"
                >Pts{sortBy === 'estimate' ? ' ↑' : ''}</button>
                <button
                  type="button"
                  onClick={() => setSortBy((s) => s === 'value' ? 'efficiency' : s === 'efficiency' ? 'default' : 'value')}
                  className={`cursor-pointer hover:text-text-secondary transition-colors text-center ${sortBy === 'value' || sortBy === 'efficiency' ? 'text-accent' : ''}`}
                  title="Sort by value (click again for efficiency ratio)"
                >Val{sortBy === 'value' ? ' ↓' : sortBy === 'efficiency' ? ' eff↓' : ''}</button>
                <span>Milestone</span>
                <span />
              </div>

              {/* Feature rows */}
              {group.features.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-text-muted">
                  No features in this group
                </div>
              ) : (
                <SortableContext
                  items={group.features.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.features.map((feature) => (
                    <FeatureItem
                      key={feature.id}
                      feature={feature}
                      selectionMode={selectionMode}
                      isSelected={selectedIds.has(feature.id)}
                      onToggleSelect={() => toggleSelect(feature.id)}
                      onTagClick={(tag) => setFilterTag(filterTag === tag ? '' : tag)}
                      allTags={allTags}
                      allFeatures={features}
                    />
                  ))}
                </SortableContext>
              )}

              {/* Add feature in group */}
              {addingInGroup === group.milestoneId ? (
                <div className="px-3 py-2 border-t border-border-default">
                  <input
                    autoFocus
                    type="text"
                    value={groupDraft}
                    onChange={(e) => setGroupDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddInGroup(group.milestoneId);
                      if (e.key === 'Escape') { setGroupDraft(''); setAddingInGroup(null); }
                    }}
                    onBlur={() => handleAddInGroup(group.milestoneId)}
                    placeholder="Feature name..."
                    className="w-full text-xs bg-transparent outline-none text-text-primary placeholder:text-text-placeholder"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingInGroup(group.milestoneId)}
                  className="w-full text-left text-xs text-text-muted hover:text-text-secondary px-3 py-2 hover:bg-bg-hover transition-colors cursor-pointer flex items-center gap-2 border-t border-border-default"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add feature
                </button>
              )}
              </>}
            </div>
          );
        })}
      </DndContext>}
    </div>
  );
}
