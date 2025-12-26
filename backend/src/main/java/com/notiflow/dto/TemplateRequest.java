package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record TemplateRequest(
        @NotBlank String name,
        @NotBlank String content
) {
}
