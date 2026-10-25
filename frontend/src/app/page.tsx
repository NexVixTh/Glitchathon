'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  Cpu,
  Download,
  Flame,
  Layers,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { BurnoutMeter, type TriageAdvice } from '../components/BurnoutMeter';
import { SyllabusUploader } from '../components/SyllabusUploader';
import { Timetable } from '../components/Timetable';
import { StudyDrawer } from '../components/StudyDrawer';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { ArchitectureModal } from '../components/ArchitectureModal';
import { generateSchedule, rebalanceSchedule, fetchStudyMaterials } from '../lib/api';
import { exportScheduleToICS } from '../lib/ical';
import { fireConfetti } from '../lib/confetti';
import {
  BurnoutRisk,
  ScheduleResponse,
  StudyBlock,
  StudyMaterialResponse,
  SyllabusUploadResponse,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const STORAGE_KEYS = { syllabus: 'syncup_syllabus', schedule: 'syncup_schedule' } as const;
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DAILY_MODERATE_HOURS = 3.5;
const DAILY_HIGH_HOURS = 4.5;

const DEMO_TOPICS = [
  'Module 1: Relational Limitations & The Rise of Distributed NoSQL',
  'Module 2: Key-Value Stores & DynamoDB Partitioning Mechanics',
  'Module 3: Document Stores & MongoDB Aggregation Pipelines',
  'Module 4: Columnar Families & Apache Cassandra Ring Topology',
  'Module 5: Graph Databases & Neo4j Cypher Traversal',
  'Module 6: CAP Theorem, PACELC & Tunable Eventual Consistency',
  'Module 7: CAT-1 Exam Prep & Rapid Formula Drill',
  'Module 8: Object-Oriented Domain Modeling & UML Class Invariants',
  'Module 9: Creational & Structural GoF Design Patterns',
  'Module 10: Behavioral Patterns & Event-Driven Decoupling',
  'Module 11: Clean Architecture, Repository Pattern & DTO Mapping',
  'Module 12: Final Capstone Synthesis & System Architecture Review',
];

const FEATURES: { Icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    Icon: CalendarDays,
    title: 'Real topic pacing',
    body: 'Maps your actual modules across the semester calendar.',
    tone: 'text-indigo-300',
  },
  {
    Icon: RotateCcw,
    title: 'Dynamic rebalance',
    body: 'Absorbs missed sessions and rewrites the pace in one pass.',
    tone: 'text-amber-300',
  },
  {
    Icon: BookOpen,
    title: 'Active recall and focus',
    body: '3D flashcards, mastery quizzes, and a Pomodoro dock.',
    tone: 'text-emerald-300',
  },
];

interface Progress {
  streak: number;
  efficiency: number;
  done: number;
  total: number;
}

interface RebalanceOutcome {
  blocks: StudyBlock[];
  risk: BurnoutRisk;
  target: number;
  advice: string;
  backlogHours: number;
  remainingDays: number;
  source: 'server' | 'local';
}

const toLocalISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDaysISO = (iso: string, n: number): string => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

const dayNameOf = (iso: string): string => DAY_NAMES[parseISO(iso).getDay()];
const sumHours = (blocks: StudyBlock[]): number => blocks.reduce((s, b) => s + b.allocatedHours, 0);
const round1 = (n: number): number => Math.round(n * 10) / 10;

const riskFromLoad = (hours: number): BurnoutRisk =>
  hours > DAILY_HIGH_HOURS ? 'HIGH' : hours > DAILY_MODERATE_HOURS ? 'MODERATE' : 'LOW';

const isSchedule = (v: unknown): v is ScheduleResponse =>
  typeof v === 'object' && v !== null && Array.isArray((v as ScheduleResponse).studyBlocks);

const isSyllabus = (v: unknown): v is SyllabusUploadResponse =>
  typeof v === 'object' && v !== null && Array.isArray((v as SyllabusUploadResponse).extractedTopics);

