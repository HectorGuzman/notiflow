package com.notiflow.model;

import com.google.cloud.firestore.annotation.DocumentId;

import java.time.Instant;

public class PasswordResetDocument {

    @DocumentId
    private String token;
    private String email;
    private Instant expiresAt;
    private boolean used;

    public PasswordResetDocument() {}

    public PasswordResetDocument(String token, String email, Instant expiresAt, boolean used) {
        this.token = token;
        this.email = email;
        this.expiresAt = expiresAt;
        this.used = used;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isUsed() {
        return used;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }
}
