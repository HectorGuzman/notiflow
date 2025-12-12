package com.notiflow.service;

import com.notiflow.dto.AuthResponse;
import com.notiflow.dto.LoginRequest;
import com.notiflow.dto.UserDto;
import com.notiflow.model.UserDocument;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {

    private final JwtService jwtService;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(JwtService jwtService, UserService userService, PasswordEncoder passwordEncoder) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
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

        UserDto user = new UserDto(
                doc.getId(),
                doc.getName(),
                doc.getEmail(),
                doc.getRole(),
                doc.getSchoolId(),
                doc.getSchoolName()
        );

        Map<String, Object> claims = Map.of(
                "role", user.role().name(),
                "name", user.name(),
                "schoolId", user.schoolId(),
                "schoolName", user.schoolName()
        );

        String token = jwtService.generateToken(claims, user.email());
        return new AuthResponse(token, user);
    }
}
