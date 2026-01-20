package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class OtpService {

    private final Firestore firestore;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();
    private static final int TTL_MINUTES = 10;

    public OtpService(Firestore firestore, EmailService emailService) {
        this.firestore = firestore;
        this.emailService = emailService;
    }

    public void requestCode(String email) {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant expires = Instant.now().plusSeconds(TTL_MINUTES * 60L);
        try {
            DocumentReference ref = firestore.collection("loginCodes").document(normalized);
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("email", normalized);
            data.put("code", code);
            data.put("expiresAt", expires.toString());
            data.put("attempts", 0);
            ref.set(data).get();
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("No se pudo generar código", e);
        }
        // Enviar correo con el código
        emailService.sendMessageEmail(
                normalized,
                "Tu código de acceso a Notiflow",
                """
                <div style="font-family: Arial, sans-serif; padding:16px; background:#f5f7fb;">
                  <div style="max-width:520px;margin:0 auto;background:#fff;padding:20px;border-radius:12px;border:1px solid #e5e7eb;">
                    <h2 style="margin:0 0 8px 0;color:#0f766e;">Código de acceso</h2>
                    <p style="margin:0 0 12px 0;color:#111827;">Usa este código para ingresar a la app:</p>
                    <div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#0f766e;text-align:center;padding:12px 0;">%s</div>
                    <p style="margin:12px 0 0 0;color:#6b7280;">Caduca en %d minutos.</p>
                  </div>
                </div>
                """.formatted(code, TTL_MINUTES),
                "Tu código de acceso es: " + code,
                null
        );
    }

    public boolean verifyCode(String email, String code) {
        String normalized = email == null ? "" : email.trim().toLowerCase();
        try {
            ApiFuture<QuerySnapshot> query = firestore.collection("loginCodes")
                    .whereEqualTo("email", normalized)
                    .limit(1)
                    .get();
            List<QueryDocumentSnapshot> docs = query.get().getDocuments();
            if (docs.isEmpty()) return false;
            var doc = docs.get(0);
            String stored = doc.getString("code");
            String expires = doc.getString("expiresAt");
            Long attempts = doc.getLong("attempts");
            if (attempts != null && attempts > 5) return false;
            if (expires != null && Instant.parse(expires).isBefore(Instant.now())) {
                firestore.collection("loginCodes").document(doc.getId()).delete();
                return false;
            }
            if (stored != null && stored.equals(code)) {
                firestore.collection("loginCodes").document(doc.getId()).delete();
                return true;
            } else {
                firestore.collection("loginCodes").document(doc.getId()).update("attempts", (attempts == null ? 0 : attempts) + 1);
                return false;
            }
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
