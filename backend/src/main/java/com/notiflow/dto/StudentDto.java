package com.notiflow.dto;

import java.time.Instant;

public record StudentDto(
        String id,
        String schoolId,
        String year,
        String course,
        String run,
        String gender,
        String firstName,
        String lastNameFather,
        String lastNameMother,
        String address,
        String commune,
        String email,
        String phone,
        String guardianFirstName,
        String guardianLastName,
        Instant createdAt,
        Instant updatedAt
) {
}
