'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

type Mode = 'focus' | 'short' | 'long';

interface PomodoroTimerProps {
  topicName: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionComplete?: (topic: string, minutes: number) => void;
  startKey?: number;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DURATION_MS: Record<Mode, number> = {
  focus: 25 * 60 * 1000,
  short: 5 * 60 * 1000,
  long: 15 * 60 * 1000,
};

const MODE_META: Record<Mode, { label: string; minutes: number; hex: string; hint: string }> = {
  focus: { label: 'Focus', minutes: 25, hex: '#6366F1', hint: 'Deep work' },
  short: { label: 'Break', minutes: 5, hex: '#10B981', hint: 'Recharge' },
  long: { label: 'Long rest', minutes: 15, hex: '#F59E0B', hint: 'Full reset' },
};

const RING_RADIUS = 44;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

const formatClock = (ms: number): string => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const Ring: React.FC<{
  fraction: number;
  hex: string;
  size: number;
  thickness: number;
  children?: React.ReactNode;
}> = ({ fraction, hex, size, thickness, children }) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} />
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke={hex}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={RING_CIRC * (1 - fraction)}
        style={{ transition: 'stroke-dashoffset 300ms linear, stroke 400ms ease' }}
      />
    </svg>
    {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
  </div>
);

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  topicName,
  isOpen,
  onClose,
  onSessionComplete,
  startKey = 0,
}) => {
  const [mode, setMode] = useState<Mode>('focus');
  const [remainingMs, setRemainingMs] = useState<number>(DURATION_MS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [muted, setMuted] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    if (isOpen) setExpanded(true);
  }, [isOpen, startKey]);

  // Timestamp-based clock: stays accurate when the tab is backgrounded and throttled.
  const endAtRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const modeRef = useRef<Mode>('focus');
  const sessionsRef = useRef(0);
  const mutedRef = useRef(false);
  const topicRef = useRef(topicName);
  const onCompleteRef = useRef(onSessionComplete);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    topicRef.current = topicName;
  }, [topicName]);

  useEffect(() => {
    onCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

  const ensureAudio = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      if (!audioRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        audioRef.current = new Ctor();
      }
      if (audioRef.current.state === 'suspended') {
        void audioRef.current.resume();
      }
      return audioRef.current;
    } catch {
      return null;
    }
  }, []);

  const chime = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, i) => {
      const at = t0 + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.14, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.75);
    });
  }, [ensureAudio]);

  const goToMode = useCallback((next: Mode) => {
    endAtRef.current = null;
    modeRef.current = next;
    setMode(next);
    setRemainingMs(DURATION_MS[next]);
    setIsRunning(false);
  }, []);

  const finishPhase = useCallback(() => {
    chime();
    if (modeRef.current === 'focus') {
      const count = sessionsRef.current + 1;
      sessionsRef.current = count;
      setSessions(count);
      onCompleteRef.current?.(topicRef.current, MODE_META.focus.minutes);
      goToMode(count % 4 === 0 ? 'long' : 'short');
    } else {
      goToMode('focus');
    }
  }, [chime, goToMode]);

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const endAt = endAtRef.current;
      if (endAt === null) return;
      const left = endAt - Date.now();
      if (left <= 0) {
        finishPhase();
      } else {
        setRemainingMs(left);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isRunning, finishPhase]);

  const start = useCallback(() => {
    ensureAudio();
    endAtRef.current = Date.now() + remainingMs;
    setIsRunning(true);
  }, [ensureAudio, remainingMs]);

  const pause = useCallback(() => {
    if (endAtRef.current !== null) {
      setRemainingMs(Math.max(0, endAtRef.current - Date.now()));
    }
    endAtRef.current = null;
    setIsRunning(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isRunning) pause();
    else start();
  }, [isRunning, pause, start]);

  const skip = useCallback(() => {
    goToMode(modeRef.current === 'focus' ? 'short' : 'focus');
  }, [goToMode]);

  const reset = useCallback(() => {
    endAtRef.current = null;
    setIsRunning(false);
    setRemainingMs(DURATION_MS[mode]);
  }, [mode]);

  // A new focus request from the page restarts a fresh focus sprint.
  useEffect(() => {
    if (startKey === 0) return;
    goToMode('focus');
    ensureAudio();
    endAtRef.current = Date.now() + DURATION_MS.focus;
    setIsRunning(true);
  }, [startKey, goToMode, ensureAudio]);

  if (!isOpen) return null;

  const meta = MODE_META[mode];
  const fraction = Math.min(1, Math.max(0, remainingMs / DURATION_MS[mode]));
  const clock = formatClock(remainingMs);
  const PlayGlyph = isRunning ? Pause : Play;

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      style={{ boxShadow: `0 0 28px ${meta.hex}33` }}
      className={`fixed bottom-4 right-4 z-50 overflow-hidden border border-white/[0.1] bg-[#0f1118]/90 backdrop-blur-xl sm:bottom-6 sm:right-6 ${
        expanded ? 'rounded-2xl' : 'rounded-full'
      }`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {expanded ? (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="w-[300px] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                  Focus dock · {sessions} completed
                </p>
                <p className="mt-1 truncate text-sm font-medium text-neutral-100" title={topicName}>
                  {topicName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Unmute chime' : 'Mute chime'}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Collapse to pill"
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close focus dock"
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-white/[0.06] bg-[#12141c] p-1">
              {(['focus', 'short', 'long'] as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => goToMode(m)}
                    className={`rounded-md py-1.5 text-[11px] font-medium transition-all duration-200 ${
                      active ? 'bg-white text-black' : 'text-neutral-400 hover:text-neutral-100'
                    }`}
                  >
                    {MODE_META[m].label} {MODE_META[m].minutes}m
                  </button>
                );
              })}
            </div>

            <div className="my-5 flex justify-center">
              <Ring fraction={fraction} hex={meta.hex} size={156} thickness={5}>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">
                    {clock}
                  </span>
                  <span
                    className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: meta.hex }}
                  >
                    {mode === 'focus' ? <Brain className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                    {meta.hint}
                  </span>
                </div>
              </Ring>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                aria-label="Reset timer"
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-[#161922] text-neutral-400 transition-all duration-200 hover:text-white active:scale-[0.96]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-xs font-medium text-black transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
              >
                <PlayGlyph className="h-3.5 w-3.5 fill-current" />
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                onClick={skip}
                aria-label="Skip to next phase"
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-[#161922] text-neutral-400 transition-all duration-200 hover:text-white active:scale-[0.96]"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] text-neutral-600">
              Skip moves on without crediting a session.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="pill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 py-1.5 pl-2 pr-1.5"
          >
            <Ring fraction={fraction} hex={meta.hex} size={26} thickness={12}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.hex }} />
            </Ring>
            <span className="font-mono text-xs font-semibold tabular-nums text-white">{clock}</span>
            <span className="hidden max-w-[150px] truncate text-[11px] text-neutral-400 sm:inline" title={topicName}>
              {topicName}
            </span>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
              className="grid h-7 w-7 place-items-center rounded-full bg-white text-black transition-transform duration-150 active:scale-[0.92]"
            >
              <PlayGlyph className="h-3 w-3 fill-current" />
            </button>
            <button
              type="button"
              onClick={skip}
              aria-label="Skip to next phase"
              className="grid h-7 w-7 place-items-center rounded-full text-neutral-300 transition-colors hover:bg-white/10 active:scale-[0.92]"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Expand focus timer"
              className="grid h-7 w-7 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
