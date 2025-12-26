package com.notiflow.dto;

import java.util.List;

public record AiPolicyRequest(
        String schoolId,
        String rewritePrompt,
        List<String> moderationRules
) {
}
