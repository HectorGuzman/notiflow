package com.notiflow.controller;

import com.notiflow.dto.SchoolRequest;
import com.notiflow.model.SchoolDocument;
import com.notiflow.service.SchoolService;
import com.notiflow.util.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/schools")
public class SchoolController {

    private final SchoolService schoolService;

    public SchoolController(SchoolService schoolService) {
        this.schoolService = schoolService;
    }

    @GetMapping
    public ResponseEntity<List<SchoolDocument>> list() {
        return ResponseEntity.ok(schoolService.listAll());
    }

    @PostMapping
    public ResponseEntity<SchoolDocument> create(@Valid @RequestBody SchoolRequest request) {
        CurrentUser.fromContext().ifPresentOrElse(user -> {
            if (!"ADMIN".equalsIgnoreCase(user.role())) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Solo admins pueden crear escuelas");
            }
        }, () -> {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED);
        });
        return ResponseEntity.ok(schoolService.create(request));
    }
}
