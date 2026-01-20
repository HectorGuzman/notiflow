package com.notiflow.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class RefreshJwtService {

    private final SecretKey key;
    private final long expirationSeconds;

    public RefreshJwtService(
            @Value("${app.jwt.refresh-secret:change-me-dev-refresh}") String secret,
            @Value("${app.jwt.refresh-expiration-seconds:2592000}") long expirationSeconds
    ) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length < 32) { // < 256 bits
            try {
                raw = MessageDigest.getInstance("SHA-256").digest(raw);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("No SHA-256 available for refresh secret", e);
            }
        }
        this.key = Keys.hmacShaKeyFor(raw);
        this.expirationSeconds = expirationSeconds;
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public String generateToken(Map<String, Object> claims, String subject) {
        Instant now = Instant.now();
        String jti = UUID.randomUUID().toString();
        claims.put("jti", jti);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
