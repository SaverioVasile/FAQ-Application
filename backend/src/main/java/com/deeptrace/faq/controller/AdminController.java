package com.deeptrace.faq.controller;

import com.deeptrace.faq.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final EmailService emailService;

    public AdminController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/ses-verify-email")
    public ResponseEntity<Map<String, String>> requestSesEmailVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        emailService.requestSesEmailVerification(email);
        return ResponseEntity.ok(Map.of(
                "message", "Richiesta di verifica inviata. Controlla la casella email e clicca sul link di conferma.",
                "email", email
        ));
    }
}

