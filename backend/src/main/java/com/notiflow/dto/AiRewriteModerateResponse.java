package com.notiflow.dto;

import java.util.List;

public record AiRewriteModerateResponse(
        String suggestion,
        String subjectSuggestion,
        boolean allowed,
        List<String> reasons
) {
}
