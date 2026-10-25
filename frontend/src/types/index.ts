/**
 * SyncUp AI Semester Copilot - Frontend TypeScript Type Definitions
 * Directly mirrors the Spring Boot 3 backend DTOs.
 */

export type BurnoutRisk = 'LOW' | 'MODERATE' | 'HIGH';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

/**
 * Task item representation for checklist tracking.
 */
export interface TaskItem {
  id: string;
  title: string;
  topic: string;
  allocatedHours: number;
  completed: boolean;
  dueDate?: string;
}

/**
 * Represents a single daily or weekly scheduled study session.
 */
export interface StudyBlock {
  id: string;
  date: string; // ISO format "YYYY-MM-DD"
  dayOfWeek: string; // e.g. "MONDAY", "TUESDAY"
  topic: string;
  taskDescription: string;
  allocatedHours: number;
  completed: boolean;
  isExamDay: boolean;
  isReviewDay: boolean;
}

/**
 * Consolidated burnout and workload analytics.
 */
export interface BurnoutData {
  risk: BurnoutRisk;
  dailyTargetHours: number;
  totalStudyDays: number;
  totalHours: number;
  advice: string;
  backlogHours?: number;
}

/**
 * Flashcard for active recall and spaced repetition.
 */
export interface Flashcard {
  question: string;
  answer: string;
  difficulty: DifficultyLevel;
}

/**
 * Multiple-choice question with explanations for self-quizzing.
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * High-level parsed syllabus summary and topics.
 */
export interface SyllabusData {
  title: string;
  extractedTopics: string[];
  totalEstimatedHours: number;
  topicCount: number;
  summary: string;
}

// ============================================================================
// API Request & Response DTOs (Mirrors Spring Boot com.syncup.backend.dto.*)
// ============================================================================

export interface SyllabusUploadRequest {
  title?: string;
  text?: string;
}

export interface SyllabusUploadResponse {
  title: string;
  extractedTopics: string[];
  totalEstimatedHours: number;
  topicCount: number;
  summary: string;
}

export interface ScheduleGenerateRequest {
  topics?: string[];
  syllabusText?: string;
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
  examDates?: string[]; // Array of "YYYY-MM-DD"
  dailyAvailableHours?: number;
}

export interface ScheduleResponse {
  studyBlocks: StudyBlock[];
  dailyTargetHours: number;
  totalStudyDays: number;
  totalHours: number;
  burnoutRisk: BurnoutRisk;
  summary: string;
}

export interface RebalanceRequest {
  missedTaskIds: string[];
  remainingDays: number;
  currentSchedule?: StudyBlock[];
  dailyAvailableHours?: number;
}

export interface RebalanceResponse {
  adjustedSchedule: StudyBlock[];
  burnoutRisk: BurnoutRisk;
  burnoutAdvice: string;
  newDailyTargetHours: number;
  backlogHours: number;
  remainingDays: number;
}

export interface StudyMaterialResponse {
  topic: string;
  flashcards: Flashcard[];
  mcqs: QuizQuestion[];
}
