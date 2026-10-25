'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  RotateCcw,
  Search,
  Timer,
  X,
  Zap,
} from 'lucide-react';
import { StudyBlock } from '../types';
import { fireConfetti } from '../lib/confetti';

interface TimetableProps {
  studyBlocks: StudyBlock[];
  courseTitle?: string;
  onToggleTask: (blockId: string) => void;
  onRebalance: (missedTaskIds: string[]) => void;
  onOpenStudyMaterial: (topic: string) => void;
  onStartFocus?: (topic: string) => void;
  onExportCalendar?: () => void;
  isRebalancing?: boolean;
}

type ChipId = 'all' | 'exam' | 'review' | 'completed';

const CHIPS: { id: ChipId; label: string }[] = [
  { id: 'all', label: 'All topics' },
  { id: 'exam', label: 'Exam sprints' },
  { id: 'review', label: 'Review days' },
  { id: 'completed', label: 'Completed' },
];

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(index * 0.035, 0.3), duration: 0.35, ease: EASE_OUT },
  }),
};

interface DayGroup {
  date: string;
  dayOfWeek: string;
  blocks: StudyBlock[];
}

interface WeekGroup {
  week: number;
  start: string;
  end: string;
  days: DayGroup[];
}

const toLocalISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const dayGap = (from: string, to: string): number =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;

const shortDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const titleCase = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

