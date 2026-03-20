package com.deeptrace.faq.dto;

public record SesVerificationStatusResponse(
        String email,
        String status,
        String rawStatus,
        boolean verified,
        boolean pending
) {
}

