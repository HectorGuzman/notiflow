package com.notiflow.dto;

public record AttachmentRequest(
        String fileName,
        String mimeType,
        String base64,
        Boolean inline,
        String cid
) {
}
