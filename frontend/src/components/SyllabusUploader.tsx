'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  FileUp,
  RotateCcw,
} from 'lucide-react';
import { uploadSyllabus } from '../lib/api';
import { SyllabusUploadResponse } from '../types';

interface SyllabusUploaderProps {
  onSyllabusProcessed: (data: SyllabusUploadResponse) => void;
  isLoading?: boolean;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SyllabusUploader: React.FC<SyllabusUploaderProps> = ({
  onSyllabusProcessed,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = isLoading || localLoading;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage('Please upload a PDF file (.pdf)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setLocalLoading(true);

    try {
      let response: SyllabusUploadResponse;

      if (activeTab === 'upload') {
        if (!selectedFile) {
          setErrorMessage('Please select or drop a PDF syllabus first.');
          setLocalLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (courseTitle.trim()) {
          formData.append('title', courseTitle.trim());
        }
        response = await uploadSyllabus(formData);
      } else {
        if (!pastedText.trim()) {
          setErrorMessage('Please paste your syllabus text or topics.');
          setLocalLoading(false);
          return;
        }
        response = await uploadSyllabus({
          text: pastedText.trim(),
          title: courseTitle.trim() || 'Course Syllabus',
        });
      }

      onSyllabusProcessed(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process syllabus.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#11131a] p-5 shadow-subtle transition-all duration-300 sm:p-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            Import syllabus
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Extract curriculum units with Apache PDFBox & Google Gemini AI.
          </p>
        </div>

        {/* Tab Switcher */}
        <div role="tablist" className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#141722] p-1 self-start sm:self-auto">
          {(['upload', 'paste'] as const).map((tab) => {
            const active = activeTab === tab;
            const label = tab === 'upload' ? 'PDF Upload' : 'Paste Text';
            const Icon = tab === 'upload' ? Upload : FileText;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors duration-200 active:scale-[0.98] ${
                  active ? 'text-black' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="uploader-tab"
                    className="absolute inset-0 rounded-md bg-white"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Course Title Field (Optional) */}
      <div className="mt-4">
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-400">
          Course Title (Optional)
        </label>
        <input
          type="text"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
          placeholder="e.g. CSE3009: NoSQL Database Systems, Operating Systems..."
          className="w-full rounded-lg border border-white/[0.08] bg-[#141721] px-3.5 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 transition-colors focus:border-indigo-400/50 focus:outline-none"
        />
      </div>

      {/* Main Drag-Drop or Paste Area */}
      <div className="mt-4">
        {activeTab === 'upload' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-indigo-400/80 bg-indigo-500/[0.08]'
                : selectedFile
                ? 'border-burnout-low/50 bg-burnout-low/[0.05]'
                : 'border-white/[0.12] bg-[#141721] hover:border-white/[0.22] hover:bg-[#161a26]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-burnout-low/30 bg-burnout-low/10 text-burnout-low">
                  <Check className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-100">{selectedFile.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-neutral-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for PDFBox extraction
                  </p>
                </div>
                <span className="mt-1 font-mono text-[11px] text-indigo-300 transition-colors hover:text-indigo-200">
                  Click to replace file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-neutral-400 transition-colors group-hover:border-indigo-400/30 group-hover:text-indigo-300">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-200">
                    Drop your course syllabus PDF here, or <span className="text-indigo-300 underline underline-offset-2">browse files</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-neutral-500">
                    Up to 10MB · Parsed with Apache PDFBox 3.x streaming
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste syllabus modules, lecture topics, or unit schedule here..."
              rows={7}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#141721] p-3.5 font-mono text-xs leading-relaxed text-neutral-200 placeholder:text-neutral-600 transition-colors focus:border-indigo-400/50 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-burnout-critical/30 bg-burnout-critical/[0.08] p-3 text-xs text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span className="leading-relaxed">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <div className="mt-4 flex justify-end border-t border-white/[0.06] pt-3.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isBusy}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 active:scale-[0.98] ${
            isBusy
              ? 'cursor-not-allowed bg-white/20 text-neutral-400'
              : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
          }`}
        >
          {isBusy ? (
            <>
              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing syllabus…</span>
            </>
          ) : (
            <>
              <span>Extract & generate plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
