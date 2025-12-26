package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceRegisterRequest(
        @NotBlank String token,
        @NotBlank String platform
) {
}
