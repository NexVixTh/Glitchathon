package com.syncup.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RebalanceResponse {

    @Builder.Default
    private List<ScheduleResponse.StudyBlock> adjustedSchedule = new ArrayList<>();

    private String burnoutRisk; // "LOW" | "MODERATE" | "HIGH"
    private String burnoutAdvice;
    private double newDailyTargetHours;
    private double backlogHours;
    private int remainingDays;
}
