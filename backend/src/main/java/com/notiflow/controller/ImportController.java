package com.notiflow.controller;

import com.notiflow.dto.ImportResult;
import com.notiflow.service.AccessControlService;
import com.notiflow.service.StudentImportService;
import com.notiflow.util.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@RestController
@RequestMapping("/import")
public class ImportController {

    private final StudentImportService studentImportService;
    private final AccessControlService accessControlService;

    public ImportController(StudentImportService studentImportService, AccessControlService accessControlService) {
        this.studentImportService = studentImportService;
        this.accessControlService = accessControlService;
    }

    @PostMapping("/students")
    public ResponseEntity<ImportResult> importStudents(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "schoolId", required = false) String schoolId
    ) {
        CurrentUser user = CurrentUser.fromContext()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!"global".equalsIgnoreCase(user.schoolId())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Solo Superadmin puede importar estudiantes");
        }
        String targetSchool = (schoolId == null || schoolId.isBlank()) ? user.schoolId() : schoolId;
        if (targetSchool == null || targetSchool.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Debes indicar schoolId");
        }
        accessControlService.check(user, "schools.manage", targetSchool, Optional.empty());
        if (file == null || file.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo CSV vacío");
        }
        ImportResult result = studentImportService.importCsv(file, targetSchool);
        return ResponseEntity.ok(result);
    }
}
