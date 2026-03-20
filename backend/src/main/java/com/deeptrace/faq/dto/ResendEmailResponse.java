package com.deeptrace.faq.dto;

public record ResendEmailResponse(
        Long submissionId,
        boolean emailSent,
        String message
) {
}

