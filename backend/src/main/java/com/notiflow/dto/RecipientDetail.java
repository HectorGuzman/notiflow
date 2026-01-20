package com.notiflow.dto;

// Firestore necesita un POJO con constructor vacío y getters/setters
public class RecipientDetail {
    private String email;
    private String name;

    public RecipientDetail() {}

    public RecipientDetail(String email, String name) {
        this.email = email;
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
