package com.notiflow.dto;

import java.util.List;

public record MessageListResponse(
        List<MessageDto> items,
        long total,
        int page,
        int pageSize,
        boolean hasMore
) {
}
