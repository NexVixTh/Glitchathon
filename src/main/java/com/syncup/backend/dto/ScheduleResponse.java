package com.syncup.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleResponse {

    @Builder.Default
    private List<StudyBlock> studyBlocks = new ArrayList<>();

    private double dailyTargetHours;
    private int totalStudyDays;
    private double totalHours;
    private String burnoutRisk;
    private String summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudyBlock {
        private String id;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate date;

        private String dayOfWeek;
        private String topic;
        private String taskDescription;
        private double allocatedHours;
        private boolean completed;
        private boolean isExamDay;
        private boolean isReviewDay;
    }
}
