package com.syncup.backend.controller;

import com.syncup.backend.dto.*;
import com.syncup.backend.service.SyncUpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST Controller for SyncUp AI Semester Copilot.
 * Connects directly to real Apache PDFBox text extraction and real Google Gemini API.
 */
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SyncUpController {

    private final SyncUpService syncUpService;

    /**
     * 1a. POST /api/syllabus/upload (Multipart form-data: file or text)
     */
    @PostMapping(value = "/syllabus/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SyllabusUploadResponse> uploadSyllabusMultipart(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "text", required = false) String text) {
        log.info("Received multipart syllabus upload request. File present: {}", (file != null && !file.isEmpty()));
        SyllabusUploadRequest request = SyllabusUploadRequest.builder()
                .title(title)
                .text(text)
                .build();
        SyllabusUploadResponse response = syncUpService.processSyllabus(file, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 1b. POST /api/syllabus/upload (JSON payload: text and title)
     */
    @PostMapping(value = "/syllabus/upload", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SyllabusUploadResponse> uploadSyllabusJson(
            @RequestBody(required = false) SyllabusUploadRequest request) {
        log.info("Received JSON syllabus upload request");
        SyllabusUploadResponse response = syncUpService.processSyllabus(null, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 2. POST /api/schedule/generate
     * Generates a day-by-day study schedule from the user's real topics and dates.
     */
    @PostMapping("/schedule/generate")
    public ResponseEntity<ScheduleResponse> generateSchedule(
            @RequestBody ScheduleGenerateRequest request) {
        log.info("Generating real study schedule for {} topics", request.getTopics() != null ? request.getTopics().size() : 0);
        ScheduleResponse response = syncUpService.generateSchedule(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 3. POST /api/schedule/rebalance
     * Recalculates study load, burnout risk, and daily pacing after missed tasks.
     */
    @PostMapping("/schedule/rebalance")
    public ResponseEntity<RebalanceResponse> rebalanceSchedule(
            @RequestBody RebalanceRequest request) {
        log.info("Rebalancing schedule for {} missed tasks over {} remaining days",
                request.getMissedTaskIds() != null ? request.getMissedTaskIds().size() : 0,
                request.getRemainingDays());
        RebalanceResponse response = syncUpService.rebalanceSchedule(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 4. POST /api/study/materials?topic={topicName}
     * Generates real dynamic flashcards and 3 MCQs using Gemini AI.
     */
    @PostMapping("/study/materials")
    public ResponseEntity<StudyMaterialResponse> getStudyMaterials(
            @RequestParam(value = "topic", required = false) String topicParam,
            @RequestBody(required = false) Map<String, String> body) {

        String topic = topicParam;
        if ((topic == null || topic.isBlank()) && body != null && body.containsKey("topic")) {
            topic = body.get("topic");
        }
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic parameter is required.");
        }

        log.info("Generating real AI flashcards and MCQs for topic: '{}'", topic);
        StudyMaterialResponse response = syncUpService.generateStudyMaterials(topic);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // EXCEPTION HANDLERS (Returns clear, actionable errors)
    // =========================================================================

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        log.warn("Validation error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage(), "message", e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException e) {
        log.error("Configuration error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", e.getMessage(), "message", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralError(Exception e) {
        log.error("Execution error: {}", e.getMessage(), e);
        String msg = e.getMessage() != null ? e.getMessage() : "Internal Server Error";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", msg, "message", msg));
    }
}
