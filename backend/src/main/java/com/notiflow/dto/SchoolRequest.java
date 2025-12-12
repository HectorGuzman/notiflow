package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record SchoolRequest(
        @NotBlank String id,
        @NotBlank String name
) {
}
