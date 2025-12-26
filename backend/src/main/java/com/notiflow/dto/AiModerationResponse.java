package com.notiflow.dto;

import java.util.List;

public record AiModerationResponse(
        boolean allowed,
        List<String> reasons
) {
}
