package com.notiflow.model;

import com.google.cloud.firestore.annotation.DocumentId;

import java.time.Instant;

public class DeviceToken {
    @DocumentId
    private String id;
    private String email;
    private String token;
    private String platform;
    private Instant createdAt;

    public DeviceToken() {}

    public DeviceToken(String id, String email, String token, String platform, Instant createdAt) {
        this.id = id;
        this.email = email;
        this.token = token;
        this.platform = platform;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
