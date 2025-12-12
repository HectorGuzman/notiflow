package com.notiflow.controller;

import com.notiflow.dto.GroupDto;
import com.notiflow.dto.GroupRequest;
import com.notiflow.service.GroupService;
import com.notiflow.util.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    public ResponseEntity<List<GroupDto>> list(@RequestParam(value = "schoolId", required = false) String schoolIdParam) {
        CurrentUser user = CurrentUser.fromContext()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!"ADMIN".equalsIgnoreCase(user.role())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        String schoolId = user.schoolId();
        if ("global".equalsIgnoreCase(schoolId) && schoolIdParam != null && !schoolIdParam.isBlank()) {
            schoolId = schoolIdParam;
        }
        return ResponseEntity.ok(groupService.listBySchool(schoolId));
    }

    @PostMapping
    public ResponseEntity<GroupDto> create(@Valid @RequestBody GroupRequest request) {
        CurrentUser user = CurrentUser.fromContext()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!"ADMIN".equalsIgnoreCase(user.role())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        String schoolId = user.schoolId();
        if ("global".equalsIgnoreCase(schoolId) && request.schoolId() != null && !request.schoolId().isBlank()) {
            schoolId = request.schoolId();
        }
        if (!"global".equalsIgnoreCase(user.schoolId()) && request.schoolId() != null && !request.schoolId().isBlank()
                && !user.schoolId().equalsIgnoreCase(request.schoolId())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "No puedes crear grupos en otro colegio");
        }
        return ResponseEntity.ok(groupService.create(request, schoolId));
    }
}
