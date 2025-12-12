package com.notiflow.model;

import com.google.cloud.firestore.annotation.DocumentId;

public class SchoolDocument {
    @DocumentId
    private String id;
    private String name;

    public SchoolDocument() {}

    public SchoolDocument(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
