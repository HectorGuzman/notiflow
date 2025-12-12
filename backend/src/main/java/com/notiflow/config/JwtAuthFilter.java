package com.notiflow.config;

import com.notiflow.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = jwtService.parseClaims(token);
            String subject = claims.getSubject();
            String roleClaim = claims.get("role", String.class);
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + roleClaim);
            Map<String, Object> details = Map.of(
                    "email", subject,
                    "role", roleClaim,
                    "schoolId", claims.get("schoolId", String.class),
                    "schoolName", claims.get("schoolName", String.class)
            );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(subject, null, Collections.singletonList(authority));
            authentication.setDetails(details);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception ex) {
            // token inválido; se ignora y pasa como no autenticado
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
