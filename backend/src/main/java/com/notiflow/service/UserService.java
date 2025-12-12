package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.notiflow.dto.UserCreateRequest;
import com.notiflow.dto.UserDto;
import com.notiflow.model.UserDocument;
import com.notiflow.model.UserRole;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final Firestore firestore;
    private final PasswordEncoder passwordEncoder;

    public UserService(Firestore firestore, PasswordEncoder passwordEncoder) {
        this.firestore = firestore;
        this.passwordEncoder = passwordEncoder;
    }

    public Optional<UserDocument> findByEmail(String email) {
        try {
            String normalizedEmail = email.toLowerCase();
            ApiFuture<QuerySnapshot> query = firestore.collection("users")
                    .whereEqualTo("email", normalizedEmail)
                    .limit(1)
                    .get();
            List<QueryDocumentSnapshot> docs = query.get().getDocuments();
            if (docs.isEmpty()) {
                return Optional.empty();
            }
            UserDocument user = docs.get(0).toObject(UserDocument.class);
            user.setId(docs.get(0).getId());
            return Optional.of(user);
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error consultando usuario", e);
        }
    }

    public UserDocument upsert(UserDocument user) {
        try {
            String docId = user.getId() != null ? user.getId() : UUID.randomUUID().toString();
            user.setId(docId);
            DocumentReference ref = firestore.collection("users").document(docId);
            ref.set(user).get();
            return user;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error guardando usuario", e);
        }
    }

    public List<UserDto> listAll() {
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection("users").limit(100).get();
            List<QueryDocumentSnapshot> docs = query.get().getDocuments();
            return docs.stream().map(doc -> {
                UserDocument u = doc.toObject(UserDocument.class);
                u.setId(doc.getId());
                return new UserDto(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getRole(),
                        u.getSchoolId(),
                        u.getSchoolName()
                );
            }).collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error listando usuarios", e);
        }
    }

    public UserDto create(UserCreateRequest request) {
        UserDocument doc = new UserDocument();
        doc.setName(request.name());
        doc.setEmail(request.email().toLowerCase());
        doc.setPasswordHash(passwordEncoder.encode(request.password()));
        doc.setRole(request.role());
        doc.setSchoolId(request.schoolId());
        doc.setSchoolName(request.schoolName());
        UserDocument saved = upsert(doc);
        return new UserDto(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getRole(),
                saved.getSchoolId(),
                saved.getSchoolName()
        );
    }
}
