package com.notiflow.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.notiflow.dto.AiPolicyResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Service
public class AiPolicyService {

    private static final Logger log = LoggerFactory.getLogger(AiPolicyService.class);
    private final Firestore firestore;

    // Placeholders permitidos: {tone}, {texto} o {text}, {rules}
    private static final String DEFAULT_REWRITE_PROMPT = """
            Mejora la redacción del siguiente mensaje manteniendo el significado.
            Adáptalo a un tono {tone}, claro y respetuoso.
            Resalta los puntos clave en negrita usando **doble asterisco**.
            Devuelve solo el texto mejorado (puede incluir **negritas**), sin marcas adicionales.
            Mensaje original:
            {texto}
            """;

    private static final List<String> DEFAULT_RULES = List.of(
            "Discurso de odio o racismo",
            "Política partidista",
            "Violencia o acoso",
            "Información sensible no académica"
    );

    public AiPolicyService(Firestore firestore) {
        this.firestore = firestore;
    }

    public AiPolicyResponse getPolicy(String schoolId) {
        String id = schoolId == null || schoolId.isBlank() ? "global" : schoolId.toLowerCase();
        try {
            DocumentReference ref = firestore.collection("aiPolicies").document(id);
            ApiFuture<DocumentSnapshot> future = ref.get();
            DocumentSnapshot snap = future.get();
            if (!snap.exists()) {
                return new AiPolicyResponse(id, DEFAULT_REWRITE_PROMPT, DEFAULT_RULES, null, null);
            }
            String rewritePrompt = snap.getString("rewritePrompt");
            @SuppressWarnings("unchecked")
            List<String> rules = (List<String>) snap.get("moderationRules");
            String updatedBy = snap.getString("updatedBy");
            Instant updatedAt = snap.contains("updatedAt")
                    ? snap.getTimestamp("updatedAt").toDate().toInstant()
                    : null;
            return new AiPolicyResponse(
                    id,
                    rewritePrompt != null && !rewritePrompt.isBlank() ? rewritePrompt : DEFAULT_REWRITE_PROMPT,
                    rules != null && !rules.isEmpty() ? rules : DEFAULT_RULES,
                    updatedBy,
                    updatedAt
            );
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            log.error("No se pudo leer política IA para {}", schoolId, e);
            return new AiPolicyResponse("global", DEFAULT_REWRITE_PROMPT, DEFAULT_RULES, null, null);
        }
    }

    public AiPolicyResponse savePolicy(String schoolId, String rewritePrompt, List<String> rules, String updatedBy) {
        String id = schoolId == null || schoolId.isBlank() ? "global" : schoolId.toLowerCase();
        String promptToSave = (rewritePrompt == null || rewritePrompt.isBlank()) ? DEFAULT_REWRITE_PROMPT : rewritePrompt;
        List<String> rulesToSave = (rules == null || rules.isEmpty()) ? DEFAULT_RULES : new ArrayList<>(rules);
        rulesToSave = rulesToSave.stream().map(String::trim).filter(s -> !s.isBlank()).toList();
        Map<String, Object> data = Map.of(
                "rewritePrompt", promptToSave,
                "moderationRules", rulesToSave,
                "updatedBy", updatedBy,
                "updatedAt", com.google.cloud.Timestamp.now()
        );
        try {
            firestore.collection("aiPolicies").document(id).set(data).get();
            return new AiPolicyResponse(id, promptToSave, rulesToSave, updatedBy, Instant.now());
        } catch (InterruptedException | ExecutionException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("No se pudo guardar la política IA", e);
        }
    }

    public String defaultRewritePrompt() {
        return DEFAULT_REWRITE_PROMPT;
    }

    public List<String> defaultRules() {
        return Collections.unmodifiableList(DEFAULT_RULES);
    }
}
