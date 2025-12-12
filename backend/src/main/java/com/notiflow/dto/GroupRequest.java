package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record GroupRequest(
        @NotBlank String name,
        String description,
        @NotEmpty List<String> memberIds,
        String schoolId
) {
}
