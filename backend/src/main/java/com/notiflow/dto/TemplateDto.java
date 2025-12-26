package com.notiflow.dto;

import java.time.Instant;

public record TemplateDto(
        String id,
        String name,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
}
