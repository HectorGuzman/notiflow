package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.FirestoreException;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.notiflow.dto.GroupDto;
import com.notiflow.dto.GroupRequest;
import com.notiflow.model.GroupDocument;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final Firestore firestore;

    public GroupService(Firestore firestore) {
        this.firestore = firestore;
    }

    public List<GroupDto> listBySchool(String schoolId, String year, int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(Math.max(1, pageSize), 100);
        var baseCollection = firestore.collection("groups").whereEqualTo("schoolId", schoolId);
        var filtered = (year != null && !year.isBlank())
                ? baseCollection.whereEqualTo("year", year)
                : baseCollection;

        // Intentamos con orderBy; si falta índice, hacemos fallback sin orderBy para no botar el servicio.
        try {
            return runQuery(filtered.orderBy("createdAt", com.google.cloud.firestore.Query.Direction.DESCENDING), safePage, safeSize);
        } catch (RuntimeException ex) {
            if (isMissingIndex(ex)) {
                return runQuery(filtered, safePage, safeSize);
            }
            throw ex;
        }
    }

    private List<GroupDto> runQuery(com.google.cloud.firestore.Query query, int page, int size) {
        try {
            ApiFuture<QuerySnapshot> future = query.offset((page - 1) * size).limit(size).get();
            List<QueryDocumentSnapshot> docs = future.get().getDocuments();
            return docs.stream().map(doc -> {
                GroupDocument g = doc.toObject(GroupDocument.class);
                g.setId(doc.getId());
                return new GroupDto(g.getId(), g.getName(), g.getDescription(), g.getMemberIds(), g.getSchoolId(), g.getYear(), g.getCreatedAt());
            }).collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error listando grupos", e);
        }
    }

    private boolean isMissingIndex(Throwable ex) {
        if (ex instanceof RuntimeException && ex.getCause() != null) {
            return isMissingIndex(ex.getCause());
        }
        if (ex instanceof FirestoreException fe) {
            String code = fe.getStatus() != null && fe.getStatus().getCode() != null
                    ? fe.getStatus().getCode().name()
                    : "";
            String msg = fe.getMessage() != null ? fe.getMessage().toLowerCase() : "";
            return "failed_precondition".equalsIgnoreCase(code) && msg.contains("index");
        }
        return false;
    }

    public GroupDto create(GroupRequest request, String schoolId) {
        try {
            GroupDocument g = new GroupDocument();
            g.setId(UUID.randomUUID().toString());
            g.setName(request.name());
            g.setDescription(request.description());
            g.setMemberIds(request.memberIds());
            g.setSchoolId(schoolId);
            g.setYear(request.year() != null && !request.year().isBlank()
                    ? request.year()
                    : String.valueOf(java.time.Year.now().getValue()));
            g.setCreatedAt(Instant.now());

            DocumentReference ref = firestore.collection("groups").document(g.getId());
            ref.set(g).get();

            return new GroupDto(g.getId(), g.getName(), g.getDescription(), g.getMemberIds(), g.getSchoolId(), g.getYear(), g.getCreatedAt());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error creando grupo", e);
        }
    }

    public GroupDto update(String id, GroupRequest request, String schoolId, boolean isGlobalAdmin) {
        try {
            DocumentReference ref = firestore.collection("groups").document(id);
            var snap = ref.get().get();
            if (!snap.exists()) {
                throw new IllegalArgumentException("Grupo no encontrado");
            }
            GroupDocument existing = snap.toObject(GroupDocument.class);
            if (existing == null) {
                throw new IllegalArgumentException("Grupo inválido");
            }
            if (!isGlobalAdmin && existing.getSchoolId() != null && !existing.getSchoolId().equalsIgnoreCase(schoolId)) {
                throw new IllegalArgumentException("No puedes editar grupos de otro colegio");
            }

            existing.setName(request.name());
            existing.setDescription(request.description());
            existing.setMemberIds(request.memberIds());
            existing.setSchoolId(isGlobalAdmin && request.schoolId() != null && !request.schoolId().isBlank()
                    ? request.schoolId()
                    : existing.getSchoolId());
            existing.setYear(request.year() != null && !request.year().isBlank()
                    ? request.year()
                    : existing.getYear());

            ref.set(existing).get();
            return new GroupDto(existing.getId(), existing.getName(), existing.getDescription(), existing.getMemberIds(), existing.getSchoolId(), existing.getYear(), existing.getCreatedAt());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error actualizando grupo", e);
        }
    }

    public void delete(String id, String schoolId, boolean isGlobalAdmin) {
        try {
            DocumentReference ref = firestore.collection("groups").document(id);
            var snap = ref.get().get();
            if (!snap.exists()) {
                throw new IllegalArgumentException("Grupo no encontrado");
            }
            GroupDocument existing = snap.toObject(GroupDocument.class);
            if (existing == null) {
                throw new IllegalArgumentException("Grupo inválido");
            }
            if (!isGlobalAdmin && existing.getSchoolId() != null && !existing.getSchoolId().equalsIgnoreCase(schoolId)) {
                throw new IllegalArgumentException("No puedes borrar grupos de otro colegio");
            }
            ref.delete().get();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error eliminando grupo", e);
        }
    }
}
