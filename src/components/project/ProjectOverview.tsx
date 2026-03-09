import { useState, useRef, useEffect } from 'react';
import { useProjectStore, MILESTONE_COLORS } from '../../store/useProjectStore';
import { useEntityStore } from '../../store/useEntityStore';
import { useUIStore } from '../../store/useUIStore';
import { ScopeSection } from './ScopeSection';
import { InlineEdit } from '../shared/InlineEdit';
import { backupProject, exportProjectMarkdown, exportOpenApi, exportHtmlDocs, exportGithubIssues, exportChangelog } from '../../lib/backup';
import { MultiAgentPromptModal } from './MultiAgentPromptModal';
import { ProjectStarterModal } from './ProjectStarterModal';
import { useToast } from '../../hooks/useToast';
import type { Priority } from '../../types';

const PRIORITY_CONFIG_OV: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#eab308' },
  low: { label: 'Low', color: '#3b82f6' },
  'nice-to-have': { label: 'Nice-to-have', color: '#71717a' },
};

function StatCard({
  label, value, sub, color, onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-bg-secondary border border-border-default rounded-lg px-4 py-3 flex flex-col gap-1 ${onClick ? 'cursor-pointer hover:border-border-active transition-colors' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

export function ProjectOverview() {
  const toast = useToast();
  const meta = useProjectStore((s) => s.meta);
  const updateMeta = useProjectStore((s) => s.updateMeta);
  const features = useProjectStore((s) => s.features);
  const milestones = useProjectStore((s) => s.milestones);
  const updateMilestone = useProjectStore((s) => s.updateMilestone);
  const endpoints = useProjectStore((s) => s.endpoints);
  const scope = useProjectStore((s) => s.scope);
  const entities = useEntityStore((s) => s.entities);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const doneFeatures = features.filter((f) => f.done).length;
  const inProgressFeatures = features.filter((f) => f.inProgress && !f.done).length;
  const blockedFeatures = features.filter((f) =>
    !f.done && (f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done))
  ).length;
  const nowMs = new Date().setHours(0, 0, 0, 0);
  const overdueFeatures = features.filter((f) => !f.done && f.dueDate && new Date(f.dueDate).getTime() < nowMs).length;
  const totalColumns = entities.reduce((acc, e) => acc + e.columns.length, 0);
  const inScopeItems = scope.filter((s) => s.inScope).length;

  // Story points
  const totalPoints = features.reduce((sum, f) => {
    const n = parseInt(f.estimate ?? '', 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const donePoints = features.filter((f) => f.done).reduce((sum, f) => {
    const n = parseInt(f.estimate ?? '', 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const activePoints = features.filter((f) => f.inProgress && !f.done).reduce((sum, f) => {
    const n = parseInt(f.estimate ?? '', 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const estimatedCount = features.filter((f) => f.estimate && f.estimate !== '?').length;

  // Value points
  const totalValuePoints = features.filter((f) => !f.done).reduce((sum, f) => {
    const n = parseInt(f.value ?? '', 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const scoredFeatures = features.filter((f) => {
    const v = parseInt(f.value ?? '', 10);
    const e = parseInt(f.estimate ?? '', 10);
    return !isNaN(v) && !isNaN(e) && e > 0;
  });
  const avgEfficiency = scoredFeatures.length > 0
    ? scoredFeatures.reduce((sum, f) => {
        const v = parseInt(f.value ?? '', 10);
        const e = parseInt(f.estimate ?? '', 10);
        return sum + v / e;
      }, 0) / scoredFeatures.length
    : null;

  // ── Project readiness score ──────────────────────────────────────────────────
  const readinessChecks = [
    { label: 'Project name', pass: !!meta.name?.trim(), weight: 2 },
    { label: 'Description', pass: !!meta.description?.trim(), weight: 2 },
    { label: 'Tech stack defined', pass: !!meta.techStackNotes?.trim(), weight: 2 },
    { label: 'Has entities', pass: entities.length > 0, weight: 3 },
    { label: 'All entities have a PK', pass: entities.length > 0 && entities.every((e) => e.columns.some((c) => c.primaryKey)), weight: 2 },
    { label: 'Has features', pass: features.length > 0, weight: 3 },
    { label: 'Features have estimates', pass: features.length > 0 && estimatedCount / Math.max(features.length, 1) >= 0.7, weight: 2 },
    { label: 'Features have milestones', pass: features.length > 0 && features.filter((f) => f.milestone).length / Math.max(features.length, 1) >= 0.5, weight: 2 },
    { label: 'Has scope defined', pass: scope.length > 0, weight: 1 },
    { label: 'Has API endpoints', pass: endpoints.length > 0, weight: 2 },
    { label: 'Endpoints have auth set', pass: endpoints.length > 0 && endpoints.every((e) => e.auth && e.auth !== 'none'), weight: 1 },
  ];
  const totalWeight = readinessChecks.reduce((s, c) => s + c.weight, 0);
  const passedWeight = readinessChecks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const readinessScore = Math.round((passedWeight / totalWeight) * 100);
  const readinessColor = readinessScore >= 80 ? '#22c55e' : readinessScore >= 50 ? '#f59e0b' : '#ef4444';
  const readinessLabel = readinessScore >= 80 ? 'Build-ready' : readinessScore >= 50 ? 'In progress' : 'Needs work';

  // "What's Next" smart suggestions
  const whatsNextSuggestions: { icon: string; text: string; action?: string }[] = [];
  if (!meta.name?.trim() || meta.name === 'Untitled Project') {
    whatsNextSuggestions.push({ icon: '✏️', text: 'Give your project a name', action: 'name' });
  }
  if (!meta.description?.trim()) {
    whatsNextSuggestions.push({ icon: '📝', text: 'Add a project description', action: 'desc' });
  }
  if (entities.length === 0) {
    whatsNextSuggestions.push({ icon: '🗂', text: 'Design your first data entity', action: 'entities' });
  } else if (!entities.some((e) => e.columns.some((c) => c.primaryKey))) {
    whatsNextSuggestions.push({ icon: '🔑', text: 'Add a primary key to your entities' });
  }
  if (features.length === 0) {
    whatsNextSuggestions.push({ icon: '⚡', text: 'Add your first feature', action: 'features' });
  } else {
    const unestimated = features.filter((f) => !f.done && (!f.estimate || f.estimate === '?'));
    if (unestimated.length > features.length * 0.5) {
      whatsNextSuggestions.push({ icon: '🎯', text: `Estimate ${unestimated.length} unestimated feature${unestimated.length > 1 ? 's' : ''}`, action: 'features' });
    }
    if (milestones.length === 0 && features.length > 3) {
      whatsNextSuggestions.push({ icon: '🏁', text: 'Group features into milestones', action: 'features' });
    }
    if (blockedFeatures > 0) {
      whatsNextSuggestions.push({ icon: '⛔', text: `Resolve ${blockedFeatures} blocked feature${blockedFeatures > 1 ? 's' : ''}`, action: 'features' });
    }
    if (overdueFeatures > 0) {
      whatsNextSuggestions.push({ icon: '🔴', text: `${overdueFeatures} overdue feature${overdueFeatures > 1 ? 's' : ''} need attention`, action: 'features' });
    }
  }
  if (endpoints.length === 0 && features.length > 3) {
    whatsNextSuggestions.push({ icon: '🔗', text: 'Define your API endpoints', action: 'api' });
  }
  if (!meta.techStackNotes?.trim() && entities.length > 0) {
    whatsNextSuggestions.push({ icon: '⚙️', text: 'Document your tech stack', action: 'tech' });
  }
  if (scope.length === 0 && features.length > 5) {
    whatsNextSuggestions.push({ icon: '📐', text: 'Define project scope (in/out)', action: 'scope' });
  }
  const suggestionsToShow = whatsNextSuggestions.slice(0, 4);

  // Kind breakdown
  const kindCounts = (['feature', 'bug', 'improvement', 'chore'] as const).map((k) => ({
    kind: k,
    total: features.filter((f) => (f.kind ?? 'feature') === k).length,
    done: features.filter((f) => (f.kind ?? 'feature') === k && f.done).length,
    label: k === 'feature' ? 'Features' : k === 'bug' ? 'Bugs' : k === 'improvement' ? 'Improv.' : 'Chores',
    color: k === 'feature' ? '#6366f1' : k === 'bug' ? '#ef4444' : k === 'improvement' ? '#10b981' : '#64748b',
  })).filter((x) => x.total > 0);

  // Priority breakdown
  const priorityCounts = (['critical', 'high', 'medium', 'low', 'nice-to-have'] as Priority[]).map((p) => ({
    priority: p,
    total: features.filter((f) => f.priority === p).length,
    done: features.filter((f) => f.priority === p && f.done).length,
  })).filter((x) => x.total > 0);

  // Column type distribution (top 6)
  const typeFreq = entities.flatMap((e) => e.columns.map((c) => c.dataType)).reduce(
    (acc, t) => { acc.set(t, (acc.get(t) ?? 0) + 1); return acc; },
    new Map<string, number>()
  );
  const topTypes = [...typeFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTypeCount = topTypes[0]?.[1] ?? 1;

  // Top feature tags
  const tagFreq = features.flatMap((f) => f.tags ?? []).reduce(
    (acc, t) => { acc.set(t, (acc.get(t) ?? 0) + 1); return acc; },
    new Map<string, number>()
  );
  const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Upcoming due dates (non-done features with due dates, sorted soonest first)
  const upcomingFeatures = features
    .filter((f) => !f.done && f.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6);

  // API method breakdown
  const endpointsByMethod = endpoints.reduce((acc, ep) => {
    acc.set(ep.method, (acc.get(ep.method) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const implEndpointCount = endpoints.filter((e) => e.status === 'implemented').length;
  const methodCountSub = endpoints.length > 0
    ? [...endpointsByMethod.entries()].sort((a, b) => b[1] - a[1]).map(([m, c]) => `${c} ${m}`).join(' · ') +
      (implEndpointCount > 0 ? ` · ${implEndpointCount}/${endpoints.length} impl` : '')
    : 'none yet';

  // FK relationships across all entities
  const fkRelationships = entities.flatMap((e) =>
    e.columns
      .filter((c) => c.references)
      .map((c) => ({
        from: e.name,
        fromCol: c.name,
        to: c.references!.entityName,
        toCol: c.references!.columnName,
        fromColor: e.color,
      }))
  );

  // Entity coverage (how many features reference each entity)
  const entityCoverage = entities
    .map((e) => ({
      entity: e,
      count: features.filter((f) => f.entityRefs.includes(e.id)).length,
    }))
    .filter((ec) => ec.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // In-progress features
  const inProgressList = features.filter((f) => f.inProgress && !f.done);

  // "Next up" recommendation: undone, not blocked, highest priority, not in progress
  const unblocked = features.filter((f) => {
    if (f.done || f.inProgress) return false;
    return !(f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done));
  });
  const PRIORITY_ORDER_OV: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3, 'nice-to-have': 4 };
  const nextUp = [...unblocked].sort((a, b) => PRIORITY_ORDER_OV[a.priority] - PRIORITY_ORDER_OV[b.priority]).slice(0, 3);

  // Velocity: features completed per week (last 4 weeks from completedAt)
  const velocity = (() => {
    const now = Date.now();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks = [0, 1, 2, 3].map((i) => {
      const start = now - (i + 1) * msPerWeek;
      const end = now - i * msPerWeek;
      return features.filter((f) => {
        if (!f.completedAt) return false;
        const t = new Date(f.completedAt).getTime();
        return t >= start && t < end;
      }).length;
    }).reverse(); // oldest first: [week-4, week-3, week-2, week-1 (latest)]
    const total = weeks.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const avg = total / 4;
    return { weeks, avg };
  })();

  // Daily completions: last 14 days (for sparkline)
  const dailyCompletions = (() => {
    const MS_DAY = 86400000;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, i) => {
      const dayStart = todayStart - (13 - i) * MS_DAY;
      const dayEnd = dayStart + MS_DAY;
      return features.filter((f) => {
        if (!f.completedAt) return false;
        const t = new Date(f.completedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
    });
    const total = days.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    return days;
  })();

  // Avg cycle time (startDate → completedAt for done features with both)
  const cycleTime = (() => {
    const measured = features.filter((f) => f.done && f.startDate && f.completedAt).map((f) => {
      const days = Math.round(
        (new Date(f.completedAt!).getTime() - new Date(f.startDate!).getTime()) / 86400000
      );
      return days;
    }).filter((d) => d >= 0);
    if (measured.length === 0) return null;
    const avg = measured.reduce((a, b) => a + b, 0) / measured.length;
    const min = Math.min(...measured);
    const max = Math.max(...measured);
    return { avg, min, max, count: measured.length };
  })();

  // Project health score (0-100)
  const healthScore = (() => {
    if (features.length === 0) return null;
    const pctDone = (doneFeatures + inProgressFeatures * 0.5) / features.length;
    const pctNotBlocked = blockedFeatures === 0 ? 1 : 1 - blockedFeatures / features.length;
    const pctNotOverdue = overdueFeatures === 0 ? 1 : 1 - overdueFeatures / features.length;
    const pctEstimated = estimatedCount / features.length;
    return Math.round((pctDone * 25 + pctNotBlocked * 25 + pctNotOverdue * 25 + pctEstimated * 25));
  })();

  // Burndown: last 30 days remaining work
  const burndownData = (() => {
    const DAYS = 30;
    const MS_DAY = 86400000;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const windowStart = new Date(todayStart - (DAYS - 1) * MS_DAY).toISOString().slice(0, 10);
    const usePoints = totalPoints > 0;
    // Build daily completed value map
    const dailyDone = new Map<string, number>();
    features.forEach((f) => {
      if (!f.done || !f.completedAt) return;
      const pts = parseInt(f.estimate ?? '', 10);
      const val = usePoints ? (isNaN(pts) ? 0 : pts) : 1;
      dailyDone.set(f.completedAt, (dailyDone.get(f.completedAt) ?? 0) + val);
    });
    if (dailyDone.size === 0) return null;
    const totalWork = usePoints ? totalPoints : features.length;
    const doneBeforeWindow = usePoints
      ? features.filter((f) => f.done && f.completedAt && f.completedAt < windowStart)
          .reduce((s, f) => { const n = parseInt(f.estimate ?? '', 10); return s + (isNaN(n) ? 0 : n); }, 0)
      : features.filter((f) => f.done && f.completedAt && f.completedAt < windowStart).length;
    let cumDone = doneBeforeWindow;
    const pts: number[] = [];
    for (let i = 0; i < DAYS; i++) {
      const dateStr = new Date(todayStart - (DAYS - 1 - i) * MS_DAY).toISOString().slice(0, 10);
      cumDone += dailyDone.get(dateStr) ?? 0;
      pts.push(Math.max(0, totalWork - cumDone));
    }
    // Only show if at least some progress happened in window
    if (pts[0] === pts[DAYS - 1] && pts[0] === totalWork) return null;
    return { pts, totalWork, usePoints };
  })();

  // Assignee workload
  const assigneeWorkload = (() => {
    const map = new Map<string, { total: number; done: number; active: number; pts: number }>();
    features.forEach((f) => {
      if (!f.assignee) return;
      const a = f.assignee;
      if (!map.has(a)) map.set(a, { total: 0, done: 0, active: 0, pts: 0 });
      const rec = map.get(a)!;
      rec.total++;
      if (f.done) rec.done++;
      else if (f.inProgress) rec.active++;
      const n = parseInt(f.estimate ?? '', 10);
      if (!isNaN(n)) rec.pts += n;
    });
    return [...map.entries()]
      .sort((a, b) => (b[1].total - b[1].done) - (a[1].total - a[1].done))
      .slice(0, 8);
  })();

  // Status summary copy
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showStarterModal, setShowStarterModal] = useState(false);

  // Listen for external trigger (from CommandPalette)
  // We need a stable ref to call copyStatusSummary from the event listener
  const copyStatusSummaryRef = useRef<(() => void) | null>(null);

  const copyStatusSummary = () => {
    const lines: string[] = [];
    lines.push(`# ${meta.name || 'Project'} — Status Update`);
    lines.push('');
    const pct = features.length > 0 ? Math.round((doneFeatures / features.length) * 100) : 0;
    lines.push(`**Progress:** ${doneFeatures}/${features.length} done (${pct}%)${inProgressFeatures > 0 ? ` · ${inProgressFeatures} in progress` : ''}${blockedFeatures > 0 ? ` · ${blockedFeatures} blocked` : ''}${overdueFeatures > 0 ? ` · ${overdueFeatures} overdue` : ''}`);
    if (meta.techStackNotes) {
      lines.push('');
      lines.push(`**Tech Stack:** ${meta.techStackNotes}`);
    }
    if (milestones.length > 0) {
      lines.push('');
      lines.push('## Milestones');
      milestones.forEach((m) => {
        const mf = features.filter((f) => f.milestone === m.id);
        const md = mf.filter((f) => f.done).length;
        const ma = mf.filter((f) => f.inProgress && !f.done).length;
        const mp = mf.length > 0 ? Math.round((md / mf.length) * 100) : 0;
        const due = m.dueDate ? ` — due ${new Date(m.dueDate).toLocaleDateString()}` : '';
        const active = ma > 0 ? ` · ${ma} active` : '';
        lines.push(`- **${m.name}** — ${md}/${mf.length} done (${mp}%)${active}${due}`);
      });
    }
    const inProgressList = features.filter((f) => f.inProgress && !f.done);
    if (inProgressList.length > 0) {
      lines.push('');
      lines.push('## In Progress');
      inProgressList.forEach((f) => lines.push(`- ${f.title}${f.estimate ? ` (${f.estimate}pt)` : ''}`));
    }
    const blocked = features.filter((f) => !f.done && (f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done)));
    if (blocked.length > 0) {
      lines.push('');
      lines.push('## Blocked');
      blocked.forEach((f) => {
        const blockers = (f.blockedBy ?? []).map((bid) => features.find((bf) => bf.id === bid)?.title).filter(Boolean);
        lines.push(`- ${f.title} _(blocked by: ${blockers.join(', ')})_`);
      });
    }
    const week = features.filter((f) => !f.done && f.dueDate && (() => {
      const dy = Math.ceil((new Date(f.dueDate!).getTime() - nowMs) / 86400000);
      return dy >= 0 && dy <= 7;
    })()).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    if (week.length > 0) {
      lines.push('');
      lines.push('## Due This Week');
      week.forEach((f) => {
        const dy = Math.ceil((new Date(f.dueDate!).getTime() - nowMs) / 86400000);
        const label = dy === 0 ? 'today' : dy === 1 ? 'tomorrow' : `in ${dy}d`;
        lines.push(`- ${f.title} — ${label}`);
      });
    }
    // Quick wins (low effort <=5, high value >5, not done)
    const toNum = (v: string | undefined) => { const n = parseInt(v ?? '', 10); return isNaN(n) ? 0 : n; };
    const quickWins = features.filter(
      (f) => !f.done && f.estimate && f.estimate !== '?' && f.value && f.value !== '?' &&
             toNum(f.estimate) <= 5 && toNum(f.value) > 5
    );
    if (quickWins.length > 0) {
      lines.push('');
      lines.push('## Quick Wins');
      quickWins.forEach((f) => lines.push(`- ${f.title} _(${f.estimate}pt effort, ${f.value} value)_`));
    }
    if (assigneeWorkload.length > 0) {
      lines.push('');
      lines.push('## Team Workload');
      assigneeWorkload.forEach(([name, stats]) => {
        const remaining = stats.total - stats.done;
        const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        const activePart = stats.active > 0 ? ` · ${stats.active} active` : '';
        lines.push(`- **@${name}** — ${remaining} open${activePart} · ${stats.done}/${stats.total} done (${pct}%)`);
      });
    }
    if (meta.notes?.trim()) {
      lines.push('');
      lines.push('## Notes');
      lines.push(meta.notes.trim());
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    });
  };

  // Keep ref in sync so event listener always calls latest version
  copyStatusSummaryRef.current = copyStatusSummary;

  useEffect(() => {
    const handler = () => copyStatusSummaryRef.current?.();
    window.addEventListener('surplan:copy-status-summary', handler);
    return () => window.removeEventListener('surplan:copy-status-summary', handler);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Entities"
          value={entities.length}
          sub={`${totalColumns} column${totalColumns !== 1 ? 's' : ''}`}
          color="#6366f1"
          onClick={() => setActiveTab('entities')}
        />
        <StatCard
          label="Features"
          value={features.length}
          sub={features.length > 0 ? `${doneFeatures} done${inProgressFeatures > 0 ? ` · ${inProgressFeatures} active` : ''} · ${features.length - doneFeatures - inProgressFeatures} todo${blockedFeatures > 0 ? ` · ${blockedFeatures} blocked` : ''}${overdueFeatures > 0 ? ` · ${overdueFeatures} overdue` : ''}` : 'none yet'}
          color="#10b981"
          onClick={() => setActiveTab('features')}
        />
        <StatCard
          label="API Endpoints"
          value={endpoints.length}
          sub={methodCountSub}
          color="#f59e0b"
          onClick={() => setActiveTab('api')}
        />
        <StatCard
          label="Milestones"
          value={milestones.length}
          sub={inScopeItems > 0 ? `${inScopeItems} in scope` : 'no scope defined'}
          color="#8b5cf6"
        />
      </div>

      {/* Project Readiness Score */}
      <section className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Spec Readiness</span>
            <span
              className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${readinessColor}18`, color: readinessColor, border: `1px solid ${readinessColor}40` }}
            >
              {readinessLabel}
            </span>
          </div>
          <span className="text-2xl font-bold tabular-nums" style={{ color: readinessColor }}>
            {readinessScore}<span className="text-sm text-text-muted font-normal">%</span>
          </span>
        </div>
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${readinessScore}%`, backgroundColor: readinessColor }}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {readinessChecks.map((check) => (
            <div key={check.label} className="flex items-center gap-1.5 text-[10px]">
              <span style={{ color: check.pass ? '#22c55e' : '#ef4444' }}>{check.pass ? '✓' : '✗'}</span>
              <span className={check.pass ? 'text-text-muted' : 'text-text-secondary'}>{check.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What's Next */}
      {suggestionsToShow.length > 0 && (
        <section className="bg-bg-secondary border border-accent/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">What&apos;s Next</span>
            <span className="text-[9px] text-accent/60">Smart suggestions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {suggestionsToShow.map((s) => (
              <button
                key={s.text}
                type="button"
                onClick={() => {
                  if (s.action === 'entities') setActiveTab('entities');
                  else if (s.action === 'features') setActiveTab('features');
                  else if (s.action === 'api') setActiveTab('api' as Parameters<typeof setActiveTab>[0]);
                }}
                className={`flex items-center gap-2 text-[11px] text-left px-3 py-2 rounded-lg border transition-colors ${
                  s.action
                    ? 'border-border-default hover:border-accent/40 hover:bg-accent/5 text-text-secondary cursor-pointer'
                    : 'border-border-default/50 text-text-muted cursor-default'
                }`}
              >
                <span className="text-base flex-shrink-0">{s.icon}</span>
                <span>{s.text}</span>
                {s.action && (
                  <svg className="w-3 h-3 text-text-muted ml-auto flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Health score + In Progress + Next Up + Velocity */}
      {features.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Health score */}
          {healthScore !== null && (
            <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 flex flex-col gap-2">
              <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Health Score</span>
              <div className="flex items-end gap-2">
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: healthScore >= 75 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444' }}
                >
                  {healthScore}
                </span>
                <span className="text-sm text-text-muted pb-0.5">/ 100</span>
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${healthScore}%`,
                    backgroundColor: healthScore >= 75 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-text-muted">
                <span>{blockedFeatures === 0 ? '✓' : '⚠'} {blockedFeatures} blocked</span>
                <span>{overdueFeatures === 0 ? '✓' : '⚠'} {overdueFeatures} overdue</span>
                <span>✓ {Math.round((doneFeatures / features.length) * 100)}% done</span>
                <span>{Math.round((estimatedCount / features.length) * 100)}% estimated</span>
              </div>
            </div>
          )}

          {/* In Progress */}
          {inProgressList.length > 0 && (
            <div className="bg-bg-secondary border border-warning/30 rounded-lg px-4 py-3 flex flex-col gap-2">
              <span className="text-[10px] text-warning uppercase tracking-wider">
                In Progress ({inProgressList.length})
              </span>
              <div className="space-y-1.5 flex-1">
                {inProgressList.slice(0, 4).map((f) => {
                  const due = f.dueDate ? new Date(f.dueDate) : null;
                  const dy = due ? Math.ceil((due.getTime() - nowMs) / 86400000) : null;
                  return (
                    <div key={f.id} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
                      <span className="text-xs text-text-primary truncate flex-1">{f.title}</span>
                      {dy !== null && (
                        <span className={`text-[9px] flex-shrink-0 ${dy < 0 ? 'text-danger' : dy <= 3 ? 'text-warning' : 'text-text-muted'}`}>
                          {dy < 0 ? `${Math.abs(dy)}d late` : dy === 0 ? 'today' : `${dy}d`}
                        </span>
                      )}
                    </div>
                  );
                })}
                {inProgressList.length > 4 && (
                  <p className="text-[9px] text-text-placeholder">+{inProgressList.length - 4} more</p>
                )}
              </div>
            </div>
          )}

          {/* Next Up */}
          {nextUp.length > 0 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 flex flex-col gap-2">
              <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Next Up</span>
              <div className="space-y-1.5 flex-1">
                {nextUp.map((f) => (
                  <div key={f.id} className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_CONFIG_OV[f.priority].color }}
                    />
                    <span className="text-xs text-text-primary truncate flex-1">{f.title}</span>
                    {f.estimate && f.estimate !== '?' && (
                      <span className="text-[9px] text-text-muted flex-shrink-0">{f.estimate}pt</span>
                    )}
                  </div>
                ))}
              </div>
              {unblocked.length > 3 && (
                <p className="text-[9px] text-text-placeholder">+{unblocked.length - 3} more unblocked</p>
              )}
            </div>
          )}

          {/* Velocity */}
          {velocity && (
            <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 flex flex-col gap-2">
              <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">Velocity</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-text-primary tabular-nums">
                  {velocity.avg.toFixed(1)}
                </span>
                <span className="text-sm text-text-muted pb-0.5">/ week</span>
              </div>
              <div className="flex items-end gap-1 h-8">
                {velocity.weeks.map((count, i) => {
                  const maxWeek = Math.max(...velocity.weeks, 1);
                  const h = Math.max(4, Math.round((count / maxWeek) * 28));
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${h}px`,
                        backgroundColor: i === 3 ? '#6366f1' : '#6366f130',
                        alignSelf: 'flex-end',
                      }}
                      title={`Week ${i === 3 ? '(this)' : `-${3 - i}`}: ${count} done`}
                    />
                  );
                })}
              </div>
              <p className="text-[9px] text-text-placeholder">last 4 weeks · {velocity.weeks.reduce((a,b)=>a+b,0)} total done</p>
              {dailyCompletions && (
                <div title="Daily completions (last 14 days)">
                  <div className="flex items-end gap-px h-5 mt-1">
                    {dailyCompletions.map((count, i) => {
                      const maxDay = Math.max(...dailyCompletions, 1);
                      const h = count === 0 ? 2 : Math.max(3, Math.round((count / maxDay) * 18));
                      const isToday = i === 13;
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}px`,
                            backgroundColor: count === 0
                              ? 'var(--color-bg-tertiary)'
                              : isToday ? '#10b981' : '#6366f150',
                            alignSelf: 'flex-end',
                          }}
                          title={`${count} done${i === 13 ? ' (today)' : ''}`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[8px] text-text-placeholder mt-0.5">14-day daily</p>
                </div>
              )}
              {cycleTime && (
                <p className="text-[9px] text-text-muted" title={`Cycle time for ${cycleTime.count} feature${cycleTime.count !== 1 ? 's' : ''} with start+done dates — min ${cycleTime.min}d, max ${cycleTime.max}d`}>
                  ⏱ {cycleTime.avg.toFixed(1)}d avg cycle
                </p>
              )}
              {(() => {
                const remaining = features.filter((f) => !f.done).length;
                if (remaining === 0 || velocity.avg <= 0) return null;
                const weeksLeft = remaining / velocity.avg;
                const eta = new Date(Date.now() + weeksLeft * 7 * 24 * 60 * 60 * 1000);
                const etaStr = eta.toLocaleDateString('default', { month: 'short', day: 'numeric', year: eta.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
                return (
                  <p
                    className="text-[9px] text-accent"
                    title={`${remaining} remaining ÷ ${velocity.avg.toFixed(1)}/week ≈ ${weeksLeft.toFixed(1)} weeks`}
                  >
                    🏁 ETA ~{etaStr} ({weeksLeft < 1 ? '< 1 wk' : `~${Math.ceil(weeksLeft)}w`})
                  </p>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {/* Assignee workload */}
      {assigneeWorkload.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">Team Workload</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {assigneeWorkload.map(([name, stats]) => {
              const remaining = stats.total - stats.done;
              const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
              return (
                <div key={name} className="bg-bg-secondary border border-border-default rounded-lg px-3 py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-text-primary truncate">@{name}</span>
                    <span className="text-[9px] text-text-muted flex-shrink-0">{pct}%</span>
                  </div>
                  <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-text-muted">
                    <span>{remaining} open</span>
                    {stats.active > 0 && <span className="text-warning">{stats.active} active</span>}
                    <span>{stats.done} done</span>
                    {stats.pts > 0 && <span className="ml-auto">{stats.pts}pt</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Burndown chart */}
      {burndownData && (
        <section className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">
              30-Day Burndown ({burndownData.usePoints ? 'story points' : 'features'})
            </span>
            <span className="text-[10px] text-text-muted">
              {burndownData.pts[burndownData.pts.length - 1]} remaining of {burndownData.totalWork}
            </span>
          </div>
          {(() => {
            const pts = burndownData.pts;
            const W = 600; const H = 60;
            const maxY = burndownData.totalWork;
            const toX = (i: number) => (i / (pts.length - 1)) * W;
            const toY = (v: number) => maxY > 0 ? H - (v / maxY) * H : H;
            // Actual line
            const actualPath = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
            // Ideal line (linear from pts[0] to 0)
            const idealPath = `M0,${toY(pts[0]).toFixed(1)} L${W},${H}`;
            // Fill under actual
            const fillPath = actualPath + ` L${W},${H} L0,${H} Z`;
            return (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }} preserveAspectRatio="none">
                {/* Ideal line */}
                <path d={idealPath} stroke="#6366f130" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                {/* Fill */}
                <path d={fillPath} fill="#6366f112" />
                {/* Actual line */}
                <path d={actualPath} stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {/* Today dot */}
                <circle cx={W} cy={toY(pts[pts.length - 1]).toFixed(1)} r="3" fill="#6366f1" />
              </svg>
            );
          })()}
          <div className="flex items-center gap-3 text-[9px] text-text-muted mt-1">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-2" viewBox="0 0 16 8"><path d="M0 4 L16 4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Actual
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-2" viewBox="0 0 16 8"><path d="M0 4 L16 4" stroke="#6366f150" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
              Ideal
            </span>
            <span className="ml-auto">←30 days ago · today→</span>
          </div>
        </section>
      )}

      {/* Feature progress by milestone */}
      {milestones.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
            Progress by Milestone
          </label>
          <div className="space-y-2">
            {milestones.map((m) => {
              const mFeatures = features.filter((f) => f.milestone === m.id);
              const mDone = mFeatures.filter((f) => f.done).length;
              const mActive = mFeatures.filter((f) => f.inProgress && !f.done).length;
              const pct = mFeatures.length > 0 ? Math.round((mDone / mFeatures.length) * 100) : 0;
              const activePct = mFeatures.length > 0 ? Math.round((mActive / mFeatures.length) * 100) : 0;
              const mPoints = mFeatures.reduce((sum, f) => { const n = parseInt(f.estimate ?? '', 10); return sum + (isNaN(n) ? 0 : n); }, 0);
              const mDonePoints = mFeatures.filter((f) => f.done).reduce((sum, f) => { const n = parseInt(f.estimate ?? '', 10); return sum + (isNaN(n) ? 0 : n); }, 0);
              return (
                <div key={m.id} className="bg-bg-secondary border border-border-default rounded-lg px-4 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Milestone color picker */}
                      {(() => {
                        const [showPicker, setShowPicker] = useState(false);
                        return (
                          <div className="relative">
                            <button
                              type="button"
                              className="w-3 h-3 rounded-full cursor-pointer ring-offset-1 hover:ring-1 hover:ring-border-active transition-all"
                              style={{ backgroundColor: m.color }}
                              onClick={() => setShowPicker((v) => !v)}
                              title="Change milestone color"
                            />
                            {showPicker && (
                              <div
                                className="absolute z-50 top-5 left-0 flex gap-1 p-1.5 bg-bg-secondary border border-border-active rounded-lg shadow-lg"
                                onMouseLeave={() => setShowPicker(false)}
                              >
                                {MILESTONE_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => { updateMilestone(m.id, { color: c }); setShowPicker(false); }}
                                    className="w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-125"
                                    style={{ backgroundColor: c, outline: c === m.color ? '2px solid white' : 'none', outlineOffset: '1px' }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <InlineEdit
                        value={m.name}
                        onSave={(v) => updateMilestone(m.id, { name: v.trim() || m.name })}
                        className="text-xs font-medium text-text-primary"
                      />
                      <InlineEdit
                        value={m.description ?? ''}
                        onSave={(v) => updateMilestone(m.id, { description: v })}
                        placeholder="Add description..."
                        className="text-[10px] text-text-muted italic"
                      />
                      {mActive > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
                          {mActive} active
                        </span>
                      )}
                      {mPoints > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/20" title="Story points done / total">
                          {mDonePoints}/{mPoints} pts
                        </span>
                      )}
                      {/* ETA based on velocity when no due date set */}
                      {!m.dueDate && velocity && velocity.avg > 0 && mDone < mFeatures.length && mFeatures.length > 0 && (() => {
                        const remaining = mFeatures.length - mDone;
                        const weeksNeeded = remaining / velocity.avg;
                        const eta = new Date(Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000);
                        return (
                          <span
                            title={`Estimated completion at ${velocity.avg.toFixed(1)} features/week`}
                            className="text-[9px] px-1.5 py-0.5 rounded-full border bg-bg-tertiary text-text-muted border-border-default"
                          >
                            ~{eta.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        );
                      })()}
                      {/* Milestone due date — inline editable */}
                      {(() => {
                        if (m.dueDate) {
                          const d = new Date(m.dueDate);
                          const dy = Math.ceil((d.getTime() - nowMs) / 86400000);
                          const over = dy < 0;
                          const soon = dy >= 0 && dy <= 7;
                          return (
                            <span className="relative inline-flex items-center group/mdue">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium cursor-pointer ${
                                  over ? 'bg-danger/15 text-danger border-danger/30' :
                                  soon ? 'bg-warning/15 text-warning border-warning/30' :
                                  'bg-bg-tertiary text-text-muted border-border-default'
                                }`}
                                title={`Due: ${d.toLocaleDateString()} — click to change`}
                              >
                                {over ? `${Math.abs(dy)}d overdue` : dy === 0 ? 'due today' : dy === 1 ? 'tomorrow' : `${dy}d`}
                              </span>
                              <input
                                type="date"
                                value={m.dueDate}
                                onChange={(e) => updateMilestone(m.id, { dueDate: e.target.value || undefined })}
                                className="absolute inset-0 opacity-0 w-full cursor-pointer"
                                title="Change due date"
                              />
                            </span>
                          );
                        }
                        return (
                          <span className="relative inline-flex items-center">
                            <span className="text-[9px] text-text-placeholder opacity-0 group-hover:opacity-60 hover:!opacity-100 px-1.5 py-0.5 rounded-full border border-dashed border-border-default cursor-pointer transition-opacity">
                              + due date
                            </span>
                            <input
                              type="date"
                              value=""
                              onChange={(e) => updateMilestone(m.id, { dueDate: e.target.value || undefined })}
                              className="absolute inset-0 opacity-0 w-full cursor-pointer"
                              title="Set due date"
                            />
                          </span>
                        );
                      })()}
                    </div>
                    <span className="text-[10px] text-text-muted">{mDone}/{mFeatures.length} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: m.color }}
                    />
                    {activePct > 0 && (
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${activePct}%`, backgroundColor: '#f59e0b', opacity: 0.6 }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming due dates */}
      {upcomingFeatures.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
            Upcoming Due Dates
          </label>
          <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
            {upcomingFeatures.map((f) => {
              const due = new Date(f.dueDate!);
              const dy = Math.ceil((due.getTime() - nowMs) / 86400000);
              const isOverdue = dy < 0;
              const isSoon = dy >= 0 && dy <= 3;
              const m = milestones.find((ms) => ms.id === f.milestone);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-2 border-b border-border-default/50 last:border-0 hover:bg-bg-hover transition-colors cursor-pointer"
                  onClick={() => setActiveTab('features')}
                  title={`${f.title} — due ${due.toLocaleDateString()}`}
                >
                  <span
                    className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 w-18 text-center ${
                      isOverdue ? 'bg-danger/15 text-danger border-danger/30' :
                      isSoon ? 'bg-warning/15 text-warning border-warning/30' :
                      'bg-bg-tertiary text-text-muted border-border-default'
                    }`}
                  >
                    {isOverdue ? `${Math.abs(dy)}d late` : dy === 0 ? 'today' : dy === 1 ? 'tomorrow' : `${dy}d`}
                  </span>
                  <span className={`flex-1 text-xs truncate ${f.inProgress ? 'text-warning' : 'text-text-primary'}`}>
                    {f.title}
                  </span>
                  {m && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${m.color}20`, color: m.color }}
                    >
                      {m.name}
                    </span>
                  )}
                  <span className="text-[9px] text-text-muted flex-shrink-0">{due.toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Story points + priority breakdown */}
      {features.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Story points */}
          {totalPoints > 0 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3">
              <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
                Story Points
              </label>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-text-primary">{donePoints}</span>
                <span className="text-sm text-text-muted pb-0.5">/ {totalPoints} pts</span>
                {totalPoints - donePoints > 0 && (
                  <span className="text-[10px] text-text-muted ml-auto pb-0.5">
                    {totalPoints - donePoints} remaining
                    {activePoints > 0 && <span className="text-warning ml-1">· {activePoints} active</span>}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden flex">
                <div
                  className="h-full rounded-l-full bg-success transition-all duration-500"
                  style={{ width: `${totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0}%` }}
                />
                {activePoints > 0 && (
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${Math.round((activePoints / totalPoints) * 100)}%`, backgroundColor: '#f59e0b', opacity: 0.7 }}
                  />
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">
                {estimatedCount}/{features.length} estimated · {Math.round((donePoints / totalPoints) * 100)}% done
                {totalValuePoints > 0 && (
                  <span className="ml-2 text-success/80">
                    · {totalValuePoints} val pts remaining
                    {avgEfficiency !== null && (
                      <span title="Average value÷effort efficiency ratio across scored features"> · {avgEfficiency.toFixed(1)}x avg efficiency</span>
                    )}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Priority breakdown */}
          {priorityCounts.length > 0 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3">
              <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
                By Priority
              </label>
              <div className="space-y-1.5">
                {priorityCounts.map(({ priority, total, done }) => (
                  <div key={priority} className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-text-muted">{PRIORITY_CONFIG_OV[priority].label}</span>
                    <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((done / total) * 100)}%`,
                          backgroundColor: PRIORITY_CONFIG_OV[priority].color,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted w-10 text-right tabular-nums">{done}/{total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kind breakdown */}
          {kindCounts.length > 1 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3">
              <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
                By Kind
              </label>
              <div className="space-y-1.5">
                {kindCounts.map(({ kind, label, total, done, color }) => (
                  <div key={kind} className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-text-muted">{label}</span>
                    <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((done / total) * 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted w-10 text-right tabular-nums">{done}/{total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Effort / Value matrix */}
      {(() => {
        const mf = features.filter(
          (f) => !f.done && f.estimate && f.estimate !== '?' && f.value && f.value !== '?'
        );
        if (mf.length < 2) return null;
        const quickWins = mf.filter((f) => parseInt(f.estimate!) <= 5 && parseInt(f.value!) > 5);
        const bigBets   = mf.filter((f) => parseInt(f.estimate!) > 5  && parseInt(f.value!) > 5);
        const fillIns   = mf.filter((f) => parseInt(f.estimate!) <= 5 && parseInt(f.value!) <= 5);
        const skip      = mf.filter((f) => parseInt(f.estimate!) > 5  && parseInt(f.value!) <= 5);
        const Q = ({
          label, count, color, bg, border, items, title,
        }: { label: string; count: number; color: string; bg: string; border: string; items: typeof mf; title: string }) => (
          <div
            className={`rounded-lg border px-3 py-2.5 flex flex-col gap-1.5 ${bg} ${border}`}
            title={title}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>{label}</span>
              <span className="text-[10px] font-mono font-medium" style={{ color }}>{count}</span>
            </div>
            <div className="space-y-0.5">
              {items.slice(0, 3).map((f) => (
                <div key={f.id} className="flex items-center gap-1 min-w-0">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.7 }} />
                  <span className="text-[10px] text-text-secondary truncate">{f.title}</span>
                </div>
              ))}
              {items.length > 3 && (
                <span className="text-[9px] text-text-placeholder">+{items.length - 3} more</span>
              )}
              {items.length === 0 && (
                <span className="text-[9px] text-text-placeholder italic">none</span>
              )}
            </div>
          </div>
        );
        return (
          <section>
            <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-1">
              Effort / Value Matrix
              <span className="ml-2 normal-case tracking-normal text-text-placeholder font-normal">({mf.length} scored features)</span>
            </label>
            <div className="flex items-stretch gap-2">
              <div className="flex flex-col items-center justify-between text-[8px] text-text-muted pr-1 select-none" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', minWidth: 12 }}>
                <span>HIGH VALUE</span>
                <span>LOW VALUE</span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Q
                  label="⚡ Quick Wins"
                  count={quickWins.length}
                  color="#10b981"
                  bg="bg-success/5"
                  border="border-success/25"
                  items={quickWins}
                  title="Low effort (≤5pts) + High value (>5) — do these first"
                />
                <Q
                  label="🚀 Big Bets"
                  count={bigBets.length}
                  color="#6366f1"
                  bg="bg-accent/5"
                  border="border-accent/25"
                  items={bigBets}
                  title="High effort (>5pts) + High value — plan carefully"
                />
                <Q
                  label="▪ Fill-ins"
                  count={fillIns.length}
                  color="#64748b"
                  bg="bg-bg-secondary"
                  border="border-border-default"
                  items={fillIns}
                  title="Low effort + Low value — do when idle"
                />
                <Q
                  label="✕ Skip?"
                  count={skip.length}
                  color="#ef4444"
                  bg="bg-danger/5"
                  border="border-danger/20"
                  items={skip}
                  title="High effort + Low value — consider skipping"
                />
              </div>
            </div>
            <div className="flex justify-center mt-1 gap-6 text-[8px] text-text-placeholder select-none">
              <span>◀ LOW EFFORT</span>
              <span>HIGH EFFORT ▶</span>
            </div>
          </section>
        );
      })()}

      {/* Feature tags */}
      {topTags.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
            Feature Tags ({topTags.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => {
              const tagDone = features.filter((f) => (f.tags ?? []).includes(tag) && f.done).length;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTab('features')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border-default hover:border-border-active transition-colors cursor-pointer group"
                  title={`${tagDone}/${count} done`}
                >
                  <span className="text-[10px] text-text-secondary font-mono">#{tag}</span>
                  <span className="text-[9px] text-text-muted tabular-nums">{tagDone}/{count}</span>
                  <div className="w-8 h-1 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-success/70 transition-all"
                      style={{ width: `${count > 0 ? Math.round((tagDone / count) * 100) : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* FK relationships */}
      {fkRelationships.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
            Relationships ({fkRelationships.length})
          </label>
          <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
            {fkRelationships.map((rel, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 border-b border-border-default/60 last:border-0 text-xs"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: rel.fromColor }}
                />
                <span className="text-text-primary font-mono">{rel.from}</span>
                <span className="text-text-muted font-mono text-[10px]">.{rel.fromCol}</span>
                <svg className="w-4 h-3 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6h20M14 1l7 5-7 5" />
                </svg>
                <span className="text-text-secondary font-mono">{rel.to}</span>
                <span className="text-text-muted font-mono text-[10px]">.{rel.toCol}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Column type distribution */}
      {topTypes.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
            Column Types ({totalColumns} total)
          </label>
          <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 space-y-1.5">
            {topTypes.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="w-16 text-[10px] font-mono text-text-secondary text-right flex-shrink-0">{type}</span>
                <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/60 transition-all duration-500"
                    style={{ width: `${Math.round((count / maxTypeCount) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-muted w-6 text-right tabular-nums flex-shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      <section>
        <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
          Description
        </label>
        <textarea
          value={meta.description}
          onChange={(e) => updateMeta({ description: e.target.value })}
          placeholder="Describe your project..."
          className="w-full text-sm bg-bg-secondary border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors resize-y min-h-[6rem]"
        />
      </section>

      {/* Tech Stack */}
      <section>
        <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
          Tech Stack Notes
        </label>
        <textarea
          value={meta.techStackNotes}
          onChange={(e) => updateMeta({ techStackNotes: e.target.value })}
          placeholder="React, Node.js, PostgreSQL..."
          className="w-full text-sm bg-bg-secondary border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors resize-y min-h-[4rem]"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: 'Next.js', snippet: 'Frontend: Next.js + TypeScript + Tailwind CSS' },
            { label: 'React SPA', snippet: 'Frontend: React + TypeScript + Vite + TanStack Query' },
            { label: 'Vue 3', snippet: 'Frontend: Vue 3 + TypeScript + Pinia + Vite' },
            { label: 'Node/Express', snippet: 'Backend: Node.js + TypeScript + Express' },
            { label: 'Fastify', snippet: 'Backend: Node.js + TypeScript + Fastify' },
            { label: 'NestJS', snippet: 'Backend: Node.js + NestJS + TypeScript' },
            { label: 'FastAPI', snippet: 'Backend: Python + FastAPI + SQLAlchemy' },
            { label: 'Go/Gin', snippet: 'Backend: Go + Gin + GORM' },
            { label: 'PostgreSQL', snippet: 'Database: PostgreSQL + Prisma ORM' },
            { label: 'MySQL', snippet: 'Database: MySQL + DrizzleORM' },
            { label: 'MongoDB', snippet: 'Database: MongoDB + Mongoose' },
            { label: 'Redis', snippet: 'Cache: Redis' },
            { label: 'Docker', snippet: 'Infra: Docker + docker-compose' },
            { label: 'Railway', snippet: 'Deploy: Railway' },
            { label: 'Vercel', snippet: 'Deploy: Vercel' },
            { label: 'Stripe', snippet: 'Payments: Stripe' },
            { label: 'Auth0', snippet: 'Auth: Auth0 / JWT' },
            { label: 'AWS S3', snippet: 'Storage: AWS S3' },
          ].map(({ label, snippet }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const current = meta.techStackNotes?.trim();
                if (current && current.includes(snippet)) return;
                updateMeta({ techStackNotes: current ? `${current}\n${snippet}` : snippet });
              }}
              title={`Add: ${snippet}`}
              className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                meta.techStackNotes?.includes(snippet)
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border-default text-text-muted hover:border-border-active hover:text-text-secondary bg-bg-secondary'
              }`}
            >
              {meta.techStackNotes?.includes(snippet) ? '✓ ' : '+ '}{label}
            </button>
          ))}
        </div>
      </section>

      {/* Dev Notes / Changelog */}
      <section>
        <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
          Dev Notes / Changelog
        </label>
        <textarea
          value={meta.notes ?? ''}
          onChange={(e) => updateMeta({ notes: e.target.value })}
          placeholder="Track decisions, changes, and important notes here..."
          className="w-full text-sm bg-bg-secondary border border-border-default rounded-lg px-4 py-3 text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-focus transition-colors resize-y min-h-[6rem] font-mono text-xs"
        />
      </section>

      {/* Entity Coverage */}
      {entityCoverage.length > 0 && (
        <section>
          <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
            Entity Coverage
          </label>
          <div className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 space-y-1.5">
            {entityCoverage.map(({ entity, count }) => {
              const max = entityCoverage[0].count;
              const doneCt = features.filter((f) => f.entityRefs.includes(entity.id) && f.done).length;
              return (
                <div key={entity.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entity.color }} />
                  <span className="w-20 text-[10px] text-text-secondary truncate flex-shrink-0">{entity.name}</span>
                  <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((count / max) * 100)}%`, backgroundColor: entity.color, opacity: 0.7 }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted w-16 text-right tabular-nums flex-shrink-0">{doneCt}/{count} features</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Value vs Effort matrix */}
      {(() => {
        const scored = features.filter(
          (f) => !f.done && f.estimate && f.estimate !== '?' && f.value && f.value !== '?'
        );
        if (scored.length < 2) return null;

        const toNum = (v: string | undefined) => {
          const n = parseInt(v ?? '', 10);
          return isNaN(n) ? 0 : n;
        };
        const medianEffort = 5; // story point median pivot
        const medianValue = 5;

        const qData = [
          {
            id: 'quick-wins',
            label: 'Quick Wins',
            sub: 'Low effort, high value — do first',
            color: '#10b981',
            features: scored.filter((f) => toNum(f.estimate) <= medianEffort && toNum(f.value) > medianValue),
          },
          {
            id: 'big-bets',
            label: 'Big Bets',
            sub: 'High effort, high value — plan carefully',
            color: '#6366f1',
            features: scored.filter((f) => toNum(f.estimate) > medianEffort && toNum(f.value) > medianValue),
          },
          {
            id: 'fill-ins',
            label: 'Fill-ins',
            sub: 'Low effort, low value — if time allows',
            color: '#64748b',
            features: scored.filter((f) => toNum(f.estimate) <= medianEffort && toNum(f.value) <= medianValue),
          },
          {
            id: 'hard-slogs',
            label: 'Hard Slogs',
            sub: 'High effort, low value — deprioritize',
            color: '#ef4444',
            features: scored.filter((f) => toNum(f.estimate) > medianEffort && toNum(f.value) <= medianValue),
          },
        ];

        return (
          <section>
            <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-1">
              Value vs Effort Matrix
              <span className="ml-2 normal-case font-normal opacity-60">({scored.length} features scored)</span>
            </label>
            <p className="text-[10px] text-text-placeholder mb-2">Features with both Pts (effort) and Val (value) scores — pivot at 5pts</p>
            <div className="grid grid-cols-2 gap-2">
              {qData.map((q) => (
                <div
                  key={q.id}
                  className="bg-bg-secondary border border-border-default rounded-lg px-3 py-2.5"
                  style={{ borderLeftColor: q.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium" style={{ color: q.color }}>{q.label}</span>
                    <span className="text-[10px] text-text-muted tabular-nums">{q.features.length}</span>
                  </div>
                  <p className="text-[9px] text-text-placeholder mb-1.5">{q.sub}</p>
                  {q.features.length > 0 ? (
                    <div className="space-y-0.5">
                      {q.features.slice(0, 4).map((f) => (
                        <div key={f.id} className="flex items-center gap-1.5 text-[9px]">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: q.color, opacity: 0.6 }} />
                          <span className="text-text-secondary truncate flex-1">{f.title}</span>
                          <span className="text-text-muted flex-shrink-0 tabular-nums">
                            {f.estimate}→{f.value}
                            {(() => {
                              const e = parseInt(f.estimate ?? '', 10);
                              const v = parseInt(f.value ?? '', 10);
                              return (!isNaN(e) && !isNaN(v) && e > 0)
                                ? <span className="opacity-60 ml-0.5">({(v/e).toFixed(1)}x)</span>
                                : null;
                            })()}
                          </span>
                        </div>
                      ))}
                      {q.features.length > 4 && (
                        <p className="text-[9px] text-text-placeholder ml-3">+{q.features.length - 4} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] text-text-placeholder">No features</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Dependency overview */}
      {(() => {
        const blockedItems = features.filter((f) => !f.done && (f.blockedBy ?? []).some((bid) => features.find((bf) => bf.id === bid && !bf.done)));
        if (blockedItems.length === 0) return null;
        return (
          <section>
            <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
              Blocked Features ({blockedItems.length})
            </label>
            <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
              {blockedItems.map((f) => {
                const activeBlockers = (f.blockedBy ?? [])
                  .map((bid) => features.find((bf) => bf.id === bid && !bf.done))
                  .filter(Boolean) as typeof features;
                return (
                  <div key={f.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-border-default/60 last:border-0">
                    <span className="text-danger mt-0.5 flex-shrink-0 text-sm">⛔</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-primary truncate">{f.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Blocked by: {activeBlockers.map((b) => b.title).join(' · ')}
                      </p>
                    </div>
                    {f.priority !== 'medium' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 bg-bg-tertiary text-text-muted border border-border-default">
                        {f.priority}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Stale In-Progress Features (started > 14 days ago, not done) */}
      {(() => {
        const stale = features.filter((f) => {
          if (f.done || !f.inProgress || !f.startDate) return false;
          const daysSinceStart = Math.round((Date.now() - new Date(f.startDate).getTime()) / 86400000);
          return daysSinceStart > 14;
        }).sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
        if (stale.length === 0) return null;
        return (
          <section>
            <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
              <span className="text-warning">⚠</span>
              Stale In-Progress ({stale.length})
              <span className="text-text-placeholder normal-case">· started &gt;14 days ago</span>
            </label>
            <div className="bg-bg-secondary border border-warning/20 rounded-lg overflow-hidden">
              {stale.map((f) => {
                const daysSinceStart = Math.round((Date.now() - new Date(f.startDate!).getTime()) / 86400000);
                const m = milestones.find((ms) => ms.id === f.milestone);
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-4 py-2 border-b border-border-default/50 last:border-0 hover:bg-bg-hover transition-colors"
                  >
                    <span className="text-warning text-sm flex-shrink-0">▶</span>
                    <span className="flex-1 text-xs text-warning truncate">{f.title}</span>
                    {m && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${m.color}20`, color: m.color }}>
                        {m.name}
                      </span>
                    )}
                    <span
                      className="text-[9px] text-warning/80 flex-shrink-0 tabular-nums"
                      title={`Started: ${new Date(f.startDate!).toLocaleDateString()}`}
                    >
                      {daysSinceStart}d active
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Recently Completed */}
      {(() => {
        const recentlyDone = features
          .filter((f) => f.done && f.completedAt)
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
          .slice(0, 5);
        if (recentlyDone.length === 0) return null;
        return (
          <section>
            <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
              Recently Completed
            </label>
            <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
              {recentlyDone.map((f) => {
                const completedDate = new Date(f.completedAt!);
                const daysAgo = Math.round((Date.now() - completedDate.getTime()) / 86400000);
                const cycle = f.startDate
                  ? Math.round((new Date(f.completedAt!).getTime() - new Date(f.startDate).getTime()) / 86400000)
                  : null;
                const m = milestones.find((ms) => ms.id === f.milestone);
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-4 py-2 border-b border-border-default/50 last:border-0 hover:bg-bg-hover transition-colors"
                  >
                    <span className="text-success text-sm flex-shrink-0">✓</span>
                    <span className="flex-1 text-xs text-text-primary truncate line-through text-text-muted">{f.title}</span>
                    {cycle !== null && cycle >= 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success/70 border border-success/20 flex-shrink-0" title={`Cycle time: ${cycle}d`}>
                        ⏱{cycle}d
                      </span>
                    )}
                    {m && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `${m.color}20`, color: m.color }}
                      >
                        {m.name}
                      </span>
                    )}
                    <span className="text-[9px] text-text-muted flex-shrink-0 tabular-nums" title={completedDate.toLocaleString()}>
                      {daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* API Coverage */}
      {entities.length > 0 && endpoints.length > 0 && (() => {
        const coveredIds = new Set(endpoints.map((ep) => ep.entityRef).filter(Boolean) as string[]);
        const covered = entities.filter((e) => coveredIds.has(e.id));
        const uncovered = entities.filter((e) => !coveredIds.has(e.id));
        const coveragePct = Math.round((covered.length / entities.length) * 100);
        // per-entity endpoint breakdown
        const epByEntity = entities.map((e) => ({
          entity: e,
          eps: endpoints.filter((ep) => ep.entityRef === e.id),
        }));
        const maxEps = Math.max(...epByEntity.map((x) => x.eps.length), 1);
        return (
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium">
                API Coverage
              </label>
              <span className={`text-[10px] font-mono tabular-nums ${coveragePct === 100 ? 'text-success' : coveragePct >= 60 ? 'text-warning' : 'text-text-muted'}`}>
                {covered.length}/{entities.length} entities · {coveragePct}%
              </span>
            </div>
            {/* Coverage bar */}
            <div className="h-1.5 rounded-full bg-bg-tertiary mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${coveragePct === 100 ? 'bg-success' : coveragePct >= 60 ? 'bg-warning' : 'bg-accent'}`}
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            {/* Per-entity rows */}
            <div className="space-y-1">
              {epByEntity.map(({ entity, eps }) => {
                const byMethod = eps.reduce<Record<string, number>>((acc, ep) => {
                  acc[ep.method] = (acc[ep.method] ?? 0) + 1;
                  return acc;
                }, {});
                const implCount = eps.filter((e) => e.status === 'implemented').length;
                return (
                  <div key={entity.id} className="flex items-center gap-2 group">
                    <span className="w-28 flex-shrink-0 text-[11px] text-text-secondary truncate" title={entity.name}>
                      {entity.name}
                    </span>
                    {eps.length > 0 ? (
                      <>
                        {/* Method badges */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) =>
                            byMethod[m] ? (
                              <span
                                key={m}
                                className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                                  m === 'GET' ? 'bg-success/10 text-success' :
                                  m === 'POST' ? 'bg-accent/10 text-accent' :
                                  m === 'PUT' || m === 'PATCH' ? 'bg-warning/10 text-warning' :
                                  'bg-red-500/10 text-red-400'
                                }`}
                              >
                                {byMethod[m] > 1 ? `${byMethod[m]}×` : ''}{m}
                              </span>
                            ) : null
                          )}
                        </div>
                        {/* Bar */}
                        <div className="flex-1 h-1 rounded-full bg-bg-tertiary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent/40"
                            style={{ width: `${(eps.length / maxEps) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-text-muted tabular-nums w-6 text-right flex-shrink-0">
                          {eps.length}
                        </span>
                        {implCount > 0 && (
                          <span className="text-[9px] text-success/60 tabular-nums flex-shrink-0">
                            {implCount}/{eps.length} impl
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-text-muted/50 italic">no endpoints</span>
                    )}
                  </div>
                );
              })}
            </div>
            {uncovered.length > 0 && (
              <p className="mt-2 text-[10px] text-text-muted">
                Not covered: {uncovered.map((e) => e.name).join(', ')}
              </p>
            )}
          </section>
        );
      })()}

      {/* Quick Export */}
      <section>
        <label className="block text-[10px] text-text-muted/80 uppercase tracking-wide font-medium mb-2">
          Quick Export
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyStatusSummary}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              summaryCopied
                ? 'bg-success/10 text-success border-success/40'
                : 'bg-bg-secondary border-border-default hover:border-border-active hover:text-text-primary text-text-secondary'
            }`}
            title="Copy a status summary as markdown (for standups, status updates, etc.)"
          >
            <span>{summaryCopied ? '✓' : '📋'}</span>
            {summaryCopied ? 'Copied!' : 'Status Summary'}
          </button>
          {/* Project Starter */}
          <button
            type="button"
            onClick={() => setShowStarterModal(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer bg-bg-secondary border-border-default hover:border-accent/50 hover:text-accent text-text-secondary"
            title="Load a project starter template (SaaS, Blog, E-Commerce)"
          >
            <span>🚀</span>
            Load Starter
          </button>
          {/* Multi-agent Claude Code prompt */}
          <button
            type="button"
            onClick={() => setShowPromptModal(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer bg-bg-secondary border-border-default hover:border-accent/50 hover:text-accent text-text-secondary"
            title="Preview and copy a ready-to-paste Claude Code multi-agent build prompt"
          >
            <span>✦</span>
            Claude Prompt
          </button>
          {[
            { label: 'HTML Docs', icon: '🌐', action: () => { exportHtmlDocs(); toast.success('HTML docs exported'); } },
            { label: 'Markdown', icon: '📝', action: () => { exportProjectMarkdown(); toast.success('Markdown exported'); } },
            { label: 'GitHub Issues', icon: '🐙', action: () => { exportGithubIssues(); toast.success('GitHub Issues markdown downloaded'); } },
            { label: 'Changelog', icon: '📜', action: () => { exportChangelog(); toast.success('Changelog downloaded'); } },
            { label: 'OpenAPI YAML', icon: '📄', action: () => { exportOpenApi(); toast.success('OpenAPI YAML downloaded'); } },
            { label: 'Backup JSON', icon: '💾', action: () => { backupProject(); toast.success('Backup downloaded'); } },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-default hover:border-border-active hover:text-text-primary text-text-secondary transition-colors cursor-pointer"
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Scope */}
      <ScopeSection />

      {/* Multi-agent prompt modal */}
      {showPromptModal && (
        <MultiAgentPromptModal onClose={() => setShowPromptModal(false)} />
      )}
      {/* Project Starter modal */}
      {showStarterModal && (
        <ProjectStarterModal onClose={() => setShowStarterModal(false)} />
      )}
    </div>
  );
}