function buildDemoState(now: Date): { syllabus: SyllabusUploadResponse; schedule: ScheduleResponse } {
  const todayISO = toLocalISO(now);
  const lead = 4; // The plan began four days ago, so the streak is live on load.
  const blocks: StudyBlock[] = [];

  for (let i = 0; i < 28; i++) {
    const date = addDaysISO(todayISO, i - lead);
    const dayOfWeek = dayNameOf(date);
    const id = `demo-block-${i + 1}`;
    const completed = i < lead;

    if (i === 9) {
      blocks.push({
        id,
        date,
        dayOfWeek,
        topic: 'CAT-1 SPRINT: NoSQL Database Systems Examination',
        taskDescription: 'Official CAT-1 slot. Review ACID vs BASE tradeoffs, DynamoDB hashing, and the CAP theorem matrix.',
        allocatedHours: 2,
        completed: false,
        isExamDay: true,
        isReviewDay: false,
      });
      continue;
    }

    const topic = DEMO_TOPICS[i % DEMO_TOPICS.length];
    const isWeekend = dayOfWeek === 'SATURDAY' || dayOfWeek === 'SUNDAY';

    if (i === 8 || isWeekend) {
      blocks.push({
        id,
        date,
        dayOfWeek,
        topic: `${topic} · Review`,
        taskDescription: 'Active recall sprint: flip the conceptual flashcards and take the self-quiz.',
        allocatedHours: 2,
        completed,
        isExamDay: false,
        isReviewDay: true,
      });
      continue;
    }

    blocks.push({
      id,
      date,
      dayOfWeek,
      topic,
      taskDescription: `Deep dive into ${topic}. Hands-on exercises and schema modeling.`,
      allocatedHours: 3,
      completed,
      isExamDay: false,
      isReviewDay: false,
    });
  }

  const totalHours = round1(sumHours(blocks));
  const dailyTargetHours = round1(totalHours / 28);

  return {
    syllabus: {
      title: 'CSE3009: NoSQL Database Systems & SWE2008: OOAD (VIT-AP University)',
      extractedTopics: [...DEMO_TOPICS],
      totalEstimatedHours: totalHours,
      topicCount: DEMO_TOPICS.length,
      summary:
        'Official curriculum aligned with VIT-AP University CAT-1 and CAT-2 examination rubrics. Covering distributed persistence, CAP theorem, and GoF architectural patterns.',
    },
    schedule: {
      studyBlocks: blocks,
      dailyTargetHours,
      totalStudyDays: 28,
      totalHours,
      burnoutRisk: riskFromLoad(dailyTargetHours),
      summary: 'VIT-AP semester plan optimized for CAT-1 scoring with balanced spaced retention.',
    },
  };
}

function computeProgress(blocks: StudyBlock[], todayISO: string): Progress {
  const activeDays = new Set<string>();
  let done = 0;
  let due = 0;
  let dueDone = 0;

  for (const b of blocks) {
    if (b.completed) {
      done++;
      activeDays.add(b.date);
    }
    if (b.date <= todayISO) {
      due++;
      if (b.completed) dueDone++;
    }
  }

  // Today counts once it has a completed session; until then, the streak runs from yesterday.
  let streak = 0;
  let cursor = activeDays.has(todayISO) ? todayISO : addDaysISO(todayISO, -1);
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }

  return {
    streak,
    efficiency: due === 0 ? 100 : Math.round((dueDone / due) * 100),
    done,
    total: blocks.length,
  };
}

