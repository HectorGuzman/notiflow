package com.notiflow.service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import com.notiflow.model.RefreshTokenDocument;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ExecutionException;

@Service
public class RefreshTokenStore {
    private final Firestore firestore;

    public RefreshTokenStore(Firestore firestore) {
        this.firestore = firestore;
    }

    private com.google.cloud.firestore.CollectionReference col() {
        return firestore.collection("refreshTokens");
    }

    public void save(String jti, String email, Instant expiresAt) {
        RefreshTokenDocument doc = new RefreshTokenDocument(jti, email, expiresAt);
        col().document(jti).set(doc);
    }

    public boolean isValid(String jti) {
        try {
            var snap = col().document(jti).get().get();
            if (!snap.exists()) return false;
            RefreshTokenDocument doc = snap.toObject(RefreshTokenDocument.class);
            if (doc == null) return false;
            if (doc.isRevoked()) return false;
            if (doc.getExpiresAt() != null && doc.getExpiresAt().isBefore(Instant.now())) return false;
            return true;
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    public void revoke(String jti) {
        try {
            col().document(jti).update("revoked", true).get();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
        }
    }
}
