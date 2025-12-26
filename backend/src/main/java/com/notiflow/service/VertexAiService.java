package com.notiflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class VertexAiService {

    private static final Logger log = LoggerFactory.getLogger(VertexAiService.class);
    private final String projectId;
    private final String location;
    private final String rewriteModel;
    private final String moderationModel;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpTransport transport = new NetHttpTransport();
    private final HttpRequestFactory requestFactory = transport.createRequestFactory();
    private final AiPolicyService policyService;

    public VertexAiService(
            @Value("${VERTEX_PROJECT_ID:${FIRESTORE_PROJECT_ID:notiflow-480919}}") String projectId,
            @Value("${VERTEX_LOCATION:us-central1}") String location,
            @Value("${VERTEX_MODEL_REWRITE:gemini-1.5-flash}") String rewriteModel,
            @Value("${VERTEX_MODEL_MODERATION:gemini-1.5-flash}") String moderationModel,
            AiPolicyService policyService
    ) {
        this.projectId = projectId;
        this.location = location;
        this.rewriteModel = rewriteModel;
        this.moderationModel = moderationModel;
        this.policyService = policyService;
    }

    public String rewrite(String text, String tone) {
        return rewrite(text, tone, "global");
    }

    public String rewrite(String text, String tone, String schoolId) {
        String style = (tone == null || tone.isBlank()) ? "neutro profesional" : tone;
        var policy = policyService.getPolicy(schoolId);
        String base = policy.rewritePrompt();
        String prompt = base
                .replace("{tone}", style)
                .replace("{texto}", text)
                .replace("{text}", text);
        return callModel(rewriteModel, prompt);
    }

    public ModerationResult moderate(String text) {
        return moderate(text, "global");
    }

    public ModerationResult moderate(String text, String schoolId) {
        var policy = policyService.getPolicy(schoolId);
        String rulesText = String.join(", ", policy.moderationRules());
        String basePrompt = """
                Eres un moderador. Analiza el siguiente mensaje de un colegio.
                Responde SOLO en JSON con la forma {"allowed":true/false,"reasons":["..."]}.
                Debes marcar allowed=false si detectas: {rules}. Si no hay problema, allowed=true y reasons=[].
                Mensaje:
                {texto}
                """;
        String prompt = basePrompt
                .replace("{rules}", rulesText)
                .replace("{texto}", text)
                .replace("{text}", text);

        String raw = callModel(moderationModel, prompt);
        try {
            String cleaned = cleanJson(raw);
            JsonNode node = mapper.readTree(cleaned);
            boolean allowed = node.path("allowed").asBoolean(true);
            List<String> reasons = mapper.convertValue(node.path("reasons"), mapper.getTypeFactory().constructCollectionType(List.class, String.class));
            return new ModerationResult(allowed, reasons == null ? List.of() : reasons);
        } catch (Exception e) {
            log.warn("No se pudo parsear respuesta de moderación, se permite por defecto. resp={}", raw, e);
            return new ModerationResult(true, List.of());
        }
    }

    public RewriteModerateResult rewriteAndModerate(String text, String subject, String tone, String schoolId) {
        String style = (tone == null || tone.isBlank()) ? "neutro profesional" : tone;
        var policy = policyService.getPolicy(schoolId);
        String base = policy.rewritePrompt();

        String prompt = """
                %s

                Tono preferido: %s
                Asunto original: %s
                Cuerpo original:
                %s

                Reescribe ambos. Resalta puntos clave con **negrita** y mantiene links si existen.
                Responde SOLO en JSON con la forma:
                {"subject":"<asunto mejorado>","body":"<cuerpo mejorado con **negritas** y links detectados>"}
                """.formatted(base, style, subject == null ? "" : subject, text);

        String raw = callModel(rewriteModel, prompt);
        String subjectSuggestion = subject;
        String bodySuggestion = text;
        try {
            String cleaned = cleanJson(raw);
            JsonNode node = mapper.readTree(cleaned);
            if (node.has("subject")) {
                subjectSuggestion = node.get("subject").asText(subject);
            }
            if (node.has("body")) {
                bodySuggestion = node.get("body").asText(text);
            } else if (node.has("text")) {
                bodySuggestion = node.get("text").asText(text);
            }
        } catch (Exception e) {
            log.warn("No se pudo parsear JSON de rewrite, usando fallback. raw={}", raw);
            String fallback = raw == null ? "" : raw;
            // intenta extraer "body": "..."
            java.util.regex.Matcher mBody = java.util.regex.Pattern
                    .compile("\"body\"\\s*:\\s*\"(.*?)\"", java.util.regex.Pattern.DOTALL)
                    .matcher(fallback);
            if (mBody.find()) {
                bodySuggestion = mBody.group(1).replace("\\n", "\n");
            } else {
                // si no se pudo, devuelve el texto original para no mostrar JSON completo al usuario
                bodySuggestion = text;
            }
            java.util.regex.Matcher mSubj = java.util.regex.Pattern
                    .compile("\"subject\"\\s*:\\s*\"(.*?)\"", java.util.regex.Pattern.DOTALL)
                    .matcher(fallback);
            if (mSubj.find()) {
                subjectSuggestion = mSubj.group(1);
            }
        }

        String toModerate = (subjectSuggestion == null ? "" : subjectSuggestion + "\n") + bodySuggestion;
        ModerationResult moderation = moderate(toModerate, schoolId);
        return new RewriteModerateResult(bodySuggestion, subjectSuggestion, moderation.allowed(), moderation.reasons());
    }

    private String callModel(String model, String prompt) {
        try {
            String token = GoogleCredentials.getApplicationDefault()
                    .createScoped(Collections.singletonList("https://www.googleapis.com/auth/cloud-platform"))
                    .refreshAccessToken()
                    .getTokenValue();

            String url = String.format(
                    "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent",
                    location, projectId, location, model
            );

            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "role", "user",
                                    "parts", List.of(Map.of("text", prompt))
                            )
                    )
            );

            HttpRequest request = requestFactory.buildPostRequest(new GenericUrl(url),
                    new JsonHttpContent(new JacksonFactory(), body));
            request.getHeaders().setAuthorization("Bearer " + token);
            request.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
            request.setReadTimeout((int) Duration.ofSeconds(30).toMillis());

            HttpResponse response = request.execute();
            String responseString = response.parseAsString();
            JsonNode root = mapper.readTree(responseString);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                if (!textNode.isMissingNode()) {
                    return textNode.asText();
                }
            }
            log.warn("Respuesta sin texto, devolviendo prompt original");
            return prompt;
        } catch (IOException e) {
            log.error("Error llamando a Vertex AI", e);
            throw new RuntimeException("No se pudo llamar a Vertex AI");
        }
    }

    public record ModerationResult(boolean allowed, List<String> reasons) {
    }

    public record RewriteModerateResult(String suggestion, String subjectSuggestion, boolean allowed, List<String> reasons) {
    }

    private String cleanJson(String raw) {
        String cleaned = raw == null ? "" : raw.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("(?s)```json?", "").replaceAll("```", "").trim();
        }
        int firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) {
            cleaned = cleaned.substring(firstBrace);
        }
        return cleaned;
    }
}