function localRebalance(blocks: StudyBlock[], missedIds: string[], todayISO: string): RebalanceOutcome {
  const missed = new Set(missedIds);
  const movable = blocks.filter((b) => missed.has(b.id) && !b.completed && !b.isExamDay);
  const movableIds = new Set(movable.map((b) => b.id));
  const examDates = new Set(blocks.filter((b) => b.isExamDay).map((b) => b.date));
  const kept = blocks.filter((b) => !movableIds.has(b.id));

  const load = new Map<string, number>();
  kept.forEach((b) => load.set(b.date, (load.get(b.date) ?? 0) + b.allocatedHours));

  const placed: StudyBlock[] = [];
  [...movable]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((b) => {
      const anchor = b.date < todayISO ? todayISO : b.date;
      const candidates = Array.from({ length: 14 }, (_, i) => addDaysISO(anchor, i + 1)).filter(
        (d) => !examDates.has(d)
      );
      const parts = Math.min(2, candidates.length);
      if (parts === 0) {
        placed.push(b);
        return;
      }
      const picks = [...candidates]
        .sort((x, y) => (load.get(x) ?? 0) - (load.get(y) ?? 0) || x.localeCompare(y))
        .slice(0, parts);
      const share = round1(b.allocatedHours / parts);
      picks.forEach((date, i) => {
        load.set(date, (load.get(date) ?? 0) + share);
        placed.push({
          ...b,
          id: `${b.id}-r${i + 1}`,
          date,
          dayOfWeek: dayNameOf(date),
          allocatedHours: share,
          isReviewDay: false,
          taskDescription: `Catch-up ${i + 1}/${parts} · ${b.taskDescription}`,
        });
      });
    });

  const next = [...kept, ...placed].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const perDay = new Map<string, number>();
  next.forEach((b) => {
    if (!b.completed && b.date >= todayISO) {
      perDay.set(b.date, (perDay.get(b.date) ?? 0) + b.allocatedHours);
    }
  });
  const peak = round1(Array.from(perDay.values()).reduce((m, v) => Math.max(m, v), 0));
  const backlogHours = round1(sumHours(movable));

  const advice =
    movable.length === 0
      ? 'No pending sessions were selected, so the plan is unchanged.'
      : peak > DAILY_HIGH_HOURS
        ? `Peak load reaches ${peak.toFixed(1)} h/day, above the safe ceiling. Triage non-essential topics and protect one recharge day.`
        : `Moved ${movable.length} missed session${movable.length === 1 ? '' : 's'} (${backlogHours.toFixed(1)} h) into open days, skipping exam dates. Peak load is ${peak.toFixed(1)} h/day, so keep strict 45/15 sprints.`;

  return {
    blocks: next,
    risk: riskFromLoad(peak),
    target: peak,
    advice,
    backlogHours,
    remainingDays: perDay.size,
    source: 'local',
  };
}

const Reveal: React.FC<{ index?: number; className?: string; children: React.ReactNode }> = ({
  index = 0,
  className,
  children,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: EASE_OUT, delay: index * 0.06 }}
    className={className}
  >
    {children}
  </motion.div>
);

const BackendStatus: React.FC<{ state: 'checking' | 'online' | 'offline' }> = ({ state }) => {
  const dot =
    state === 'online' ? 'bg-burnout-low' : state === 'offline' ? 'bg-burnout-critical' : 'bg-neutral-500';
  const label =
    state === 'online'
      ? 'System online · Spring Boot 3.3.x connected'
      : state === 'offline'
        ? 'Backend offline · demo mode still works'
        : 'Connecting to backend…';

  return (
    <div className="hidden items-center gap-2 font-mono text-[11px] text-neutral-400 xl:flex">
      <span className="relative flex h-1.5 w-1.5">
        {state === 'online' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-burnout-low opacity-60" />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
      </span>
      <span>{label}</span>
    </div>
  );
};

const StreakPill: React.FC<{ streak: number; efficiency: number }> = ({ streak, efficiency }) => (
  <div
    className="hidden items-center gap-2 rounded-full border border-burnout-moderate/25 bg-burnout-moderate/[0.07] px-3 py-1 font-mono text-[11px] text-amber-200 md:inline-flex"
    title="Streak: consecutive days with a completed session. Efficiency: completed sessions out of those due so far."
  >
    <Flame className="h-3.5 w-3.5 text-burnout-moderate" />
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={streak}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.22, ease: EASE_OUT }}
        className="tabular-nums"
      >
        {streak === 0 ? 'Start your streak' : `${streak}-Day Streak`}
      </motion.span>
    </AnimatePresence>
    <span className="text-neutral-600">|</span>
    <span className="tabular-nums text-neutral-300">{efficiency}% Efficiency</span>
  </div>
);