const formatDuration = (hours: number): string => {
  const mins = Math.round(hours * 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const sumHours = (blocks: StudyBlock[]): number => blocks.reduce((s, b) => s + b.allocatedHours, 0);

const unitTagOf = (topic: string): string | null => {
  const idx = topic.indexOf(':');
  return idx > 0 && idx <= 28 ? topic.slice(0, idx).trim() : null;
};

const isExamSprint = (b: StudyBlock): boolean =>
  b.isExamDay || /\bCAT\b/.test(b.topic) || /\bCAT\b/.test(b.taskDescription);

const isHighYield = (b: StudyBlock): boolean =>
  !b.isExamDay && !b.isReviewDay && (b.allocatedHours >= 3 || /Architecture|Patterns/.test(b.topic));

function groupByWeek(blocks: StudyBlock[]): WeekGroup[] {
  if (blocks.length === 0) return [];

  const sorted = [...blocks].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const origin = sorted[0].date;
  const weeks = new Map<number, WeekGroup>();

  for (const block of sorted) {
    const weekNo = Math.floor(dayGap(origin, block.date) / 7) + 1;
    let week = weeks.get(weekNo);
    if (!week) {
      const start = addDays(origin, (weekNo - 1) * 7);
      week = { week: weekNo, start, end: addDays(start, 6), days: [] };
      weeks.set(weekNo, week);
    }
    let day = week.days.find((d) => d.date === block.date);
    if (!day) {
      day = { date: block.date, dayOfWeek: block.dayOfWeek, blocks: [] };
      week.days.push(day);
    }
    day.blocks.push(block);
  }

  return Array.from(weeks.values());
}

interface SessionRowProps {
  block: StudyBlock;
  index: number;
  todayISO: string;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>, block: StudyBlock) => void;
  onFocus?: (topic: string) => void;
  onRecall: (topic: string) => void;
}

const SessionRow: React.FC<SessionRowProps> = ({ block, index, todayISO, onToggle, onFocus, onRecall }) => {
  const [popKey, setPopKey] = useState(0);

  const done = block.completed;
  const sprint = isExamSprint(block);
  const review = block.isReviewDay && !sprint;
  const overdue = !done && block.date < todayISO;
  const unit = sprint ? null : unitTagOf(block.topic);
  const highYield = isHighYield(block) && !sprint;

  const surface = sprint
    ? 'border-burnout-critical/30 bg-burnout-critical/[0.05]'
    : review
      ? 'border-indigo-400/20 bg-indigo-500/[0.04]'
      : 'border-white/[0.08] bg-[#141721]';

  return (
    <motion.li
      layout
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      transition={{ layout: { type: 'spring', stiffness: 360, damping: 34 } }}
      className={`group relative flex items-start gap-3 rounded-xl border p-3 transition-[opacity,border-color,background-color] duration-200 hover:border-white/[0.18] ${surface} ${
        done ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          if (!done) setPopKey((k) => k + 1);
          onToggle(e, block);
        }}
        aria-label={done ? `Mark ${block.topic} as pending` : `Mark ${block.topic} as completed`}
        aria-pressed={done}
        className="relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full transition-transform duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5 animate-pop-in text-burnout-low" />
        ) : (
          <Circle className="h-5 w-5 text-neutral-500 transition-colors group-hover:text-neutral-300" />
        )}
        {popKey > 0 && (
          <span
            key={popKey}
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-ring-pop rounded-full border border-burnout-low"
          />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] text-neutral-500">
            {shortDate(block.date)} · {titleCase(block.dayOfWeek)}
          </span>

          {unit && (
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
              {unit}
            </span>
          )}

          {sprint && (
            <span className="inline-flex items-center gap-1 rounded border border-burnout-critical/35 bg-burnout-critical/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-red-300">
              <Zap className="h-2.5 w-2.5 fill-red-300" />
              Exam sprint
            </span>
          )}

          {review && (
            <span className="rounded border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-indigo-200">
              Review
            </span>
          )}

          {highYield && (
            <span className="rounded border border-white/[0.14] px-1.5 py-0.5 font-mono text-[10px] uppercase text-neutral-300">
              High-yield
            </span>
          )}

          {overdue && (
            <span className="rounded border border-burnout-moderate/35 bg-burnout-moderate/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-amber-300">
              Overdue
            </span>
          )}
        </div>

        <p className={`mt-1 text-[13px] font-medium leading-snug ${done ? 'text-neutral-500' : 'text-neutral-100'}`}>
          <span className="relative inline-block max-w-full align-middle">
            {block.topic}
            <motion.span
              aria-hidden
              initial={false}
              animate={{ scaleX: done ? 1 : 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="absolute left-0 right-0 top-1/2 h-px origin-left bg-neutral-400"
            />
          </span>
        </p>

        <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${done ? 'text-neutral-600' : 'text-neutral-400'}`}>
          {block.taskDescription}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-center">
        <span className="hidden items-center gap-1 rounded-md border border-white/[0.08] px-1.5 py-1 font-mono text-[11px] tabular-nums text-neutral-400 sm:inline-flex">
          <Timer className="h-3 w-3" />
          {formatDuration(block.allocatedHours)}
        </span>

        {!block.isExamDay && onFocus && (
          <button
            type="button"
            onClick={() => onFocus(block.topic)}
            aria-label={`Start focus sprint for ${block.topic}`}
            title="Start a 25-minute focus sprint"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/[0.08] px-2.5 py-1.5 text-xs font-medium text-indigo-200 transition-all duration-200 hover:bg-indigo-500/15 active:scale-[0.98]"
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Focus</span>
          </button>
        )}

        {!block.isExamDay && (
          <button
            type="button"
            onClick={() => onRecall(block.topic)}
            aria-label={`Open active recall for ${block.topic}`}
            title="Generate flashcards and a quiz"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.14] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-neutral-100 transition-all duration-200 hover:bg-white/[0.1] active:scale-[0.98]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Recall</span>
          </button>
        )}
      </div>
    </motion.li>
  );
};

