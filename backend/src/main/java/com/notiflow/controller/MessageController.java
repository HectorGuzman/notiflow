package com.notiflow.controller;

import com.notiflow.dto.MessageDto;
import com.notiflow.dto.MessageRequest;
import com.notiflow.service.AccessControlService;
import com.notiflow.service.MessageService;
import com.notiflow.util.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/messages")
public class MessageController {

    private final MessageService messageService;
    private final AccessControlService accessControlService;

    public MessageController(MessageService messageService, AccessControlService accessControlService) {
        this.messageService = messageService;
        this.accessControlService = accessControlService;
    }

    @GetMapping
    public ResponseEntity<List<MessageDto>> list(
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize
    ) {
        CurrentUser user = CurrentUser.fromContext()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        // Permite mensajes.list o mensajes.list.self (filtrando por remitente)
        String senderFilter = null;
        try {
            accessControlService.check(user, "messages.list", user.schoolId(), Optional.empty());
        } catch (org.springframework.web.server.ResponseStatusException ex) {
            // si no tiene list, intentar self
            accessControlService.check(user, "messages.list", user.schoolId(), Optional.ofNullable(user.email()));
            senderFilter = user.email();
        }
        return ResponseEntity.ok(messageService.list(year, senderFilter, page, pageSize));
    }

    @PostMapping
    public ResponseEntity<MessageDto> create(@Valid @RequestBody MessageRequest request, Principal principal) {
        CurrentUser user = CurrentUser.fromContext()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        accessControlService.check(user, "messages.create", request.schoolId() != null ? request.schoolId() : user.schoolId(), Optional.empty());
        String senderEmail = user.email() != null ? user.email() : (principal != null ? principal.getName() : "anon@notiflow.app");
        String senderName = principal != null ? principal.getName() : senderEmail.split("@")[0];
        MessageDto created = messageService.create(request, senderEmail, senderName);
        return ResponseEntity.ok(created);
    }
}