const UnitsPanel: React.FC<{
  topics: string[];
  onFocus: (topic: string) => void;
  onRecall: (topic: string) => void;
}> = ({ topics, onFocus, onRecall }) => (
  <section className="rounded-2xl border border-white/[0.08] bg-[#11131a] p-5">
    <header className="flex items-center justify-between border-b border-white/[0.06] pb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
        <Layers className="h-4 w-4 text-neutral-400" />
        Syllabus units
      </h2>
      <span className="font-mono text-[11px] text-neutral-500">{topics.length}</span>
    </header>
    <ul className="mt-3 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
      {topics.map((topic, idx) => (
        <motion.li
          key={`${idx}-${topic}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT, delay: Math.min(idx * 0.03, 0.3) }}
          className="group flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#141721] p-2.5 transition-colors duration-200 hover:border-white/[0.16]"
        >
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-300 group-hover:text-neutral-100" title={topic}>
            {topic}
          </span>
          <button
            type="button"
            aria-label={`Start focus sprint for ${topic}`}
            onClick={() => onFocus(topic)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 active:scale-[0.92]"
          >
            <Brain className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Open active recall for ${topic}`}
            onClick={() => onRecall(topic)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-[0.92]"
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        </motion.li>
      ))}
    </ul>
  </section>
);

export default function SyncUpDashboard() {
  const [syllabus, setSyllabus] = useState<SyllabusUploadResponse | null>(null);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [triage, setTriage] = useState<TriageAdvice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backend, setBackend] = useState<'checking' | 'online' | 'offline'>('checking');
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'info' | 'success' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [architectureOpen, setArchitectureOpen] = useState(false);
  const [drawerTopic, setDrawerTopic] = useState<string | null>(null);
  const [material, setMaterial] = useState<StudyMaterialResponse | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [dock, setDock] = useState({ open: false, topic: 'General study session', startKey: 0 });
  const materialRequest = useRef(0);
  const toastId = useRef(0);

  const todayISO = toLocalISO(new Date());
  const progress = useMemo(
    () => computeProgress(schedule?.studyBlocks ?? [], todayISO),
    [schedule, todayISO]
  );

  const showToast = useCallback((message: string, tone: 'info' | 'success' = 'info') => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone });
  }, []);

  useEffect(() => {
    try {
      const rawSyllabus = localStorage.getItem(STORAGE_KEYS.syllabus);
      const rawSchedule = localStorage.getItem(STORAGE_KEYS.schedule);
      const parsedSyllabus: unknown = rawSyllabus ? JSON.parse(rawSyllabus) : null;
      const parsedSchedule: unknown = rawSchedule ? JSON.parse(rawSchedule) : null;
      if (isSyllabus(parsedSyllabus)) setSyllabus(parsedSyllabus);
      if (isSchedule(parsedSchedule)) setSchedule(parsedSchedule);
    } catch (err) {
      console.warn('Could not restore SyncUp session:', err);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (syllabus) localStorage.setItem(STORAGE_KEYS.syllabus, JSON.stringify(syllabus));
      else localStorage.removeItem(STORAGE_KEYS.syllabus);
      if (schedule) localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(schedule));
      else localStorage.removeItem(STORAGE_KEYS.schedule);
    } catch (err) {
      console.warn('Could not save SyncUp session:', err);
    }
  }, [hydrated, syllabus, schedule]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 3500);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      // A no-cors request resolves whenever the server answers, regardless of CORS headers.
      try {
        await fetch(API_BASE_URL, { mode: 'no-cors', cache: 'no-store' });
        if (!cancelled) setBackend('online');
      } catch {
        if (!cancelled) setBackend('offline');
      }
    };
    void probe();
    const id = window.setInterval(probe, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const handleInstantDemo = useCallback(() => {
    const demo = buildDemoState(new Date());
    setErrorMessage(null);
    setTriage(null);
    setSyllabus(demo.syllabus);
    setSchedule(demo.schedule);
    fireConfetti();
    showToast('Instant demo loaded: VIT-AP CS track, CAT-1 in five days.', 'success');
  }, [showToast]);

  const handleSyllabusProcessed = useCallback(
    async (data: SyllabusUploadResponse) => {
      setErrorMessage(null);
      setTriage(null);
      setSyllabus(data);
      setIsGenerating(true);
      try {
        const plan = await generateSchedule({
          topics: data.extractedTopics,
          dailyAvailableHours: 3,
          startDate: todayISO,
        });
        setSchedule(plan);
        setBackend('online');
        fireConfetti();
        showToast(`Study plan generated for ${data.extractedTopics.length} topics.`, 'success');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to generate schedule from syllabus.');
      } finally {
        setIsGenerating(false);
      }
    },
    [todayISO, showToast]
  );

  const handleToggleTask = useCallback((blockId: string) => {
    setSchedule((prev) =>
      prev
        ? {
            ...prev,
            studyBlocks: prev.studyBlocks.map((b) => (b.id === blockId ? { ...b, completed: !b.completed } : b)),
          }
        : prev
    );
  }, []);

  const handleRebalance = useCallback(
    async (missedIds: string[]) => {
      if (!schedule || isRebalancing) return;
      setIsRebalancing(true);
      setErrorMessage(null);
      const pacing = new Promise<void>((resolve) => window.setTimeout(resolve, 900));
      try {
        const outcome: RebalanceOutcome = await rebalanceSchedule({
          missedTaskIds: missedIds,
          remainingDays: 14,
          currentSchedule: schedule.studyBlocks,
          dailyAvailableHours: 3,
        })
          .then(
            (res): RebalanceOutcome => ({
              blocks: res.adjustedSchedule,
              risk: res.burnoutRisk,
              target: res.newDailyTargetHours,
              advice: res.burnoutAdvice,
              backlogHours: res.backlogHours,
              remainingDays: res.remainingDays,
              source: 'server',
            })
          )
          .catch(() => localRebalance(schedule.studyBlocks, missedIds, todayISO));

        await pacing;

        setSchedule((prev) =>
          prev
            ? {
                ...prev,
                studyBlocks: outcome.blocks,
                dailyTargetHours: outcome.target,
                burnoutRisk: outcome.risk,
                summary: outcome.advice || prev.summary,
              }
            : prev
        );
        setTriage({
          advice: outcome.advice,
          backlogHours: outcome.backlogHours,
          newDailyTargetHours: outcome.target,
          remainingDays: outcome.remainingDays,
        });
        showToast(
          outcome.source === 'server'
            ? `Rebalanced. Pace is now ${outcome.target.toFixed(1)} h/day.`
            : `Backend unreachable. Rebalanced on-device to ${outcome.target.toFixed(1)} h/day.`,
          'info'
        );
      } finally {
        setIsRebalancing(false);
      }
    },
    [schedule, isRebalancing, todayISO, showToast]
  );

  const closeDrawer = useCallback(() => {
    materialRequest.current += 1;
    setDrawerTopic(null);
    setMaterialLoading(false);
  }, []);

  const handleOpenStudyMaterial = useCallback(async (topic: string) => {
    materialRequest.current += 1;
    const requestId = materialRequest.current;
    setDrawerTopic(topic);
    setMaterial(null);
    setMaterialError(null);
    setMaterialLoading(true);
    try {
      const result = await fetchStudyMaterials(topic);
      if (materialRequest.current === requestId) setMaterial(result);
    } catch (err) {
      if (materialRequest.current === requestId) {
        setMaterialError(err instanceof Error ? err.message : 'Failed to generate AI study materials.');
      }
    } finally {
      if (materialRequest.current === requestId) setMaterialLoading(false);
    }
  }, []);

  const handleStartFocus = useCallback(
    (topic: string) => {
      setDock((d) => ({ open: true, topic, startKey: d.startKey + 1 }));
      showToast(`Focus sprint started: ${topic}`, 'info');
    },
    [showToast]
  );

  const closeDock = useCallback(() => setDock((d) => ({ ...d, open: false })), []);

  const handleSessionComplete = useCallback(
    (topic: string, minutes: number) => {
      showToast(`Completed ${minutes}-minute deep work on ${topic}.`, 'success');
    },
    [showToast]
  );

  const handleExportCalendar = useCallback(() => {
    if (!schedule) return;
    try {
      exportScheduleToICS(schedule, syllabus?.title ?? 'Course syllabus');
      fireConfetti();
      showToast('Calendar exported: syncup-schedule.ics', 'success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not export calendar.');
    }
  }, [schedule, syllabus, showToast]);

  const handleResetPlan = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setSyllabus(null);
    setSchedule(null);
    setTriage(null);
    setErrorMessage(null);
    setConfirmReset(false);
    setDock((d) => ({ ...d, open: false }));
    showToast('Plan cleared from this browser.');
  }, [confirmReset, showToast]);

  if (!hydrated) {
    return <div className="min-h-screen bg-[#090A0F]" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090A0F] font-sans text-neutral-100 selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#090A0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-black">
              <Zap className="h-3.5 w-3.5 fill-black" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight text-white">SyncUp AI</span>
            <span className="hidden rounded border border-white/[0.1] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-400 md:inline">
              Glitchathon
            </span>
          </div>

          <BackendStatus state={backend} />

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleInstantDemo}
              title="Load the VIT-AP CS track instantly"
              className="group inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-100 shadow-[0_0_18px_rgba(99,102,241,0.25)] transition-all duration-200 hover:border-indigo-300/70 hover:shadow-[0_0_26px_rgba(99,102,241,0.4)] active:scale-[0.98]"
            >
              <Zap className="h-3.5 w-3.5 fill-indigo-300 text-indigo-300" />
              <span className="hidden lg:inline">⚡ Instant demo (VIT-AP CS)</span>
              <span className="hidden sm:inline lg:hidden">⚡ Instant demo</span>
              <span className="sm:hidden">Demo</span>
            </button>

            {schedule && <StreakPill streak={progress.streak} efficiency={progress.efficiency} />}

            <button
              type="button"
              onClick={() => setArchitectureOpen(true)}
              title="Inspect system topology"
              className="hidden items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1.5 text-xs text-neutral-300 transition-colors duration-200 hover:border-white/[0.18] hover:text-white active:scale-[0.98] sm:inline-flex"
            >
              <Cpu className="h-3.5 w-3.5 text-indigo-300" />
              Architecture
            </button>

            <button
              type="button"
              onClick={() => setDock((d) => ({ ...d, open: true }))}
              aria-label="Open focus timer"
              title="Open the Pomodoro dock"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1.5 text-xs text-neutral-300 transition-colors duration-200 hover:border-white/[0.18] hover:text-white active:scale-[0.98]"
            >
              <Brain className="h-3.5 w-3.5 text-indigo-300" />
              <span className="hidden lg:inline">Focus</span>
            </button>

            {schedule && (
              <button
                type="button"
                onClick={handleResetPlan}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-200 active:scale-[0.98] ${
                  confirmReset
                    ? 'border-burnout-critical/50 bg-burnout-critical/20 text-red-100'
                    : 'border-burnout-critical/20 bg-burnout-critical/[0.06] text-red-300 hover:bg-burnout-critical/10'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmReset ? 'Confirm reset' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {errorMessage && (
          <motion.div
            key="error-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="overflow-hidden border-b border-burnout-critical/20 bg-burnout-critical/[0.07]"
          >
            <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 py-3 text-xs text-red-200 sm:px-6">
              <span className="flex min-w-0 items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span className="break-words">{errorMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                aria-label="Dismiss error"
                className="shrink-0 rounded p-1 text-red-300 transition-colors hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="pointer-events-none fixed inset-x-0 top-16 z-[45] flex justify-center px-4"
          >
            <div
              role="status"
              className={`flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-xs shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl ${
                toast.tone === 'success'
                  ? 'border-burnout-low/30 bg-[#0c1a15]/90 text-emerald-100'
                  : 'border-white/[0.12] bg-[#12141c]/90 text-neutral-100'
              }`}
            >
              {toast.tone === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-burnout-low" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
              )}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {schedule ? (
          <div className="space-y-6">
            <Reveal>
              <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-[#11131a] p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    Active semester track · saved in this browser
                  </div>
                  <h1 className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    {syllabus?.title ?? 'Course syllabus'}
                  </h1>
                  <p className="max-w-xl text-sm leading-relaxed text-neutral-400">{schedule.summary}</p>
                </div>
                <dl className="grid shrink-0 grid-cols-3 gap-2">
                  {[
                    { label: 'Days', value: String(schedule.totalStudyDays) },
                    { label: 'Est. hours', value: `${schedule.totalHours}h` },
                    { label: 'Sessions', value: `${progress.done}/${progress.total}` },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/[0.08] bg-[#161922] px-3 py-2.5 text-center"
                    >
                      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                        {stat.label}
                      </dt>
                      <dd className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-100">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal index={1}>
              <BurnoutMeter
                risk={schedule.burnoutRisk}
                dailyTargetHours={schedule.dailyTargetHours}
                totalStudyDays={schedule.totalStudyDays}
                advice={schedule.summary}
                isRebalancing={isRebalancing}
                triage={triage}
                onDismissTriage={() => setTriage(null)}
              />
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-3">
              <Reveal index={2} className="lg:col-span-2">
                <Timetable
                  studyBlocks={schedule.studyBlocks}
                  courseTitle={syllabus?.title}
                  onToggleTask={handleToggleTask}
                  onRebalance={handleRebalance}
                  onOpenStudyMaterial={handleOpenStudyMaterial}
                  onStartFocus={handleStartFocus}
                  onExportCalendar={handleExportCalendar}
                  isRebalancing={isRebalancing}
                />
              </Reveal>

              <div className="space-y-6">
                <Reveal index={3}>
                  <UnitsPanel
                    topics={syllabus?.extractedTopics ?? []}
                    onFocus={handleStartFocus}
                    onRecall={handleOpenStudyMaterial}
                  />
                </Reveal>

                <Reveal index={4}>
                  <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#11131a] p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                      <CalendarDays className="h-4 w-4 text-neutral-400" />
                      Sync with your calendar
                    </h2>
                    <p className="text-xs leading-relaxed text-neutral-400">
                      Export the full roadmap as an .ics file for Google Calendar, Apple Calendar, or Outlook.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportCalendar}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download .ics
                    </button>
                  </section>
                </Reveal>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-6 py-4 sm:py-8">
            <Reveal>
              <div className="space-y-3 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                  <Sparkles className="h-3 w-3 text-indigo-300" />
                  Glitchathon finalist showcase
                </span>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Turn your syllabus into a burnout-proof semester plan.
                </h1>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-neutral-400">
                  Upload a syllabus PDF, or load the live demo to walk through every feature in one click.
                </p>
              </div>
            </Reveal>

            <Reveal index={1}>
              <button
                type="button"
                onClick={handleInstantDemo}
                className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-indigo-400/30 bg-indigo-500/[0.06] p-4 text-left shadow-[0_0_30px_rgba(99,102,241,0.12)] transition-all duration-300 hover:border-indigo-300/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.22)] active:scale-[0.98]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-200">
                    <Zap className="h-4 w-4 fill-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-white">
                      Judge live demo
                      <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
                        1-click
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      12 NoSQL and OOAD modules, a CAT-1 sprint, flashcards, and a live streak.
                    </p>
                  </div>
                </div>
                <span className="hidden shrink-0 font-mono text-xs text-indigo-200 transition-transform duration-300 group-hover:translate-x-0.5 sm:inline">
                  Launch →
                </span>
              </button>
            </Reveal>

            <Reveal index={2}>
              <SyllabusUploader onSyllabusProcessed={handleSyllabusProcessed} isLoading={isGenerating} />
            </Reveal>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal
                  key={f.title}
                  index={i + 3}
                  className="rounded-xl border border-white/[0.08] bg-[#11131a] p-4"
                >
                  <div className={`flex items-center gap-2 text-xs font-medium ${f.tone}`}>
                    <f.Icon className="h-3.5 w-3.5" />
                    {f.title}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">{f.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </main>

      <StudyDrawer
        isOpen={drawerTopic !== null}
        topic={drawerTopic ?? ''}
        onClose={closeDrawer}
        data={material}
        isLoading={materialLoading}
        errorMessage={materialError}
        onRetry={() => {
          if (drawerTopic) void handleOpenStudyMaterial(drawerTopic);
        }}
      />

      <PomodoroTimer
        topicName={dock.topic}
        isOpen={dock.open}
        startKey={dock.startKey}
        onClose={closeDock}
        onSessionComplete={handleSessionComplete}
      />

      <ArchitectureModal isOpen={architectureOpen} onClose={() => setArchitectureOpen(false)} />
    </div>
  );
}
