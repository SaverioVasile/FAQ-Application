package com.deeptrace.faq.service;

import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
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
import software.amazon.awssdk.services.ses.model.RawMessage;
import software.amazon.awssdk.services.ses.model.SendRawEmailRequest;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Objects;
import java.util.Properties;

@Service
public class EmailService {

    private static final String PROVIDER_SMTP = "smtp";
    private static final String PROVIDER_SES = "ses";

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String fromAddress;
    private final String provider;
    private final SesClient sesClient;

    public EmailService(JavaMailSender mailSender,
                        @Value("${app.mail.enabled:false}") boolean mailEnabled,
                        @Value("${app.mail.from:no-reply@example.com}") String fromAddress,
                        @Value("${app.mail.provider:smtp}") String provider,
                        @Value("${app.mail.ses.region:eu-west-1}") String sesRegion,
                        @Value("${app.mail.ses.access-key:}") String sesAccessKey,
                        @Value("${app.mail.ses.secret-key:}") String sesSecretKey) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress;
        this.provider = provider.toLowerCase(Locale.ROOT);
        this.sesClient = buildSesClient(sesRegion, sesAccessKey, sesSecretKey);
    }

    public boolean sendReport(String recipient, byte[] pdfBytes, String filename) throws MessagingException, IOException {
        if (!mailEnabled) {
            return false;
        }

        if (PROVIDER_SES.equals(provider)) {
            sendViaSes(recipient, pdfBytes, filename);
            return true;
        }

        if (!PROVIDER_SMTP.equals(provider)) {
            throw new IllegalArgumentException("Provider email non supportato: " + provider + ". Usa 'smtp' o 'ses'.");
        }

        sendViaSmtp(recipient, pdfBytes, filename);
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

        sesClient.sendRawEmail(request);
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
}
