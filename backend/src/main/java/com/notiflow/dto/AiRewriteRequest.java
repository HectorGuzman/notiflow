package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record AiRewriteRequest(
        @NotBlank String text,
        String subject,
        String tone
) {
}
