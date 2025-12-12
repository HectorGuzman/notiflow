package com.notiflow.controller;

import com.notiflow.dto.MessageDto;
import com.notiflow.dto.MessageRequest;
import com.notiflow.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public ResponseEntity<List<MessageDto>> list() {
        return ResponseEntity.ok(messageService.list());
    }

    @PostMapping
    public ResponseEntity<MessageDto> create(@Valid @RequestBody MessageRequest request, Principal principal) {
        String senderEmail = principal != null ? principal.getName() : "anon@notiflow.app";
        MessageDto created = messageService.create(request, senderEmail, senderEmail.split("@")[0]);
        return ResponseEntity.ok(created);
    }
}
