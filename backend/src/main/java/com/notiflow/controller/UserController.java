package com.notiflow.controller;

import com.notiflow.dto.UserCreateRequest;
import com.notiflow.dto.UserDto;
import com.notiflow.service.UserService;
import com.notiflow.util.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> list() {
        CurrentUser.fromContext().ifPresentOrElse(user -> {
            if (!"ADMIN".equalsIgnoreCase(user.role())) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        }, () -> {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED);
        });
        return ResponseEntity.ok(userService.listAll());
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@Valid @RequestBody UserCreateRequest request) {
        CurrentUser current = CurrentUser.fromContext().orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!"ADMIN".equalsIgnoreCase(current.role())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Solo admins pueden crear usuarios");
        }
        // admins solo pueden crear usuarios en su colegio, salvo admin global (schoolId = "global")
        if (current.schoolId() != null && !"global".equalsIgnoreCase(current.schoolId())) {
            if (!current.schoolId().equalsIgnoreCase(request.schoolId())) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes crear usuarios en otro colegio");
            }
        }
        return ResponseEntity.ok(userService.create(request));
    }
}
