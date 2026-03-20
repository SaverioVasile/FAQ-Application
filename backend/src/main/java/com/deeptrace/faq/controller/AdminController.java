package com.deeptrace.faq.controller;

import com.deeptrace.faq.dto.SesVerificationStatusResponse;
import com.deeptrace.faq.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final EmailService emailService;
    private final String mailProvider;
    private final boolean mailEnabled;
    private final String smtpHost;

    public AdminController(EmailService emailService,
                           @Value("${app.mail.provider:smtp}") String mailProvider,
                           @Value("${app.mail.enabled:false}") boolean mailEnabled,
                           @Value("${spring.mail.host:}") String smtpHost) {
        this.emailService = emailService;
        this.mailProvider = normalizeProvider(mailProvider);
        this.mailEnabled = mailEnabled;
        this.smtpHost = normalizeHost(smtpHost);
    }

    @GetMapping("/mail-config")
    public ResponseEntity<Map<String, Object>> getMailConfig() {
        boolean sesProvider = "ses".equals(mailProvider);
        boolean sesSmtp = "smtp".equals(mailProvider) && isSesSmtpHost(smtpHost);
        boolean sesAdminAvailable = mailEnabled && (sesProvider || sesSmtp);
        log.info("Mail config requested: provider={}, enabled={}, smtpHost={}, sesAdminAvailable={}",
                mailProvider, mailEnabled, smtpHost, sesAdminAvailable);
        return ResponseEntity.ok(Map.of(
                "mailProvider", mailProvider,
                "mailEnabled", mailEnabled,
                "smtpHost", smtpHost,
                "sesAdminAvailable", sesAdminAvailable
        ));
    }

    @PostMapping("/ses-verify-email")
    public ResponseEntity<Map<String, String>> requestSesEmailVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        log.info("SES verify request received for email={}", email);
        emailService.requestSesEmailVerification(email);
        log.info("SES verify request completed for email={}", email);
        return ResponseEntity.ok(Map.of(
                "message", "Richiesta di verifica inviata. Controlla la casella email e clicca sul link di conferma.",
                "email", email
        ));
    }

    @GetMapping("/ses-verification-status")
    public ResponseEntity<SesVerificationStatusResponse> getSesVerificationStatus(@RequestParam String email) {
        log.info("SES verification status requested for email={}", email);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(emailService.getSesEmailVerificationStatus(email));
    }

    private String normalizeProvider(String provider) {
        return provider == null ? "smtp" : provider.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeHost(String host) {
        return host == null ? "" : host.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isSesSmtpHost(String host) {
        return host.startsWith("email-smtp.") && host.endsWith("amazonaws.com");
    }
}

