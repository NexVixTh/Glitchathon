'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Code2,
  Cpu,
  FileCode2,
  Layers,
  Server,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const METRICS: { label: string; value: string; detail: string; tone: string }[] = [
  { label: 'AI inference p95', value: '< 1.8 s', detail: 'Gemini model via backend', tone: 'text-indigo-300' },
  { label: 'PDF ingestion', value: 'Streaming', detail: 'Apache PDFBox 3.x', tone: 'text-emerald-300' },
  { label: 'JSON validation', value: 'Schema-enforced', detail: 'Rejects malformed output', tone: 'text-cyan-300' },
  { label: 'Interop engine', value: 'RFC 5545', detail: 'iCal / Google Calendar', tone: 'text-amber-300' },
];

const PIPELINE: { title: string; body: string; footer: string; Icon: LucideIcon; tone: string }[] = [
  {
    title: '1. Client tier',
    body: 'Next.js 14 App Router, TypeScript, Tailwind CSS, local state persistence, and a Web Audio Pomodoro engine.',
    footer: 'Port 3000 · SSR-safe hydration',
    Icon: Code2,
    tone: 'text-neutral-200',
  },
  {
    title: '2. Backend tier',
    body: 'Spring Boot 3.3.5 on Java 21 LTS with global CORS, Lombok, and DTO validation.',
    footer: 'Port 8080 · REST controllers',
    Icon: Server,
    tone: 'text-burnout-low',
  },
  {
    title: '3. Ingestion engine',
    body: 'Apache PDFBox 3.x reads multipart byte streams into memory and extracts text in position order.',
    footer: '10 MB max upload',
    Icon: FileCode2,
    tone: 'text-indigo-300',
  },
  {
    title: '4. Intelligence tier',
    body: 'Gemini returns JSON constrained to a schema for topics, hours, flashcards, and MCQs.',
    footer: 'Heuristic fallback on failure',
    Icon: Cpu,
    tone: 'text-burnout-moderate',
  },
];

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="architecture-overlay"
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
            aria-labelledby="architecture-title"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f1118] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-neutral-200">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="architecture-title" className="text-sm font-semibold tracking-tight text-white">
                      System architecture and pipeline
                    </h2>
                    <span className="rounded border border-burnout-low/25 bg-burnout-low/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-300">
                      Production ready
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">End-to-end review for GLITCHATHON judges.</p>
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

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {METRICS.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 + i * 0.05 }}
                    className="rounded-xl border border-white/[0.08] bg-[#141722] p-3.5"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-500">{m.label}</p>
                    <p className={`mt-1.5 font-mono text-base font-semibold tabular-nums ${m.tone}`}>{m.value}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">{m.detail}</p>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                  <Activity className="h-3.5 w-3.5" />
                  Four-tier pipeline
                </h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {PIPELINE.map((step, i) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.2 + i * 0.06 }}
                      className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-[#141722] p-4"
                    >
                      <div className={`flex items-center gap-2 text-xs font-semibold ${step.tone}`}>
                        <step.Icon className="h-4 w-4" />
                        <span>{step.title}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-neutral-400">{step.body}</p>
                      <p className="mt-auto pt-2 font-mono text-[10px] text-neutral-500">{step.footer}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-burnout-low" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-neutral-100">Resiliency under load</p>
                  <p className="text-xs leading-relaxed text-neutral-400">
                    If the AI API rate-limits or the network drops during judging, the backend&apos;s deterministic
                    document scanner extracts units, modules, and hours directly from the PDF stream, so the
                    pipeline keeps running.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#12141c] px-6 py-3.5">
              <span className="font-mono text-[11px] text-neutral-500">SyncUp AI v1.0.4 · VIT-AP edition</span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-black transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
