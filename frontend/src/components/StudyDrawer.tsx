'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  RotateCw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { StudyMaterialResponse } from '../types';
import { fireConfetti } from '../lib/confetti';

interface StudyDrawerProps {
  isOpen: boolean;
  topic: string;
  onClose: () => void;
  data: StudyMaterialResponse | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

type Tab = 'flashcards' | 'quiz';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const FLIP_HOLD_MS = 620;

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: 'border-burnout-low/30 bg-burnout-low/10 text-emerald-300',
  Medium: 'border-burnout-moderate/30 bg-burnout-moderate/10 text-amber-300',
  Hard: 'border-burnout-critical/30 bg-burnout-critical/10 text-red-300',
};

const toBullets = (answer: string): string[] => {
  const lines = answer
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
  if (lines.length > 1) return lines.slice(0, 5);
  const sentences =
    (lines[0] ?? '').match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  return sentences.length > 1 ? sentences.slice(0, 5) : [];
};

const optionClass = (hasAnswered: boolean, isSelected: boolean, isCorrect: boolean): string => {
  if (!hasAnswered) {
    return 'border-white/[0.08] bg-[#161922] text-neutral-200 hover:border-white/[0.18] hover:bg-[#1a1e2a]';
  }
  if (isCorrect) {
    return 'border-burnout-low/60 bg-burnout-low/10 text-emerald-100 shadow-glow-emerald';
  }
  if (isSelected) {
    return 'border-burnout-critical/60 bg-burnout-critical/10 text-red-100 shadow-glow-rose';
  }
  return 'border-white/[0.04] bg-[#12141c] text-neutral-500';
};