export const Timetable: React.FC<TimetableProps> = ({
  studyBlocks,
  courseTitle,
  onToggleTask,
  onRebalance,
  onOpenStudyMaterial,
  onStartFocus,
  onExportCalendar,
  isRebalancing = false,
}) => {
  const [chip, setChip] = useState<ChipId>('all');
  const [query, setQuery] = useState('');
  const [rippleAt, setRippleAt] = useState<number | null>(null);

  const todayISO = toLocalISO(new Date());

  const totalCount = studyBlocks.length;
  const completedCount = studyBlocks.filter((b) => b.completed).length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const counts: Record<ChipId, number> = {
    all: totalCount,
    exam: studyBlocks.filter((b) => isExamSprint(b)).length,
    review: studyBlocks.filter((b) => b.isReviewDay).length,
    completed: completedCount,
  };

  useEffect(() => {
    if (isRebalancing) setRippleAt(Date.now());
  }, [isRebalancing]);

  const weeks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = studyBlocks.filter((b) => {
      if (chip === 'exam' && !isExamSprint(b)) return false;
      if (chip === 'review' && !b.isReviewDay) return false;
      if (chip === 'completed' && !b.completed) return false;
      if (q && !`${b.topic} ${b.taskDescription} ${b.date}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return groupByWeek(visible);
  }, [studyBlocks, chip, query]);

  const handleRebalance = () => {
    const pending = studyBlocks.filter((b) => !b.completed);
    if (pending.length === 0) return;
    const overdue = pending.filter((b) => b.date < todayISO);
    const targets = (overdue.length > 0 ? overdue : pending).slice(0, 5);
    onRebalance(targets.map((b) => b.id));
  };

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>, block: StudyBlock) => {
    const fromPointer = e.clientX !== 0 || e.clientY !== 0;
    if (!block.completed) {
      fireConfetti(fromPointer ? { x: e.clientX, y: e.clientY } : undefined);
    }
    onToggleTask(block.id);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11131a] shadow-subtle">
      {rippleAt !== null && (
        <div
          key={rippleAt}
          aria-hidden
          onAnimationEnd={() => setRippleAt(null)}
          className="pointer-events-none absolute inset-y-0 left-0 z-30 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-burnout-moderate/20 to-transparent"
        />
      )}

      <div className="relative z-10 space-y-4 border-b border-white/[0.06] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-neutral-400" />
              <h2 className="text-base font-semibold tracking-tight text-white">Study roadmap</h2>
            </div>
            <p className="mt-1 font-mono text-[11px] text-neutral-500">
              {completedCount}/{totalCount} sessions · {pendingCount} pending
              {courseTitle ? ` · ${courseTitle}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onExportCalendar && (
              <button
                type="button"
                onClick={onExportCalendar}
                disabled={totalCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Export .ics
              </button>
            )}

            <button
              type="button"
              onClick={handleRebalance}
              disabled={isRebalancing || pendingCount === 0}
              title="Pull overdue sessions into a smarter pace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-burnout-moderate/30 bg-burnout-moderate/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-all duration-200 hover:bg-burnout-moderate/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isRebalancing ? 'animate-spin' : ''}`} />
              {isRebalancing ? 'Rebalancing…' : 'I Fell Behind'}
              <span className="hidden font-mono text-[10px] text-amber-300/70 xl:inline">· Smart Rebalance</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-indigo-400 transition-[width] duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-neutral-400">{progressPercent}%</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter sessions" className="flex flex-wrap gap-1.5">
            {CHIPS.map((c) => {
              const active = chip === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChip(c.id)}
                  className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 active:scale-[0.97] ${
                    active ? 'text-black' : 'text-neutral-400 hover:text-neutral-100'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="timetable-chip"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative inline-flex items-center gap-1.5">
                    {c.label}
                    <span className="font-mono text-[10px] opacity-60">{counts[c.id]}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topic or date…"
              aria-label="Search sessions"
              className="w-full rounded-lg border border-white/[0.08] bg-[#161922] py-1.5 pl-8 pr-8 text-xs text-neutral-200 placeholder:text-neutral-600 transition-colors focus:border-indigo-400/50 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-500 transition-colors hover:text-neutral-200"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-h-[560px] overflow-y-auto p-5 pt-4">
        {weeks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-xs text-neutral-400">No sessions match this view.</p>
            <button
              type="button"
              onClick={() => {
                setChip('all');
                setQuery('');
              }}
              className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:bg-white/[0.05]"
            >
              Show all sessions
            </button>
          </div>
        ) : (
          weeks.map((week) => (
            <div key={week.week} className="mb-6 last:mb-0">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                  Week {week.week}
                </span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[10px] text-neutral-600">
                  {shortDate(week.start)} – {shortDate(week.end)}
                </span>
              </div>

              {week.days.map((day) => (
                <div key={day.date} className="mb-4 last:mb-0">
                  <div className="sticky top-0 z-20 -mx-1 mb-2 flex items-center justify-between bg-[#11131a]/90 px-1 py-1.5 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-100">
                        {titleCase(day.dayOfWeek)}, {shortDate(day.date)}
                      </span>
                      {day.date === todayISO && (
                        <span className="rounded bg-white px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-black">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-neutral-500">
                      {formatDuration(sumHours(day.blocks))}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {day.blocks.map((block, index) => (
                      <SessionRow
                        key={block.id}
                        block={block}
                        index={index}
                        todayISO={todayISO}
                        onToggle={handleToggle}
                        onFocus={onStartFocus}
                        onRecall={onOpenStudyMaterial}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
