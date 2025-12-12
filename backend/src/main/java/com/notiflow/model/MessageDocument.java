package com.notiflow.model;

import com.google.cloud.firestore.annotation.DocumentId;

import java.time.Instant;
import java.util.List;

public class MessageDocument {

    @DocumentId
    private String id;
    private String content;
    private String senderId;
    private String senderName;
    private List<String> recipients;
    private MessageStatus status;
    private Instant createdAt;

    public MessageDocument() {
    }

    public MessageDocument(String id, String content, String senderId, String senderName, List<String> recipients, MessageStatus status, Instant createdAt) {
        this.id = id;
        this.content = content;
        this.senderId = senderId;
        this.senderName = senderName;
        this.recipients = recipients;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public List<String> getRecipients() {
        return recipients;
    }

    public void setRecipients(List<String> recipients) {
        this.recipients = recipients;
    }

    public MessageStatus getStatus() {
        return status;
    }

    public void setStatus(MessageStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
