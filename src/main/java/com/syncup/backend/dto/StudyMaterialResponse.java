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
public class StudyMaterialResponse {

    private String topic;

    @Builder.Default
    private List<Flashcard> flashcards = new ArrayList<>();

    @Builder.Default
    private List<MultipleChoiceQuestion> mcqs = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Flashcard {
        private String question;
        private String answer;
        private String difficulty;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MultipleChoiceQuestion {
        private String question;

        @Builder.Default
        private List<String> options = new ArrayList<>();

        private int correctIndex;
        private String explanation;
    }
}
