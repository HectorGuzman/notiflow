package com.notiflow.dto;

import java.util.List;

public record ImportResult(
        int processed,
        int created,
        int updated,
        List<String> errors
) {}
