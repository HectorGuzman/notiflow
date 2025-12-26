package com.notiflow.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;

public record CurrentUser(String email, String role, String schoolId, String schoolName, String name) {

    public boolean isSuperAdmin() {
        return role != null && "*".equals(role);
    }

    public boolean isGlobalAdmin() {
        return role != null && role.equalsIgnoreCase("SUPERADMIN");
    }

    public boolean hasSchoolScope(String targetSchoolId) {
        if (isGlobalAdmin()) return true;
        if (targetSchoolId == null || targetSchoolId.isBlank()) return false;
        return targetSchoolId.equalsIgnoreCase(this.schoolId);
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
            String name = (String) map.get("name");
            return Optional.of(new CurrentUser(email, role, schoolId, schoolName, name));
        }
        return Optional.empty();
    }
}
