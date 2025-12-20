package com.notiflow.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final SendGrid sendGrid;
    private final boolean enabled;
    private final String senderEmail;
    private final String frontendBaseUrl;

    public EmailService(
            @Value("${SENDGRID_API_KEY:}") String apiKey,
            @Value("${app.mail.from:no-reply@notiflow.local}") String senderEmail,
            @Value("${app.frontend-url:https://hectorguzman.github.io/notiflow}") String frontendBaseUrl
    ) {
        this.enabled = apiKey != null && !apiKey.isBlank() && senderEmail != null && !senderEmail.isBlank();
        this.sendGrid = this.enabled ? new SendGrid(apiKey) : null;
        this.senderEmail = senderEmail;
        this.frontendBaseUrl = frontendBaseUrl != null && frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
    }

    public boolean sendPasswordResetEmail(String to, String token, Instant expiresAt) {
        if (!enabled) {
            log.warn("SendGrid no está configurado; no se enviará email de recuperación");
            return false;
        }
        String link = buildResetLink(token);
        String humanExpiration = expiresAt == null
                ? "pronto"
                : DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
                    .withZone(ZoneId.systemDefault())
                    .format(expiresAt);

        String text = """
                Hola,

                Recibimos una solicitud para restablecer tu contraseña en Notiflow.
                Usa el siguiente enlace o token para completar el proceso.

                Enlace: %s
                Token: %s
                Expira: %s

                Si no solicitaste esto, puedes ignorar este correo.
                """.formatted(link, token, humanExpiration);

        Mail mail = new Mail(
                new Email(senderEmail, "Notiflow"),
                "Recupera tu contraseña",
                new Email(to),
                new Content("text/plain", text)
        );

        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sendGrid.api(request);
            boolean ok = response != null && response.getStatusCode() >= 200 && response.getStatusCode() < 300;
            if (!ok) {
                log.error("Fallo al enviar correo de reset (status {}): {}", response != null ? response.getStatusCode() : "?", response != null ? response.getBody() : "sin body");
            }
            return ok;
        } catch (IOException e) {
            log.error("No se pudo enviar correo de recuperación", e);
            return false;
        }
    }

    public boolean sendMessageEmail(String to, String subject, String body) {
        if (!enabled) {
            log.warn("SendGrid no configurado; se omite envío a {}", to);
            return false;
        }
        Mail mail = new Mail(
                new Email(senderEmail, "Notiflow"),
                subject,
                new Email(to),
                new Content("text/plain", body)
        );
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sendGrid.api(request);
            boolean ok = response != null && response.getStatusCode() >= 200 && response.getStatusCode() < 300;
            if (!ok) {
                log.error("Fallo al enviar correo a {} (status {}): {}", to,
                        response != null ? response.getStatusCode() : "?", response != null ? response.getBody() : "sin body");
            }
            return ok;
        } catch (IOException e) {
            log.error("No se pudo enviar correo a {}", to, e);
            return false;
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    private String buildResetLink(String token) {
        String base = frontendBaseUrl == null || frontendBaseUrl.isBlank()
                ? "https://hectorguzman.github.io/notiflow"
                : frontendBaseUrl;
        return base + (base.endsWith("/") ? "" : "/") + "forgot-password?token=" + token;
    }
}
