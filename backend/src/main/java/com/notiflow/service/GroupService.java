package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
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

    public List<GroupDto> listBySchool(String schoolId) {
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection("groups")
                    .whereEqualTo("schoolId", schoolId)
                    .get();
            List<QueryDocumentSnapshot> docs = query.get().getDocuments();
            return docs.stream().map(doc -> {
                GroupDocument g = doc.toObject(GroupDocument.class);
                g.setId(doc.getId());
                return new GroupDto(g.getId(), g.getName(), g.getDescription(), g.getMemberIds(), g.getSchoolId(), g.getCreatedAt());
            }).collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error listando grupos", e);
        }
    }

    public GroupDto create(GroupRequest request, String schoolId) {
        try {
            GroupDocument g = new GroupDocument();
            g.setId(UUID.randomUUID().toString());
            g.setName(request.name());
            g.setDescription(request.description());
            g.setMemberIds(request.memberIds());
            g.setSchoolId(schoolId);
            g.setCreatedAt(Instant.now());

            DocumentReference ref = firestore.collection("groups").document(g.getId());
            ref.set(g).get();

            return new GroupDto(g.getId(), g.getName(), g.getDescription(), g.getMemberIds(), g.getSchoolId(), g.getCreatedAt());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error creando grupo", e);
        }
    }
}
