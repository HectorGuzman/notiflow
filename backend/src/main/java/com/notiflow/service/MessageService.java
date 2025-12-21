package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.notiflow.dto.AttachmentRequest;
import com.notiflow.dto.MessageDto;
import com.notiflow.dto.MessageRequest;
import com.notiflow.model.AttachmentMetadata;
import com.notiflow.model.MessageDocument;
import com.notiflow.model.MessageStatus;
import com.notiflow.service.SchoolService;
import com.notiflow.util.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.concurrent.TimeUnit;

@Service
public class MessageService {

    private static final int MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
    private final Firestore firestore;
    private final EmailService emailService;
    private final Storage storage;
    private final SchoolService schoolService;
    private final String attachmentsBucket;

    public MessageService(
            Firestore firestore,
            EmailService emailService,
            Storage storage,
            SchoolService schoolService,
            @org.springframework.beans.factory.annotation.Value("${app.attachments.bucket:}") String attachmentsBucket
    ) {
        this.firestore = firestore;
        this.emailService = emailService;
        this.storage = storage;
        this.schoolService = schoolService;
        this.attachmentsBucket = attachmentsBucket;
    }

    public List<MessageDto> list(String year, String senderEmailFilter, int page, int pageSize) {
        try {
            int safePage = Math.max(1, page);
            int safeSize = Math.min(Math.max(1, pageSize), 100);
            var base = firestore.collection("messages");
            var queryRef = (year != null && !year.isBlank())
                    ? base.whereEqualTo("year", year)
                    : base;
            if (senderEmailFilter != null && !senderEmailFilter.isBlank()) {
                queryRef = queryRef.whereEqualTo("senderEmail", senderEmailFilter);
            }
            ApiFuture<QuerySnapshot> query = queryRef
                    .orderBy("createdAt", com.google.cloud.firestore.Query.Direction.DESCENDING)
                    .offset((safePage - 1) * safeSize)
                    .limit(safeSize)
                    .get();
            List<QueryDocumentSnapshot> docs = query.get().getDocuments();
            return docs.stream()
                    .map(doc -> {
                        MessageDocument msg = doc.toObject(MessageDocument.class);
                        msg.setId(doc.getId());
                        return new MessageDto(
                                msg.getId(),
                                msg.getContent(),
                                msg.getSenderName(),
                                msg.getSenderEmail(),
                                msg.getRecipients(),
                                msg.getChannels(),
                                msg.getEmailStatus(),
                                msg.getAppStatus(),
                                msg.getSchoolId(),
                                msg.getYear(),
                                msg.getStatus(),
                                msg.getCreatedAt(),
                                msg.getAttachments(),
                                msg.getReason()
                        );
                    })
                    .collect(Collectors.toList());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error listando mensajes", e);
        }
    }

    public MessageDto create(MessageRequest request, String senderId, String senderName) {
        try {
            String resolvedYear = request.year() != null && !request.year().isBlank()
                    ? request.year()
                    : String.valueOf(Year.now().getValue());
            String schoolId = request.schoolId();
            CurrentUser current = CurrentUser.fromContext().orElse(null);
            if ((schoolId == null || schoolId.isBlank()) && current != null) {
                schoolId = current.schoolId();
            }
            List<String> channels = request.channels() != null && !request.channels().isEmpty()
                    ? request.channels()
                    : List.of("email");

            MessageDocument msg = new MessageDocument();
            msg.setId(UUID.randomUUID().toString());
            msg.setContent(request.content());
            msg.setSenderId(senderId);
            msg.setSenderName(senderName);
            msg.setSenderEmail(senderId);
            msg.setRecipients(request.recipients());
            msg.setChannels(channels);
            msg.setSchoolId(schoolId);
            msg.setReason(request.reason());
            msg.setYear(resolvedYear);
            boolean mailOk = true;
            MessageStatus emailStatus = null;
            MessageStatus appStatus = null;

            List<AttachmentRequest> attachments = request.attachments() == null
                    ? List.of()
                    : request.attachments().stream().filter(Objects::nonNull).toList();
            validateAttachments(attachments);

            List<AttachmentMetadata> storedAttachments = storeAttachments(msg.getId(), schoolId, resolvedYear, attachments);
            msg.setAttachments(storedAttachments);

            String schoolLogo = null;
            String schoolName = null;
            try {
                if (schoolId != null && !schoolId.isBlank()) {
                    var school = schoolService.getById(schoolId);
                    schoolLogo = school != null ? school.getLogoUrl() : null;
                    schoolName = school != null ? school.getName() : null;
                }
            } catch (Exception ignore) {
                // si falla no bloqueamos el envío
            }

            String htmlBody = buildHtmlBody(request.content(), senderName, request.reason(), attachments, schoolLogo);
            String textBody = request.content();
            String subject = (schoolName != null && !schoolName.isBlank()
                    ? schoolName
                    : "Notiflow") + " - Nuevo mensaje de " + (senderName != null ? senderName : "Usuario");

            if (channels.contains("email") && emailService.isEnabled()) {
                List<String> emails = request.recipients().stream()
                        .filter(r -> r != null && r.contains("@"))
                        .collect(Collectors.toList());
                if (emails.isEmpty()) {
                    mailOk = false;
                    org.slf4j.LoggerFactory.getLogger(MessageService.class)
                            .warn("No se encontraron correos válidos en recipients");
                }
                for (String to : emails) {
                    boolean sent = emailService.sendMessageEmail(
                            to,
                            subject,
                            htmlBody,
                            textBody,
                            attachments
                    );
                    mailOk = mailOk && sent;
                }
            } else {
                if (channels.contains("email")) {
                    mailOk = false;
                    org.slf4j.LoggerFactory.getLogger(MessageService.class)
                            .warn("EmailService no está habilitado; no se enviarán correos");
                }
            }
            if (channels.contains("email")) {
                emailStatus = mailOk ? MessageStatus.SENT : MessageStatus.FAILED;
            }
            if (channels.contains("app")) {
                appStatus = MessageStatus.PENDING;
            }
            MessageStatus status = mailOk ? MessageStatus.SENT : MessageStatus.FAILED;
            msg.setStatus(status);
            msg.setEmailStatus(emailStatus);
            msg.setAppStatus(appStatus);
            msg.setCreatedAt(Instant.now());

            DocumentReference ref = firestore.collection("messages").document(msg.getId());
            ref.set(msg).get();

            return new MessageDto(
                    msg.getId(),
                    msg.getContent(),
                    msg.getSenderName(),
                    msg.getSenderEmail(),
                    msg.getRecipients(),
                    msg.getChannels(),
                    msg.getEmailStatus(),
                    msg.getAppStatus(),
                    msg.getSchoolId(),
                    msg.getYear(),
                    msg.getStatus(),
                    msg.getCreatedAt(),
                    msg.getAttachments(),
                    msg.getReason()
            );
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error creando mensaje", e);
        }
    }

