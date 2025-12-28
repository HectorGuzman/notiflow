package com.notiflow.dto;

import java.util.List;

public record GroupListResponse(
        List<GroupDto> items,
        long total,
        int page,
        int pageSize,
        boolean hasMore
) {
}
