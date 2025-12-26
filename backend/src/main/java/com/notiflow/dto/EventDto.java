package com.notiflow.dto;

import java.time.Instant;
import java.util.List;

public record EventDto(
        String id,
        String title,
        String description,
        Instant startDateTime,
        Instant endDateTime,
        String type,
        String schoolId,
        String createdByEmail,
        String createdByName,
        Instant createdAt,
        List<String> audienceUserIds,
        List<String> audienceGroupIds
) {
}