    private void validateAttachments(List<AttachmentRequest> attachments) {
        for (AttachmentRequest att : attachments) {
            if (att.base64() == null || att.base64().isBlank()) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "El adjunto no contiene datos");
            }
            byte[] data;
            try {
                data = java.util.Base64.getDecoder().decode(att.base64());
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Adjunto inválido (base64)");
            }
            if (data.length > MAX_ATTACHMENT_BYTES) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Adjunto excede el límite de 10MB: " + att.fileName());
            }
        }
    }

    private List<AttachmentMetadata> storeAttachments(String messageId, String schoolId, String year, List<AttachmentRequest> attachments) {
        if (attachments == null || attachments.isEmpty() || attachmentsBucket == null || attachmentsBucket.isBlank()) {
            return List.of();
        }
        return attachments.stream().map(att -> {
            if (att.base64() == null || att.fileName() == null) return null;
            byte[] data = java.util.Base64.getDecoder().decode(att.base64());
            String cleanName = att.fileName().replaceAll("[^a-zA-Z0-9._-]", "_");
            String key = String.format("messages/%s/%s/%s", schoolId != null ? schoolId : "global", messageId, cleanName);
            BlobInfo blobInfo = BlobInfo.newBuilder(attachmentsBucket, key)
                    .setContentType(att.mimeType() != null ? att.mimeType() : "application/octet-stream")
                    .build();
            storage.create(blobInfo, data);
            java.net.URL signed = storage.signUrl(blobInfo, 30, TimeUnit.DAYS);
            return new AttachmentMetadata(
                    att.fileName(),
                    att.mimeType(),
                    (long) data.length,
                    signed != null ? signed.toString() : null,
                    att.inline(),
                    att.cid()
            );
        }).filter(Objects::nonNull).toList();
    }

    private String buildHtmlBody(String content, String senderName, String reason, List<AttachmentRequest> attachments, String logoUrl) {
        String safeContent = content == null ? "" : content;
        String htmlContent = safeContent
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\n", "<br/>");

        // Adjunta una imagen inline si existe
        AttachmentRequest inlineImg = attachments.stream()
                .filter(a -> Boolean.TRUE.equals(a.inline()) && a.cid() != null && a.mimeType() != null && a.mimeType().startsWith("image/"))
                .findFirst()
                .orElse(null);
        if (inlineImg != null) {
            htmlContent = htmlContent + "<p style=\"margin-top:12px;\"><img src=\"cid:" + inlineImg.cid() + "\" alt=\"imagen adjunta\" style=\"max-width:100%;\"/></p>";
        }

        String logoBlock = (logoUrl != null && !logoUrl.isBlank())
                ? "<img src=\"" + logoUrl + "\" alt=\"Logo\" style=\"max-height:120px; display:block;\" />"
                : "<span style=\"font-weight:600;\">Notiflow</span>";
        String headerText = (reason != null && !reason.isBlank()) ? reason : "Mensaje";

        return """
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background:#e0f2fe; padding:24px;">
                  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <div style="background:#16a34a;color:#fff;padding:16px 20px;font-size:16px;font-weight:600;display:flex;align-items:center;gap:10px;">
                      %s
                      <span style="flex:1;"></span>
                      <span style="font-size:14px;">%s</span>
                    </div>
                    <div style="padding:20px;font-size:15px;color:#111827;line-height:1.6;">
                      %s
                    </div>
                    <div style="padding:16px 20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
                      Enviado a través de Notiflow
                    </div>
                  </div>
                </div>
                """.formatted(logoBlock, headerText, htmlContent);
    }
}
