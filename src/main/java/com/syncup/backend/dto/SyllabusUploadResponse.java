package com.syncup.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyllabusUploadResponse {
    private String title;
    private List<String> extractedTopics;
    private double totalEstimatedHours;
    private int topicCount;
    private String summary;
}
