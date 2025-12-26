package com.notiflow.dto;

import java.time.Instant;
import java.util.List;

public record AiPolicyResponse(
        String schoolId,
        String rewritePrompt,
        List<String> moderationRules,
        String updatedBy,
        Instant updatedAt
) {
}