export const StudyDrawer: React.FC<StudyDrawerProps> = ({
  isOpen,
  topic,
  onClose,
  data,
  isLoading = false,
  errorMessage = null,
  onRetry,
}) => {
  const [tab, setTab] = useState<Tab>('flashcards');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const navTimer = useRef<number | null>(null);

  const flashcards = data?.flashcards ?? [];
  const mcqs = data?.mcqs ?? [];
  const card = flashcards[index];
  const bullets = card ? toBullets(card.answer) : [];
  const answered = Object.keys(selected).length;
  const score = mcqs.reduce((acc, q, i) => (selected[i] === q.correctIndex ? acc + 1 : acc), 0);

  const cancelPendingNav = useCallback(() => {
    if (navTimer.current !== null) {
      window.clearTimeout(navTimer.current);
      navTimer.current = null;
    }
  }, []);

  useEffect(() => {
    cancelPendingNav();
    setIndex(0);
    setFlipped(false);
    setSelected({});
    setTab('flashcards');
  }, [data, cancelPendingNav]);

  useEffect(() => cancelPendingNav, [cancelPendingNav]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const goTo = (target: number) => {
    if (flashcards.length === 0 || target === index) return;
    if (!flipped) {
      setIndex(target);
      return;
    }
    // Flip back first so the content swap happens while the card shows its front.
    setFlipped(false);
    cancelPendingNav();
    navTimer.current = window.setTimeout(() => {
      setIndex(target);
      navTimer.current = null;
    }, FLIP_HOLD_MS);
  };

  const step = (dir: 1 | -1) => goTo((index + dir + flashcards.length) % flashcards.length);
  const toggleFlip = () => setFlipped((f) => !f);

  const onCardKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFlip();
    } else if (e.key === 'ArrowRight') {
      step(1);
    } else if (e.key === 'ArrowLeft') {
      step(-1);
    }
  };

  const choose = (qIdx: number, optIdx: number) => {
    if (selected[qIdx] !== undefined) return;
    const next = { ...selected, [qIdx]: optIdx };
    setSelected(next);
    const perfect = mcqs.length > 0 && mcqs.every((q, i) => next[i] === q.correctIndex);
    if (Object.keys(next).length === mcqs.length && perfect) {
      window.setTimeout(() => fireConfetti(), 300);
    }
  };

  const renderFlashcards = () => {
    if (!card) {
      return <p className="py-12 text-center text-xs text-neutral-500">No flashcards were returned for this topic.</p>;
    }
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex w-full max-w-md items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          <span>
            Card {index + 1} of {flashcards.length}
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 ${
              DIFFICULTY_TONE[card.difficulty ?? 'Medium'] ?? 'border-white/10 text-neutral-300'
            }`}
          >
            {card.difficulty ?? 'Concept'}
          </span>
        </div>

        <div className="perspective-1000 h-72 w-full max-w-md">
          <div
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label={flipped ? 'Showing answer. Press to show the question.' : 'Showing question. Press to reveal the answer.'}
            onClick={toggleFlip}
            onKeyDown={onCardKey}
            className={`flip-card h-full w-full cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
              flipped ? 'is-flipped' : ''
            }`}
          >
            <div className="flip-face flex flex-col justify-between rounded-2xl border border-white/[0.09] bg-[#141823] p-6 shadow-subtle">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">Concept prompt</span>
                <RotateCw className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <p className="px-2 text-center text-base font-medium leading-relaxed tracking-tight text-neutral-50">
                {card.question}
              </p>
              <span className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                Tap or press space to reveal
              </span>
            </div>

            <div className="flip-face flip-face--back flex flex-col rounded-2xl border border-burnout-low/25 bg-[#101a17] p-6 shadow-glow-emerald">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-burnout-low">Active recall key</span>
                <RotateCw className="h-3.5 w-3.5 text-burnout-low/60" />
              </div>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                {bullets.length > 0 ? (
                  <ul className="space-y-2.5">
                    {bullets.map((point, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-neutral-200">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-burnout-low" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-neutral-200">{card.answer}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous card"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-[#161922] text-neutral-300 transition-all duration-200 hover:border-white/[0.18] hover:text-white active:scale-[0.96]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFlip}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-medium text-black transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
          >
            <RotateCw className="h-3.5 w-3.5" />
            {flipped ? 'Show question' : 'Flip card'}
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next card"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-[#161922] text-neutral-300 transition-all duration-200 hover:border-white/[0.18] hover:text-white active:scale-[0.96]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {flashcards.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to card ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (mcqs.length === 0) {
      return <p className="py-12 text-center text-xs text-neutral-500">No quiz questions were returned for this topic.</p>;
    }
    return (
      <div className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
          {answered} / {mcqs.length} answered
        </p>

        {answered === mcqs.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.1] bg-white/[0.03] p-4"
          >
            <div className="flex items-center gap-3">
              <Award className={`h-5 w-5 ${score === mcqs.length ? 'text-burnout-low' : 'text-neutral-300'}`} />
              <div>
                <p className="text-sm font-semibold text-neutral-100">
                  Score {score} / {mcqs.length}
                </p>
                <p className="text-xs text-neutral-400">
                  {score === mcqs.length ? 'Perfect score. Mastery reached.' : 'Read the explanations, then retake.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected({})}
              className="shrink-0 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:bg-white/[0.1] active:scale-[0.98]"
            >
              Retake
            </button>
          </motion.div>
        )}

        {mcqs.map((q, qIdx) => {
          const choice = selected[qIdx];
          const hasAnswered = choice !== undefined;
          return (
            <div key={qIdx} className="space-y-3 rounded-xl border border-white/[0.08] bg-[#141722] p-4">
              <p className="text-sm font-medium leading-relaxed text-neutral-100">
                <span className="mr-2 font-mono text-xs text-indigo-300">Q{qIdx + 1}</span>
                {q.question}
              </p>

              <div className="space-y-2">
                {q.options.map((option, oIdx) => {
                  const isSelected = choice === oIdx;
                  const isCorrect = oIdx === q.correctIndex;
                  return (
                    <motion.button
                      key={oIdx}
                      type="button"
                      disabled={hasAnswered}
                      whileTap={hasAnswered ? undefined : { scale: 0.985 }}
                      onClick={() => choose(qIdx, oIdx)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs transition-colors duration-200 disabled:cursor-default ${optionClass(
                        hasAnswered,
                        isSelected,
                        isCorrect
                      )}`}
                    >
                      <span className="leading-relaxed">{option}</span>
                      {hasAnswered && isCorrect && (
                        <motion.span
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        >
                          <Check className="h-4 w-4 shrink-0 text-burnout-low" />
                        </motion.span>
                      )}
                      {hasAnswered && isSelected && !isCorrect && (
                        <XCircle className="h-4 w-4 shrink-0 text-burnout-critical" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence initial={false}>
                {hasAnswered && (
                  <motion.div
                    key="explanation"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-2.5 rounded-lg border border-white/[0.06] bg-[#10121a] p-3.5 text-xs leading-relaxed text-neutral-300">
                      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
                      <p>
                        <span className="font-semibold text-neutral-100">Why: </span>
                        {q.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="space-y-4">
        <div className="mx-auto h-72 w-full max-w-md animate-shimmer rounded-2xl border border-white/[0.06] bg-[#141823] bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)]" />
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          Generating flashcards and MCQs
        </p>
      </div>
    );
  } else if (errorMessage) {
    body = (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-7 w-7 text-burnout-critical" />
        <p className="text-sm font-medium text-neutral-100">Couldn&apos;t generate study materials</p>
        <p className="max-w-md break-words text-xs leading-relaxed text-neutral-400">{errorMessage}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:bg-white/[0.1] active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        )}
      </div>
    );
  } else {
    body = tab === 'flashcards' ? renderFlashcards() : renderQuiz();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="study-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-drawer-title"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f1118] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-neutral-200">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="study-drawer-title"
                    className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-white"
                  >
                    Active recall
                    <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                  </h2>
                  <p className="truncate font-mono text-[11px] text-neutral-500" title={topic}>
                    {topic || 'Curriculum topic'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div role="tablist" className="flex gap-5 border-b border-white/[0.06] px-6">
              {(['flashcards', 'quiz'] as const).map((t) => {
                const active = tab === t;
                const label =
                  t === 'flashcards' ? `Flashcards · ${flashcards.length}` : `Mastery quiz · ${mcqs.length}`;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    className={`relative pb-3 pt-3 text-xs font-medium transition-colors ${
                      active ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {label}
                    {active && (
                      <motion.span
                        layoutId="drawer-tab"
                        className="absolute inset-x-0 -bottom-px h-px bg-white"
                        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">{body}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
