package com.notiflow.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/app/version")
public class AppVersionController {

    @Value("${app.version.latest:1.0.0}")
    private String latestVersion;

    @Value("${app.version.min-supported:1.0.0}")
    private String minSupportedVersion;

    @Value("${app.version.store-url:https://play.google.com/store/apps/details?id=com.notiflow}")
    private String storeUrl;

    @Value("${app.version.message:Nueva versión disponible}")
    private String message;

    @GetMapping
    public Map<String, String> getVersionInfo() {
        Map<String, String> map = new HashMap<>();
        map.put("latest", latestVersion);
        map.put("minSupported", minSupportedVersion);
        map.put("storeUrl", storeUrl);
        map.put("message", message);
        return map;
    }
}
