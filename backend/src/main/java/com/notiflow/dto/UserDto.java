package com.notiflow.dto;

import com.notiflow.model.UserRole;

public record UserDto(
        String id,
        String name,
        String email,
        UserRole role,
        String schoolId,
        String schoolName,
        String rut
) {
}
