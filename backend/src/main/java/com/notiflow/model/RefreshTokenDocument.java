package com.notiflow.model;

import com.google.cloud.firestore.annotation.DocumentId;

import java.time.Instant;

public class RefreshTokenDocument {
    @DocumentId
    private String id;
    private String userEmail;
    private boolean revoked;
    private Instant expiresAt;
    private Instant createdAt;

    public RefreshTokenDocument() {}

    public RefreshTokenDocument(String id, String userEmail, Instant expiresAt) {
        this.id = id;
        this.userEmail = userEmail;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
        this.revoked = false;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public boolean isRevoked() { return revoked; }
    public void setRevoked(boolean revoked) { this.revoked = revoked; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
