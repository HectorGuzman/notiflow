package com.notiflow.service;

import com.notiflow.dto.AuthResponse;
import com.notiflow.dto.LoginRequest;
import com.notiflow.dto.UserDto;
import com.notiflow.model.UserDocument;
import com.notiflow.model.UserRole;
import com.notiflow.service.AccessControlService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class AuthService {

    private final JwtService jwtService;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final String superAdminEmail;
    private final AccessControlService accessControlService;

    public AuthService(JwtService jwtService, UserService userService, PasswordEncoder passwordEncoder, AccessControlService accessControlService) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.superAdminEmail = System.getenv().getOrDefault("SUPER_ADMIN_EMAIL", "").toLowerCase();
        this.accessControlService = accessControlService;
    }

    public AuthResponse login(LoginRequest request) {
        if (request.email() == null || request.email().isBlank() || request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Credenciales inválidas");
        }

        String email = request.email().toLowerCase();
        UserDocument doc = userService.findByEmail(email)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Correo o contraseña inválidos"));

        if (doc.getPasswordHash() == null || !passwordEncoder.matches(request.password(), doc.getPasswordHash())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Correo o contraseña inválidos");
        }

        // Elevación de super admin para el correo definido
        if (!superAdminEmail.isBlank() && superAdminEmail.equalsIgnoreCase(doc.getEmail())) {
            doc.setRole(UserRole.ADMIN);
            doc.setSchoolId("global");
            doc.setSchoolName("Global");
            userService.upsert(doc);
        }

        UserDto user = new UserDto(
                doc.getId(),
                doc.getName(),
                doc.getEmail(),
                doc.getRole(),
                doc.getSchoolId(),
                doc.getSchoolName()
        );

        Map<String, Object> claims = new java.util.HashMap<>();
        claims.put("role", user.role().name());
        claims.put("name", user.name());
        claims.put("schoolId", user.schoolId());
        claims.put("schoolName", user.schoolName());
        // Opcional: incluir permisos en el token (útil para UI)
        try {
            Set<String> perms = accessControlService != null ? accessControlService.getPermissions(user.role().name()) : Set.of();
            claims.put("permissions", perms);
        } catch (Exception ignored) {}

        String token = jwtService.generateToken(claims, user.email());
        return new AuthResponse(token, user);
    }
}
