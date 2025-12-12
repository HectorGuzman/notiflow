package com.notiflow.dto;

import java.time.Instant;
import java.util.List;

public record GroupDto(
        String id,
        String name,
        String description,
        List<String> memberIds,
        String schoolId,
        Instant createdAt
) {
}
