package com.notiflow.dto;

import com.notiflow.model.MessageStatus;

import java.time.Instant;
import java.util.List;

public record MessageDto(
        String id,
        String content,
        String senderName,
        List<String> recipients,
        MessageStatus status,
        Instant createdAt
) {
}
