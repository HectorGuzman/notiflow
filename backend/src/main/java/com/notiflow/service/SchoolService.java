package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.notiflow.dto.SchoolRequest;
import com.notiflow.model.SchoolDocument;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class SchoolService {

    private final Firestore firestore;

    public SchoolService(Firestore firestore) {
        this.firestore = firestore;
    }

    public List<SchoolDocument> listAll() {
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection("schools").get();
            List<QueryDocumentSnapshot> docs = query.get().getDocuments();
            return docs.stream().map(doc -> {
                SchoolDocument s = doc.toObject(SchoolDocument.class);
                s.setId(doc.getId());
                return s;
            }).collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error listando escuelas", e);
        }
    }

    public SchoolDocument create(SchoolRequest request) {
        try {
            SchoolDocument doc = new SchoolDocument();
            doc.setId(request.id());
            doc.setName(request.name());
            DocumentReference ref = firestore.collection("schools").document(doc.getId());
            ref.set(doc).get();
            return doc;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error creando escuela", e);
        }
    }

    public SchoolDocument getById(String id) {
        try {
            DocumentReference ref = firestore.collection("schools").document(id);
            DocumentSnapshot snap = ref.get().get();
            if (!snap.exists()) {
                throw new IllegalArgumentException("Escuela no existe");
            }
            SchoolDocument doc = snap.toObject(SchoolDocument.class);
            if (doc != null) {
                doc.setId(snap.getId());
            }
            return doc;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error obteniendo escuela", e);
        }
    }
}
