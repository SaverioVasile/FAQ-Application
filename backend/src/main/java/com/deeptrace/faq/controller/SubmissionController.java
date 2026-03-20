package com.deeptrace.faq.controller;

import com.deeptrace.faq.dto.SubmissionRequest;
import com.deeptrace.faq.dto.SubmissionResponse;
import com.deeptrace.faq.dto.SubmissionSummaryResponse;
import com.deeptrace.faq.dto.ResendEmailResponse;
import com.deeptrace.faq.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping
    public SubmissionResponse submit(@Valid @RequestBody SubmissionRequest request) {
        return submissionService.submit(request);
    }

    @GetMapping
    public List<SubmissionSummaryResponse> listLatest() {
        return submissionService.listLatest();
    }

    @PostMapping("/{id}/resend-email")
    public ResendEmailResponse resendEmail(@PathVariable Long id) {
        return submissionService.resendEmail(id);
    }
}

