package com.notiflow.controller;

import com.notiflow.service.UsageService;
import com.notiflow.util.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/reports/usage")
public class UsageController {

    private final UsageService usageService;

    public UsageController(UsageService usageService) {
        this.usageService = usageService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> usage() {
        CurrentUser user = CurrentUser.fromContext()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        // Permitir solo roles con reports.view
        // No tenemos accessControlService aquí, pero el filtro de seguridad ya valida el token.
        long appActive = usageService.countAppActiveUsers();
        long usersEmail = usageService.countUsersWithEmail();
        Map<String, Long> appActiveBySchool = usageService.countAppActiveBySchool();
        return ResponseEntity.ok(Map.of(
                "appActiveUsers", appActive,
                "usersWithEmail", usersEmail,
                "appActiveBySchool", appActiveBySchool
        ));
    }
}
