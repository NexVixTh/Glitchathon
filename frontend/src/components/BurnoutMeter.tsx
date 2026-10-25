'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { BurnoutRisk } from '../types';

export interface TriageAdvice {
  advice: string;
  backlogHours: number;
  newDailyTargetHours: number;
  remainingDays: number;
}

interface BurnoutMeterProps {
  risk: BurnoutRisk;
  dailyTargetHours: number;
  totalStudyDays?: number;
  advice?: string;
  isRebalancing?: boolean;
  triage?: TriageAdvice | null;
  triageMessage?: string | null;
  onDismissTriage?: () => void;
  className?: string;
}

interface RiskConfig {
  label: string;
  hex: string;
  pill: string;
  base: number;
  status: string;
  defaultAdvice: string;
  Icon: LucideIcon;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// 240° arc from bottom-left to bottom-right, drawn clockwise over the top.
const ARC_PATH = 'M 30.72 140 A 80 80 0 1 1 169.28 140';

const RISK: Record<BurnoutRisk, RiskConfig> = {
  LOW: {
    label: 'Optimal pace',
    hex: '#10B981',
    pill: 'border-burnout-low/30 bg-burnout-low/10 text-burnout-low',
    base: 18,
    status: 'Sustainable cognitive pace. Retention is maximized.',
    defaultAdvice: 'You are on track. Keep 50/10 focus intervals and protect your sleep.',
    Icon: CheckCircle2,
  },
  MODERATE: {
    label: 'Moderate load',
    hex: '#F59E0B',
    pill: 'border-burnout-moderate/30 bg-burnout-moderate/10 text-burnout-moderate',
    base: 50,
    status: 'Workload tightening. Strict Pomodoro sessions recommended.',
    defaultAdvice: 'Run strict 45/15 Pomodoro sessions and turn reading blocks into flashcard drills.',
    Icon: AlertTriangle,
  },
  HIGH: {
    label: 'Critical burnout risk',
    hex: '#EF4444',
    pill: 'border-burnout-critical/30 bg-burnout-critical/10 text-burnout-critical',
    base: 84,
    status: 'Critical threshold (above 4.5 h/day). Immediate triage required.',
    defaultAdvice:
      'Triage non-essential topics, focus on 80/20 high-yield concepts, and schedule a recharge buffer.',
    Icon: Flame,
  },
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const RiskGauge: React.FC<{ value: number; hex: string; hours: number }> = ({ value, hex, hours }) => {
  const needleAngle = -120 + (value / 100) * 240;

  return (
    <div className="relative aspect-square w-48 shrink-0 sm:w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible" aria-hidden>
        <path d={ARC_PATH} pathLength={100} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="round" />
        <path d={ARC_PATH} pathLength={100} fill="none" stroke="#10B981" strokeOpacity={0.28} strokeWidth={10} strokeDasharray="33 100" />
        <path
          d={ARC_PATH}
          pathLength={100}
          fill="none"
          stroke="#F59E0B"
          strokeOpacity={0.28}
          strokeWidth={10}
          strokeDasharray="33 100"
          strokeDashoffset={-33}
        />
        <path
          d={ARC_PATH}
          pathLength={100}
          fill="none"
          stroke="#EF4444"
          strokeOpacity={0.28}
          strokeWidth={10}
          strokeDasharray="33 100"
          strokeDashoffset={-66}
        />
        <path
          d={ARC_PATH}
          pathLength={100}
          fill="none"
          stroke={hex}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${value} 100`}
          style={{
            transition: 'stroke-dasharray 1.1s cubic-bezier(0.34,1.56,0.64,1), stroke 0.6s ease',
            filter: `drop-shadow(0 0 6px ${hex}80)`,
          }}
        />
        <g
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: '100px 100px',
            transition: 'transform 1.1s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="36"
            stroke={hex}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${hex})` }}
          />
        </g>
        <circle cx="100" cy="100" r="7" fill="#0f1118" stroke={hex} strokeWidth={2.5} />
        <circle cx="100" cy="100" r="2.5" fill={hex} />
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-[56%] flex flex-col items-center">
        <span className="font-mono text-2xl font-semibold tabular-nums text-white">{hours.toFixed(1)}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">hrs / day</span>
      </div>

      <span className="absolute bottom-[4%] left-[6%] font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
        Optimal
      </span>
      <span className="absolute bottom-[4%] right-[6%] font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
        Critical
      </span>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">{label}</p>
    <p className="mt-0.5 font-mono text-sm tabular-nums text-neutral-100">{value}</p>
  </div>
);

export const BurnoutMeter: React.FC<BurnoutMeterProps> = ({
  risk,
  dailyTargetHours,
  totalStudyDays = 0,
  advice,
  isRebalancing = false,
  triage = null,
  triageMessage = null,
  onDismissTriage,
  className = '',
}) => {
  const [showAdvice, setShowAdvice] = useState(false);

  const effectiveTriage: TriageAdvice | null =
    triage ||
    (triageMessage
      ? {
          advice: triageMessage,
          backlogHours: 4.0,
          newDailyTargetHours: dailyTargetHours,
          remainingDays: 14,
        }
      : null);

  const config = RISK[risk] ?? RISK.LOW;
  const Icon = config.Icon;
  const needleValue = clamp(config.base + clamp((dailyTargetHours - 3) * 4, -10, 10), 2, 98);
  const currentAdvice = advice?.trim() || config.defaultAdvice;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border bg-[#11131a]/90 p-5 transition-colors duration-500 sm:p-6 ${
        isRebalancing
          ? 'border-burnout-moderate/50 shadow-glow-amber'
          : 'border-white/[0.08] hover:border-white/[0.14]'
      } ${className}`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <RiskGauge value={needleValue} hex={config.hex} hours={dailyTargetHours} />

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              Burnout risk index
            </span>
            <button
              type="button"
              onClick={() => setShowAdvice((v) => !v)}
              aria-expanded={showAdvice}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300 transition-all duration-200 hover:border-white/[0.16] hover:text-white active:scale-[0.98]"
            >
              <Info className="h-3.5 w-3.5 text-indigo-300" />
              Cognitive advice
            </button>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-500 ${
                isRebalancing ? 'border-burnout-moderate/40 bg-burnout-moderate/15 text-amber-200' : config.pill
              }`}
            >
              {isRebalancing ? (
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {isRebalancing ? 'Recalibrating workload…' : config.label}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-neutral-300">
            {isRebalancing ? 'Dynamic dialing toward a balanced baseline…' : config.status}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
            <Stat label="Daily target" value={`${dailyTargetHours.toFixed(1)} h`} />
            <Stat label="Horizon" value={`${totalStudyDays} days`} />
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showAdvice && !effectiveTriage && (
          <motion.div
            key="advice"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="mt-5 flex gap-3 rounded-xl border border-white/[0.08] bg-[#161922] p-4 text-xs leading-relaxed text-neutral-300">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
              <div className="min-w-0">
                <p className="mb-1 font-semibold text-neutral-100">Adaptive copilot strategy</p>
                <p>{currentAdvice}</p>
                <p className="mt-2 font-mono text-[10px] text-neutral-500">
                  Calculated over {totalStudyDays} days · SyncUp pacing engine
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {effectiveTriage && (
          <motion.div
            key="triage"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="mt-5 rounded-xl border border-burnout-low/25 bg-burnout-low/[0.06] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-burnout-low" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-burnout-low">
                      Cognitive triage advice
                    </span>
                    <span className="rounded bg-burnout-low/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200">
                      Backlog {effectiveTriage.backlogHours.toFixed(1)} h absorbed
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-200">
                    {effectiveTriage.advice?.trim() || config.defaultAdvice}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-400">
                    Pace → {effectiveTriage.newDailyTargetHours.toFixed(1)} h/day · window {effectiveTriage.remainingDays} days
                  </p>
                </div>
                {onDismissTriage && (
                  <button
                    type="button"
                    onClick={onDismissTriage}
                    aria-label="Dismiss triage advice"
                    className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
