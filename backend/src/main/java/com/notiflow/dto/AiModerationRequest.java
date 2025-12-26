package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record AiModerationRequest(@NotBlank String text) {
}
