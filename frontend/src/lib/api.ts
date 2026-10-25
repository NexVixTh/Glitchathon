/**
 * SyncUp AI Semester Copilot - Frontend API Client
 * Connects directly to the Spring Boot backend at http://localhost:8080/api.
 * Performs real executions with real error handling.
 */

import {
  SyllabusUploadRequest,
  SyllabusUploadResponse,
  ScheduleGenerateRequest,
  ScheduleResponse,
  RebalanceRequest,
  RebalanceResponse,
  StudyMaterialResponse,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Helper to extract meaningful error messages from server responses.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.message) return json.message;
      if (json.error) return json.error;
    } catch {
      if (text && text.trim().length > 0) return text;
    }
  } catch {
    // Ignore read errors
  }
  return `HTTP ${response.status} (${response.statusText || 'Server Error'})`;
}

// ============================================================================
// 1. UPLOAD SYLLABUS
// ============================================================================

/**
 * Uploads real syllabus PDF file or submits real syllabus text to the backend.
 */
export async function uploadSyllabus(
  input: FormData | string | SyllabusUploadRequest
): Promise<SyllabusUploadResponse> {
  let response: Response;

  try {
    if (input instanceof FormData) {
      response = await fetch(`${API_BASE_URL}/syllabus/upload`, {
        method: 'POST',
        body: input,
      });
    } else {
      const payload: SyllabusUploadRequest =
        typeof input === 'string'
          ? { text: input, title: 'Course Syllabus' }
          : input;

      response = await fetch(`${API_BASE_URL}/syllabus/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (netErr: any) {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}. Ensure Spring Boot is running on port 8080. (${netErr.message})`
    );
  }

  if (!response.ok) {
    const errorMsg = await extractErrorMessage(response);
    throw new Error(errorMsg);
  }

  return await response.json();
}

// ============================================================================
// 2. GENERATE SCHEDULE
// ============================================================================

/**
 * Calls backend to calculate and generate a real study schedule.
 */
export async function generateSchedule(
  payload: ScheduleGenerateRequest
): Promise<ScheduleResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}. (${netErr.message})`
    );
  }

  if (!response.ok) {
    const errorMsg = await extractErrorMessage(response);
    throw new Error(errorMsg);
  }

  return await response.json();
}

// ============================================================================
// 3. REBALANCE SCHEDULE
// ============================================================================

/**
 * Rebalances real schedule based on actual missed task IDs.
 */
export async function rebalanceSchedule(
  payload: RebalanceRequest
): Promise<RebalanceResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/schedule/rebalance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}. (${netErr.message})`
    );
  }

  if (!response.ok) {
    const errorMsg = await extractErrorMessage(response);
    throw new Error(errorMsg);
  }

  return await response.json();
}

// ============================================================================
// 4. FETCH STUDY MATERIALS (FLASHCARDS & MCQS)
// ============================================================================

/**
 * Triggers real Gemini AI generation of flashcards and MCQs for the specified topic.
 */
export async function fetchStudyMaterials(
  topic: string
): Promise<StudyMaterialResponse> {
  if (!topic || topic.trim().length === 0) {
    throw new Error('A topic must be specified to generate study materials.');
  }

  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    try {
      response = await fetch(
        `${API_BASE_URL}/study/materials?topic=${encodeURIComponent(topic.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (netErr: any) {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}. (${netErr.message})`
    );
  }

  if (!response.ok) {
    const errorMsg = await extractErrorMessage(response);
    throw new Error(errorMsg);
  }

  return await response.json();
}
