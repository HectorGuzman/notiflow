package com.notiflow.dto;

import jakarta.validation.constraints.NotBlank;

public record StudentRequest(
        String schoolId,
        String year,
        String course,
        String run,
        String gender,
        @NotBlank(message = "Nombres es obligatorio")
        String firstName,
        String lastNameFather,
        String lastNameMother,
        String address,
        String commune,
        String email,
        String phone,
        String guardianFirstName,
        String guardianLastName
) {
}
