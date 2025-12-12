package com.notiflow.dto;

public record AuthResponse(
        String token,
        UserDto user
) {
}
