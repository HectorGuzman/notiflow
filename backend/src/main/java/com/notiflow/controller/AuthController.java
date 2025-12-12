package com.notiflow.controller;

import com.notiflow.dto.AuthResponse;
import com.notiflow.dto.ForgotPasswordRequest;
import com.notiflow.dto.LoginRequest;
import com.notiflow.dto.ResetPasswordRequest;
import com.notiflow.dto.UserDto;
import com.notiflow.model.UserRole;
import com.notiflow.service.AuthService;
import com.notiflow.service.JwtService;
import com.notiflow.service.PasswordResetService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, JwtService jwtService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@RequestHeader(HttpHeaders.AUTHORIZATION) Optional<String> authHeader) {
        if (authHeader.isEmpty() || !authHeader.get().startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.get().substring(7);
        Claims claims = jwtService.parseClaims(token);

        UserDto user = new UserDto(
                claims.getSubject(), // usamos el email como ID base
                claims.get("name", String.class),
                claims.getSubject(),
                UserRole.valueOf(claims.get("role", String.class)),
                claims.get("schoolId", String.class),
                claims.get("schoolName", String.class)
        );

        return ResponseEntity.ok(user);
    }

    @PostMapping("/forgot")
    public ResponseEntity<?> forgot(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            var result = passwordResetService.createResetToken(request.email());
            Map<String, Object> body = new HashMap<>();
            body.put("message", result.emailed()
                    ? "Revisa tu correo con el enlace de recuperación"
                    : "Token generado (correo no configurado)");
            body.put("expiresMinutes", passwordResetService.getExpirationMinutes());
            if (!result.emailed()) {
                body.put("token", result.token());
            }
            return ResponseEntity.ok().body(body);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(request.token(), request.newPassword());
            return ResponseEntity.ok().body(java.util.Map.of("message", "Contraseña actualizada"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", ex.getMessage()));
        }
    }
}
