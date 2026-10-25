package com.syncup.backend.service;

import com.syncup.backend.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
public class SyncUpService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestClient restClient;

    public SyncUpService() {
        this.restClient = RestClient.builder().build();
    }

    /**
     * Resolves the Gemini API key from property or system environment.
     */
    private String getApiKey() {
        if (geminiApiKey != null && !geminiApiKey.trim().isBlank()) {
            return geminiApiKey.trim();
        }
        String envKey = System.getenv("GEMINI_API_KEY");
        if (envKey != null && !envKey.trim().isBlank()) {
            return envKey.trim();
        }
        return null;
    }

    private boolean isGeminiConfigured() {
        String key = getApiKey();
        return key != null && !key.isBlank();
    }

    // =========================================================================
    // 1. REAL PDF / TEXT SYLLABUS PARSING
    // =========================================================================

    /**
     * Parses real syllabus content from an uploaded PDF file or text request.
     * Uses Apache PDFBox for extraction and Google Gemini API for structured topic analysis.
     */
    public SyllabusUploadResponse processSyllabus(MultipartFile file, SyllabusUploadRequest request) {
        String extractedText = "";
        String title = "Course Syllabus";

        if (file != null && !file.isEmpty()) {
            title = sanitizeFileName(file.getOriginalFilename());
            try {
                extractedText = extractTextFromPdf(file.getBytes());
                log.info("Extracted {} characters from uploaded PDF: {}", extractedText.length(), title);
            } catch (Exception e) {
                log.error("Failed to extract text from PDF: {}", e.getMessage(), e);
                throw new IllegalArgumentException("Could not read PDF file: " + e.getMessage());
            }
        } else if (request != null && request.getText() != null && !request.getText().isBlank()) {
            extractedText = request.getText().trim();
            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                title = request.getTitle().trim();
            }
        }

        if (extractedText.isBlank()) {
            throw new IllegalArgumentException("No content detected. Please upload a valid PDF syllabus or paste the syllabus text.");
        }

        // If Gemini is configured, use it for real AI curriculum parsing
        if (isGeminiConfigured()) {
            try {
                return callGeminiForSyllabus(extractedText, title);
            } catch (Exception e) {
                log.error("Gemini AI syllabus parsing failed: {}", e.getMessage(), e);
                throw new RuntimeException("Gemini AI syllabus parsing failed: " + e.getMessage());
            }
        }

        // If Gemini API key is not configured, perform real deterministic text parsing on the user's actual text
        log.warn("GEMINI_API_KEY is not configured. Parsing syllabus directly from extracted document text.");
        return parseRealTextContent(extractedText, title);
    }

    /**
     * Extracts plain text from PDF bytes using Apache PDFBox 3.x.
     */
    public String extractTextFromPdf(byte[] pdfBytes) throws IOException {
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new IllegalArgumentException("Uploaded PDF file is empty (0 bytes).");
        }
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        }
    }

    /**
     * Extracts real topics from the user's actual text content without any hardcoded static data.
     */
    private SyllabusUploadResponse parseRealTextContent(String text, String title) {
        List<String> realTopics = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.length() < 3 || line.length() > 140) {
                continue;
            }

            // Detect real headers, modules, chapters, units, or numbered topic items
            if (line.matches("(?i)^(module|unit|chapter|week|topic|lecture|part|session)\\s*\\d+.*")
                    || line.matches("^\\d+[\\.\\)]\\s+[A-Za-z].*")
                    || line.matches("^[\\u2022\\-\\*]\\s+[A-Za-z].*")) {

                String cleaned = line.replaceAll("^[\\u2022\\-\\*\\d\\.\\)\\s]+", "").trim();
                if (!cleaned.isEmpty() && !realTopics.contains(cleaned)) {
                    realTopics.add(cleaned);
                }
            }
        }

        // If no bullet/unit prefixes were matched, extract substantive non-empty topic lines
        if (realTopics.isEmpty()) {
            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.length() >= 5 && line.length() <= 80 && !realTopics.contains(line)) {
                    realTopics.add(line);
                    if (realTopics.size() >= 15) {
                        break;
                    }
                }
            }
        }

        if (realTopics.isEmpty()) {
            throw new IllegalArgumentException("Could not identify individual course topics in the provided text. Please paste topics or configure GEMINI_API_KEY.");
        }

        double estimatedHours = realTopics.size() * 4.0;

        return SyllabusUploadResponse.builder()
                .title(title)
                .extractedTopics(realTopics)
                .totalEstimatedHours(estimatedHours)
                .topicCount(realTopics.size())
                .summary("Extracted " + realTopics.size() + " course topics from provided document.")
                .build();
    }

    // =========================================================================
    // 2. REAL SCHEDULE GENERATION & WORKLOAD CALCULATION
    // =========================================================================

    /**
     * Generates a day-by-day study schedule based strictly on the user's real topics, dates, and hours.
     */
    public ScheduleResponse generateSchedule(ScheduleGenerateRequest request) {
        List<String> topics = request.getTopics();
        if (topics == null || topics.isEmpty()) {
            throw new IllegalArgumentException("Cannot generate schedule: No topics provided in request.");
        }

        LocalDate start = (request.getStartDate() != null) ? request.getStartDate() : LocalDate.now();
        LocalDate end = (request.getEndDate() != null) ? request.getEndDate() : start.plusWeeks(4);

        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date (" + end + ") cannot be before start date (" + start + ").");
        }

        Set<LocalDate> examDateSet = new HashSet<>(
                request.getExamDates() != null ? request.getExamDates() : Collections.emptyList()
        );

        long totalDays = ChronoUnit.DAYS.between(start, end) + 1;
        if (totalDays <= 0) {
            totalDays = 1;
        }

        List<ScheduleResponse.StudyBlock> blocks = new ArrayList<>();
        double userDailyHours = (request.getDailyAvailableHours() != null && request.getDailyAvailableHours() > 0)
                ? request.getDailyAvailableHours()
                : 3.0;

        double accumulatedHours = 0;
        int blockCounter = 1;
        int topicIdx = 0;

        for (int i = 0; i < totalDays; i++) {
            LocalDate currentDate = start.plusDays(i);
            DayOfWeek dow = currentDate.getDayOfWeek();
            boolean isExam = examDateSet.contains(currentDate);
            boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

            if (isExam) {
                blocks.add(ScheduleResponse.StudyBlock.builder()
                        .id("block-" + blockCounter++)
                        .date(currentDate)
                        .dayOfWeek(dow.name())
                        .topic("EXAM DAY")
                        .taskDescription("Scheduled Exam Date: High-yield concept review and formulas.")
                        .allocatedHours(1.5)
                        .completed(false)
                        .isExamDay(true)
                        .isReviewDay(false)
                        .build());
                accumulatedHours += 1.5;
                continue;
            }

            if (isWeekend) {
                String reviewTopic = topics.get(Math.min(topicIdx, topics.size() - 1));
                blocks.add(ScheduleResponse.StudyBlock.builder()
                        .id("block-" + blockCounter++)
                        .date(currentDate)
                        .dayOfWeek(dow.name())
                        .topic(reviewTopic + " - Weekend Review")
                        .taskDescription("Consolidate flashcard recall, complete practice problems, and clear backlogs.")
                        .allocatedHours(2.0)
                        .completed(false)
                        .isExamDay(false)
                        .isReviewDay(true)
                        .build());
                accumulatedHours += 2.0;
                continue;
            }

            String activeTopic = topics.get(topicIdx % topics.size());
            String taskDescription = generateRealTaskDescription(activeTopic, topicIdx, topics.size());

            blocks.add(ScheduleResponse.StudyBlock.builder()
                    .id("block-" + blockCounter++)
                    .date(currentDate)
                    .dayOfWeek(dow.name())
                    .topic(activeTopic)
                    .taskDescription(taskDescription)
                    .allocatedHours(userDailyHours)
                    .completed(false)
                    .isExamDay(false)
                    .isReviewDay(false)
                    .build());

            accumulatedHours += userDailyHours;
            topicIdx++;
        }

        double dailyTargetHours = Math.round((accumulatedHours / (double) totalDays) * 10.0) / 10.0;
        String burnoutRisk = calculateBurnoutRisk(dailyTargetHours);

        return ScheduleResponse.builder()
                .studyBlocks(blocks)
                .dailyTargetHours(dailyTargetHours)
                .totalStudyDays((int) totalDays)
                .totalHours(Math.round(accumulatedHours * 10.0) / 10.0)
                .burnoutRisk(burnoutRisk)
                .summary("Generated real schedule across " + totalDays + " days for " + topics.size() + " topics (" + dailyTargetHours + " hrs/day average).")
                .build();
    }

    private String generateRealTaskDescription(String topic, int index, int total) {
        double progress = (double) index / (double) total;
        if (progress < 0.35) {
            return "Foundational deep dive into " + topic + ". Study core definitions, theorems, and mechanisms.";
        } else if (progress < 0.75) {
            return "Problem-solving and practice applications for " + topic + ". Work through exercises and case studies.";
        } else {
            return "Advanced synthesis and mastery drill for " + topic + ". Review edge cases and exam questions.";
        }
    }

    // =========================================================================
    // 3. REAL SCHEDULE REBALANCE
    // =========================================================================

    /**
     * Recalculates study load and rebalances real pending tasks across remaining days.
     */
    public RebalanceResponse rebalanceSchedule(RebalanceRequest request) {
        List<String> missedIds = request.getMissedTaskIds();
        if (missedIds == null || missedIds.isEmpty()) {
            throw new IllegalArgumentException("No missed task IDs provided for rebalancing.");
        }

        int remainingDays = Math.max(request.getRemainingDays(), 1);
        double dailyHours = (request.getDailyAvailableHours() != null && request.getDailyAvailableHours() > 0)
                ? request.getDailyAvailableHours()
                : 2.5;

        double backlogHours = missedIds.size() * dailyHours;
        double plannedHours = remainingDays * dailyHours;
        double totalHours = plannedHours + backlogHours;

        double newDailyTargetHours = Math.round((totalHours / (double) remainingDays) * 10.0) / 10.0;
        String burnoutRisk = calculateBurnoutRisk(newDailyTargetHours);
        String burnoutAdvice = getBurnoutAdvice(burnoutRisk, newDailyTargetHours, missedIds.size());

        List<ScheduleResponse.StudyBlock> adjustedSchedule = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 0; i < remainingDays; i++) {
            LocalDate date = today.plusDays(i);
            String topicName;
            String taskDescription;

            if (i < missedIds.size()) {
                topicName = "Catch-Up Sprint: " + missedIds.get(i);
                taskDescription = "Focused recovery session to clear backlog tasks and review missed concepts.";
            } else {
                topicName = "Paced Study Session - Day " + (i + 1);
                taskDescription = "Continued curriculum progression with active spaced repetition.";
            }

            adjustedSchedule.add(ScheduleResponse.StudyBlock.builder()
                    .id("rebalance-" + (i + 1))
                    .date(date)
                    .dayOfWeek(date.getDayOfWeek().name())
                    .topic(topicName)
                    .taskDescription(taskDescription)
                    .allocatedHours(newDailyTargetHours)
                    .completed(false)
                    .isExamDay(false)
                    .isReviewDay(i % 5 == 0)
                    .build());
        }

        return RebalanceResponse.builder()
                .adjustedSchedule(adjustedSchedule)
                .burnoutRisk(burnoutRisk)
                .burnoutAdvice(burnoutAdvice)
                .newDailyTargetHours(newDailyTargetHours)
                .backlogHours(backlogHours)
                .remainingDays(remainingDays)
                .build();
    }

    // =========================================================================
    // 4. REAL GEMINI AI STUDY MATERIALS (FLASHCARDS & MCQS)
    // =========================================================================

    /**
     * Generates real dynamic flashcards and MCQs using the Gemini AI API.
     * No static questions or mock questions are used.
     */
    public StudyMaterialResponse generateStudyMaterials(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Topic name cannot be empty.");
        }

        if (!isGeminiConfigured()) {
            throw new IllegalStateException(
                    "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable or 'gemini.api.key' in application.properties to generate real study materials."
            );
        }

        return callGeminiForStudyMaterials(topic.trim());
    }

    // =========================================================================
    // GEMINI REST API CLIENT
    // =========================================================================

    private SyllabusUploadResponse callGeminiForSyllabus(String text, String title) {
        String apiKey = getApiKey();
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + apiKey;

        String prompt = "You are an expert academic curriculum parser. Analyze this course syllabus text and extract:\n" +
                "1. Exact course title\n" +
                "2. Array of key academic topics/modules taught (extract actual topics from the text, minimum 4, maximum 16)\n" +
                "3. Estimated total study hours to master the curriculum (number)\n" +
                "4. A concise 1-2 sentence summary of the course scope\n\n" +
                "Return a JSON object with keys: title (string), topics (array of strings), estimatedHours (number), summary (string).\n\n" +
                "Syllabus Text:\n" + truncate(text, 6000);

        String jsonPayload = buildGeminiJsonRequest(prompt);

        log.info("Calling Gemini API to parse syllabus '{}'...", title);
        String responseBody = restClient.post()
                .uri(endpoint)
                .header("Content-Type", "application/json")
                .body(jsonPayload)
                .retrieve()
                .body(String.class);

        return parseGeminiSyllabusResponse(responseBody, title);
    }

    private StudyMaterialResponse callGeminiForStudyMaterials(String topic) {
        String apiKey = getApiKey();
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + apiKey;

        String prompt = "You are an academic exam tutor. Generate study materials strictly about the topic: '" + topic + "'.\n" +
                "Return a JSON object with:\n" +
                "1. flashcards: array of 3-4 objects with 'question' (clear conceptual question about " + topic + "), 'answer' (detailed correct answer), 'difficulty' ('Easy'|'Medium'|'Hard')\n" +
                "2. mcqs: array of exactly 3 multiple choice questions with:\n" +
                "   - 'question': academic test question about " + topic + "\n" +
                "   - 'options': array of exactly 4 plausible answer choices\n" +
                "   - 'correctIndex': integer 0 to 3 for the correct option\n" +
                "   - 'explanation': thorough conceptual explanation of why the correct option is right and the others are incorrect.";

        String jsonPayload = buildGeminiJsonRequest(prompt);

        log.info("Calling Gemini API for study materials on topic '{}'...", topic);
        String responseBody = restClient.post()
                .uri(endpoint)
                .header("Content-Type", "application/json")
                .body(jsonPayload)
                .retrieve()
                .body(String.class);

        return parseGeminiStudyMaterialResponse(responseBody, topic);
    }

    /**
     * Constructs Gemini request payload with enforced JSON output formatting.
     */
    private String buildGeminiJsonRequest(String promptText) {
        JSONObject textPart = new JSONObject().put("text", promptText);
        JSONArray parts = new JSONArray().put(textPart);
        JSONObject content = new JSONObject().put("parts", parts);
        JSONArray contents = new JSONArray().put(content);

        JSONObject config = new JSONObject().put("responseMimeType", "application/json");

        return new JSONObject()
                .put("contents", contents)
                .put("generationConfig", config)
                .toString();
    }

    private SyllabusUploadResponse parseGeminiSyllabusResponse(String rawResponse, String fallbackTitle) {
        try {
            JSONObject root = new JSONObject(rawResponse);
            JSONArray candidates = root.optJSONArray("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("Gemini returned no candidates in response: " + rawResponse);
            }

            JSONObject content = candidates.getJSONObject(0).optJSONObject("content");
            if (content == null) {
                throw new RuntimeException("Gemini returned null content in first candidate.");
            }

            JSONArray parts = content.optJSONArray("parts");
            if (parts == null || parts.isEmpty()) {
                throw new RuntimeException("Gemini returned empty parts.");
            }

            String generatedText = parts.getJSONObject(0).optString("text", "");
            JSONObject parsed = new JSONObject(cleanJsonString(generatedText));

            List<String> topicsList = new ArrayList<>();
            JSONArray topicsArr = parsed.optJSONArray("topics");
            if (topicsArr != null) {
                for (int i = 0; i < topicsArr.length(); i++) {
                    String t = topicsArr.getString(i).trim();
                    if (!t.isEmpty() && !topicsList.contains(t)) {
                        topicsList.add(t);
                    }
                }
            }

            if (topicsList.isEmpty()) {
                throw new RuntimeException("Gemini did not return any topics array in JSON response.");
            }

            return SyllabusUploadResponse.builder()
                    .title(parsed.optString("title", fallbackTitle))
                    .extractedTopics(topicsList)
                    .totalEstimatedHours(parsed.optDouble("estimatedHours", topicsList.size() * 4.0))
                    .topicCount(topicsList.size())
                    .summary(parsed.optString("summary", "AI-analyzed curriculum structure."))
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse Gemini syllabus response: {}", e.getMessage(), e);
            throw new RuntimeException("Could not parse AI response: " + e.getMessage());
        }
    }

    private StudyMaterialResponse parseGeminiStudyMaterialResponse(String rawResponse, String topic) {
        try {
            JSONObject root = new JSONObject(rawResponse);
            JSONArray candidates = root.optJSONArray("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("Gemini returned no candidates for study materials.");
            }

            JSONObject content = candidates.getJSONObject(0).optJSONObject("content");
            JSONArray parts = (content != null) ? content.optJSONArray("parts") : null;
            if (parts == null || parts.isEmpty()) {
                throw new RuntimeException("Gemini returned empty response parts.");
            }

            String generatedText = parts.getJSONObject(0).optString("text", "");
            JSONObject parsed = new JSONObject(cleanJsonString(generatedText));

            List<StudyMaterialResponse.Flashcard> flashcards = new ArrayList<>();
            JSONArray fcArray = parsed.optJSONArray("flashcards");
            if (fcArray != null) {
                for (int i = 0; i < fcArray.length(); i++) {
                    JSONObject item = fcArray.getJSONObject(i);
                    flashcards.add(StudyMaterialResponse.Flashcard.builder()
                            .question(item.optString("question"))
                            .answer(item.optString("answer"))
                            .difficulty(item.optString("difficulty", "Medium"))
                            .build());
                }
            }

            List<StudyMaterialResponse.MultipleChoiceQuestion> mcqs = new ArrayList<>();
            JSONArray mcqArray = parsed.optJSONArray("mcqs");
            if (mcqArray != null) {
                for (int i = 0; i < mcqArray.length(); i++) {
                    JSONObject item = mcqArray.getJSONObject(i);
                    List<String> options = new ArrayList<>();
                    JSONArray optArr = item.optJSONArray("options");
                    if (optArr != null) {
                        for (int j = 0; j < optArr.length(); j++) {
                            options.add(optArr.getString(j));
                        }
                    }
                    mcqs.add(StudyMaterialResponse.MultipleChoiceQuestion.builder()
                            .question(item.optString("question"))
                            .options(options)
                            .correctIndex(item.optInt("correctIndex", 0))
                            .explanation(item.optString("explanation"))
                            .build());
                }
            }

            if (flashcards.isEmpty() && mcqs.isEmpty()) {
                throw new RuntimeException("Gemini did not return any flashcards or MCQs for topic: " + topic);
            }

            return StudyMaterialResponse.builder()
                    .topic(topic)
                    .flashcards(flashcards)
                    .mcqs(mcqs)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse Gemini study materials response: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate AI study materials: " + e.getMessage());
        }
    }

    private String cleanJsonString(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private String calculateBurnoutRisk(double dailyTargetHours) {
        if (dailyTargetHours <= 2.8) {
            return "LOW";
        } else if (dailyTargetHours <= 4.5) {
            return "MODERATE";
        } else {
            return "HIGH";
        }
    }

    private String getBurnoutAdvice(String risk, double hoursPerDay, int missedTasks) {
        return switch (risk) {
            case "HIGH" -> String.format(
                    "BURNOUT WARNING: High pace of %.1f hrs/day required with %d missed task(s). " +
                            "Triage optional readings immediately and enforce 50/10 rest intervals.",
                    hoursPerDay, missedTasks
            );
            case "MODERATE" -> String.format(
                    "MODERATE WORKLOAD: Pacing is at %.1f hrs/day. " +
                            "Maintain 45/15 Pomodoro sessions to sustain focus.",
                    hoursPerDay
            );
            default -> String.format(
                    "BALANCED WORKLOAD: Pace is sustainable at %.1f hrs/day. " +
                            "Consistent daily execution will keep stress low.",
                    hoursPerDay
            );
        };
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "Course Syllabus";
        }
        return fileName.replaceAll("\\.[^.]+$", "").replace("_", " ").replace("-", " ").trim();
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength);
    }
}
