package com.notiflow.controller;

import com.notiflow.dto.SchoolRequest;
import com.notiflow.model.SchoolDocument;
import com.notiflow.service.AccessControlService;
import com.notiflow.service.SchoolService;
import com.notiflow.service.StorageService;
import com.notiflow.util.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/schools")
public class SchoolController {

    private final SchoolService schoolService;
    private final AccessControlService accessControlService;
    private final StorageService storageService;
    private final boolean storageEnabled;

    public SchoolController(SchoolService schoolService,
                            AccessControlService accessControlService,
                            StorageService storageService,
                            @Value("${app.logo-bucket:}") String bucketName) {
        this.schoolService = schoolService;
        this.accessControlService = accessControlService;
        this.storageService = storageService;
        this.storageEnabled = bucketName != null && !bucketName.isBlank();
    }

    @GetMapping
    public ResponseEntity<List<SchoolDocument>> list() {
        return ResponseEntity.ok(schoolService.listAll());
    }

    @PostMapping
    public ResponseEntity<SchoolDocument> create(@Valid @RequestBody SchoolRequest request) {
        CurrentUser user = CurrentUser.fromContext().orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        accessControlService.check(user, "schools.manage", "global", Optional.empty());
        return ResponseEntity.ok(schoolService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SchoolDocument> update(@PathVariable String id, @Valid @RequestBody SchoolRequest request) {
        CurrentUser user = CurrentUser.fromContext().orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        accessControlService.check(user, "schools.manage", "global", Optional.empty());
        return ResponseEntity.ok(schoolService.update(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SchoolDocument> get(@PathVariable String id) {
        CurrentUser user = CurrentUser.fromContext().orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));

        // Superadmin (schoolId = global) puede ver cualquier colegio, incluido el virtual "global"
        if (!"global".equalsIgnoreCase(user.schoolId()) && !id.equalsIgnoreCase(user.schoolId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No puedes ver colegios de otra institución");
        }

        if ("global".equalsIgnoreCase(id)) {
            SchoolDocument virtual = new SchoolDocument();
            virtual.setId("global");
            virtual.setName("Global");
            return ResponseEntity.ok(virtual);
        }

        return ResponseEntity.ok(schoolService.getById(id));
    }

    @PostMapping("/{id}/logo")
    public ResponseEntity<SchoolDocument> uploadLogo(@PathVariable String id, @RequestParam("file") MultipartFile file) {
        CurrentUser user = CurrentUser.fromContext().orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        accessControlService.check(user, "schools.manage", "global", Optional.empty());
        if (!storageEnabled) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Bucket de logos no configurado");
        }
        try {
            String url = storageService.uploadLogo(id, file);
            SchoolDocument current = schoolService.getById(id);
            SchoolRequest req = new SchoolRequest(id, current.getName(), current.getCurrentYear(), url);
            SchoolDocument updated = schoolService.update(id, req);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo subir el logo: " + e.getMessage());
        }
    }
}
