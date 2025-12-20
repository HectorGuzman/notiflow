package com.notiflow.dto;

import com.notiflow.model.MessageStatus;

import java.time.Instant;
import java.util.List;

public record MessageDto(
        String id,
        String content,
        String senderName,
        String senderEmail,
        List<String> recipients,
        List<String> channels,
        MessageStatus emailStatus,
        MessageStatus appStatus,
        String schoolId,
        String year,
        MessageStatus status,
        Instant createdAt
) {
}
