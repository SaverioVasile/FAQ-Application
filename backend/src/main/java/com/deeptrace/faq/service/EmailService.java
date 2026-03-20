package com.deeptrace.faq.service;

import com.deeptrace.faq.dto.SesVerificationStatusResponse;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.SesClientBuilder;
import software.amazon.awssdk.services.ses.model.GetIdentityVerificationAttributesRequest;
import software.amazon.awssdk.services.ses.model.IdentityVerificationAttributes;
import software.amazon.awssdk.services.ses.model.RawMessage;
import software.amazon.awssdk.services.ses.model.SendRawEmailRequest;
import software.amazon.awssdk.services.ses.model.SendRawEmailResponse;
import software.amazon.awssdk.services.ses.model.SesException;
import software.amazon.awssdk.services.ses.model.VerifyEmailIdentityRequest;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Objects;
import java.util.Properties;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final String PROVIDER_SMTP = "smtp";
    private static final String PROVIDER_SES = "ses";

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String fromAddress;
    private final String provider;
    private final SesClient sesClient;

    @Autowired
    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.enabled:false}") boolean mailEnabled,
                        @Value("${app.mail.from:no-reply@example.com}") String fromAddress,
                        @Value("${app.mail.provider:smtp}") String provider,
                        @Value("${app.mail.ses.region:eu-west-1}") String sesRegion,
                        @Value("${app.mail.ses.access-key:}") String sesAccessKey,
                        @Value("${app.mail.ses.secret-key:}") String sesSecretKey) {
        this(mailSender, mailEnabled, fromAddress, provider, sesRegion, sesAccessKey, sesSecretKey, null);
    }

    EmailService(JavaMailSender mailSender,
                 boolean mailEnabled,
                 String fromAddress,
                 String provider,
                 String sesRegion,
                 String sesAccessKey,
                 String sesSecretKey,
                 SesClient sesClientOverride) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress;
        this.provider = normalizeProvider(provider);
        this.sesClient = PROVIDER_SES.equals(this.provider)
                ? (sesClientOverride != null ? sesClientOverride : buildSesClient(sesRegion, sesAccessKey, sesSecretKey))
                : null;

        log.info("EmailService initialized - enabled={}, provider={}, from={}, sesRegion={}, hasCustomSesCredentials={}",
                this.mailEnabled,
                this.provider,
                this.fromAddress,
                sesRegion,
                sesAccessKey != null && !sesAccessKey.isBlank() && sesSecretKey != null && !sesSecretKey.isBlank());
    }

    public boolean sendReport(String recipient, byte[] pdfBytes, String filename) throws MessagingException, IOException {
        if (!mailEnabled) {
            log.info("Email sending disabled (app.mail.enabled=false). Skipping send for recipient={}, filename={}", recipient, filename);
            return false;
        }

        log.info("Preparing email report for recipient={}, filename={}, provider={}", recipient, filename, provider);

        if (PROVIDER_SES.equals(provider)) {
            log.info("Sending email via SES to recipient={}", recipient);
            sendViaSes(recipient, pdfBytes, filename);
            log.info("Email via SES sent successfully to recipient={}", recipient);
            return true;
        }

        if (!PROVIDER_SMTP.equals(provider)) {
            throw new IllegalArgumentException("Provider email non supportato: " + provider + ". Usa 'smtp' o 'ses'.");
        }

        log.info("Sending email via SMTP to recipient={}", recipient);
        sendViaSmtp(recipient, pdfBytes, filename);
        log.info("Email via SMTP sent successfully to recipient={}", recipient);
        return true;
    }

    private void sendViaSmtp(String recipient, byte[] pdfBytes, String filename) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(Objects.requireNonNull(fromAddress, "fromAddress must not be null"));
        helper.setTo(Objects.requireNonNull(recipient, "recipient must not be null"));
        helper.setCc(Objects.requireNonNull(fromAddress, "fromAddress must not be null"));
        helper.setSubject("Report questionario FAQ");
        helper.setText("In allegato trovi il report PDF del questionario FAQ.");
        helper.addAttachment(
                Objects.requireNonNull(filename, "filename must not be null"),
                new ByteArrayResource(Objects.requireNonNull(pdfBytes, "pdfBytes must not be null"))
        );

        mailSender.send(message);
    }

    private void sendViaSes(String recipient, byte[] pdfBytes, String filename) throws MessagingException, IOException {
        SesClient activeSesClient = requireSesClient();

        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(Objects.requireNonNull(fromAddress, "fromAddress must not be null"));
        helper.setTo(Objects.requireNonNull(recipient, "recipient must not be null"));
        helper.setCc(Objects.requireNonNull(fromAddress, "fromAddress must not be null"));
        helper.setSubject("Report questionario FAQ");
        helper.setText("In allegato trovi il report PDF del questionario FAQ.");
        helper.addAttachment(
                Objects.requireNonNull(filename, "filename must not be null"),
                new ByteArrayResource(Objects.requireNonNull(pdfBytes, "pdfBytes must not be null"))
        );

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        message.writeTo(outputStream);

        SendRawEmailRequest request = SendRawEmailRequest.builder()
                .rawMessage(RawMessage.builder().data(SdkBytes.fromByteArray(outputStream.toByteArray())).build())
                .build();

        SendRawEmailResponse response = activeSesClient.sendRawEmail(request);
        log.info("SES sendRawEmail completed. messageId={}", response.messageId());
    }

    private SesClient buildSesClient(String sesRegion, String sesAccessKey, String sesSecretKey) {
        SesClientBuilder builder = SesClient.builder().region(Region.of(sesRegion));

        if (sesAccessKey != null && !sesAccessKey.isBlank() && sesSecretKey != null && !sesSecretKey.isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(sesAccessKey, sesSecretKey)
            ));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }

    public void requestSesEmailVerification(String email) {
        ensureSesVerificationAvailable(email);

        log.info("Richiesta verifica email SES per email={}", email);
        VerifyEmailIdentityRequest request = VerifyEmailIdentityRequest.builder()
                .emailAddress(Objects.requireNonNull(email, "email must not be null"))
                .build();
        try {
            requireSesClient().verifyEmailIdentity(request);
        } catch (SesException ex) {
            int statusCode = ex.statusCode();
            log.error("Errore SES durante verifyEmailIdentity per email={} (status={}, requestId={}): {}",
                    email, statusCode, ex.requestId(), ex.awsErrorDetails() != null ? ex.awsErrorDetails().errorMessage() : ex.getMessage());
            throw new IllegalStateException(mapSesVerificationError(statusCode, ex));
        }
    }

    public SesVerificationStatusResponse getSesEmailVerificationStatus(String email) {
        ensureSesVerificationAvailable(email);

        try {
            var response = requireSesClient().getIdentityVerificationAttributes(
                    GetIdentityVerificationAttributesRequest.builder()
                            .identities(email)
                            .build()
            );

            IdentityVerificationAttributes attributes = response.verificationAttributes().get(email);
            if (attributes == null || attributes.verificationStatus() == null) {
                log.info("Nessuno stato verifica SES trovato per email={}", email);
                return new SesVerificationStatusResponse(email, "not-requested", "NOT_REQUESTED", false, false);
            }

            String rawStatus = attributes.verificationStatusAsString();
            String normalizedStatus = normalizeSesVerificationStatus(rawStatus);
            boolean verified = "success".equals(normalizedStatus);
            boolean pending = "pending".equals(normalizedStatus);

            log.info("Stato verifica SES per email={}: rawStatus={}, normalizedStatus={}", email, rawStatus, normalizedStatus);
            return new SesVerificationStatusResponse(email, normalizedStatus, rawStatus, verified, pending);
        } catch (SesException ex) {
            int statusCode = ex.statusCode();
            log.error("Errore SES durante getIdentityVerificationAttributes per email={} (status={}, requestId={}): {}",
                    email, statusCode, ex.requestId(), ex.awsErrorDetails() != null ? ex.awsErrorDetails().errorMessage() : ex.getMessage());
            throw new IllegalStateException(mapSesStatusError(statusCode));
        }
    }

    private void ensureSesVerificationAvailable(String email) {
        if (!mailEnabled || !PROVIDER_SES.equals(provider)) {
            log.warn("Operazione verifica SES ignorata per email={} perché provider={} o mailEnabled={}", email, provider, mailEnabled);
            throw new IllegalStateException("Verifica email disponibile solo quando il provider SES è attivo (app.mail.enabled=true, app.mail.provider=ses).");
        }
    }

    private String normalizeSesVerificationStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return "unknown";
        }

        return switch (rawStatus.trim().toUpperCase(Locale.ROOT)) {
            case "SUCCESS" -> "success";
            case "PENDING" -> "pending";
            case "FAILED" -> "failed";
            case "TEMPORARY_FAILURE" -> "temporary-failure";
            default -> "unknown";
        };
    }

    private String mapSesVerificationError(int statusCode, SesException ex) {
        String raw = ex != null && ex.getMessage() != null ? ex.getMessage().toLowerCase(Locale.ROOT) : "";
        if (raw.contains("not verified") || raw.contains("email address is not verified")) {
            return "Indirizzo email non verificato";
        }
        if (statusCode == 403) {
            return "Permessi insufficienti per richiedere la verifica email su SES";
        }
        return "Errore durante la richiesta di verifica email";
    }

    private String mapSesStatusError(int statusCode) {
        if (statusCode == 403) {
            return "Permessi insufficienti per leggere lo stato di verifica email su SES";
        }
        return "Errore durante il recupero dello stato di verifica email";
    }

    private String normalizeProvider(String provider) {
        return Objects.requireNonNullElse(provider, PROVIDER_SMTP)
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private SesClient requireSesClient() {
        if (sesClient == null) {
            throw new IllegalStateException("SES client non inizializzato perché app.mail.provider non è impostato su 'ses'.");
        }
        return sesClient;
    }
}
