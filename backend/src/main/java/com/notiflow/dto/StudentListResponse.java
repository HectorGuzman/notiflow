package com.notiflow.dto;

import java.util.List;

public record StudentListResponse(
        List<StudentDto> items,
        long total,
        int page,
        int pageSize,
        boolean hasMore
) {
}
