package com.notiflow.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;

public record CurrentUser(String email, String role, String schoolId, String schoolName) {

    public boolean isSuperAdmin() {
        return role != null && "*".equals(role);
    }

    public static Optional<CurrentUser> fromContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        Object details = auth.getDetails();
        if (details instanceof Map<?, ?> map) {
            String email = (String) map.get("email");
            String role = (String) map.get("role");
            String schoolId = (String) map.get("schoolId");
            String schoolName = (String) map.get("schoolName");
            return Optional.of(new CurrentUser(email, role, schoolId, schoolName));
        }
        return Optional.empty();
    }
}
