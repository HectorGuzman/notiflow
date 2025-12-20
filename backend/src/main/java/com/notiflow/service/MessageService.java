package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.notiflow.dto.MessageDto;
import com.notiflow.dto.MessageRequest;
import com.notiflow.model.MessageDocument;
import com.notiflow.model.MessageStatus;
import com.notiflow.util.CurrentUser;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.Year;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final Firestore firestore;
    private final EmailService emailService;

    public MessageService(Firestore firestore, EmailService emailService) {
        this.firestore = firestore;
        this.emailService = emailService;
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
                                msg.getCreatedAt()
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
            msg.setYear(resolvedYear);
            boolean mailOk = true;
            MessageStatus emailStatus = null;
            MessageStatus appStatus = null;

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
                            "Nuevo mensaje de " + senderName,
                            request.content()
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
                    msg.getCreatedAt()
            );
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Error creando mensaje", e);
        }
    }
}
