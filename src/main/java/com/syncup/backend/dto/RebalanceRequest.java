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
public class RebalanceRequest {

    @Builder.Default
    private List<String> missedTaskIds = new ArrayList<>();

    @Builder.Default
    private int remainingDays = 14;

    @Builder.Default
    private List<ScheduleResponse.StudyBlock> currentSchedule = new ArrayList<>();

    @Builder.Default
    private Integer dailyAvailableHours = 3;
}
