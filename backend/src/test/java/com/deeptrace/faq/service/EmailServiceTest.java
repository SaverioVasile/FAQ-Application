package com.deeptrace.faq.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSender;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.GetIdentityVerificationAttributesRequest;
import software.amazon.awssdk.services.ses.model.GetIdentityVerificationAttributesResponse;
import software.amazon.awssdk.services.ses.model.IdentityVerificationAttributes;
import software.amazon.awssdk.services.ses.model.VerificationStatus;

import java.lang.reflect.Proxy;
import java.util.Map;
import java.util.Properties;
import java.util.function.Function;

class EmailServiceTest {

    @Test
    void shouldUseSpringMailWhenProviderIsSmtpEvenWithoutSesConfiguration() throws Exception {
        JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        Mockito.when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        EmailService emailService = new EmailService(
                mailSender,
                true,
                "no-reply@example.com",
                " smtp ",
                null,
                "",
                ""
        );

        boolean sent = emailService.sendReport("user@example.com", "pdf".getBytes(), "report.pdf");

        Assertions.assertTrue(sent);
        Mockito.verify(mailSender).createMimeMessage();
        Mockito.verify(mailSender).send(mimeMessage);
        Mockito.verifyNoMoreInteractions(mailSender);
    }

    @Test
    void shouldNotSendAnythingWhenMailIsDisabled() throws Exception {
        JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);

        EmailService emailService = new EmailService(
                mailSender,
                false,
                "no-reply@example.com",
                "smtp",
                null,
                "",
                ""
        );

        boolean sent = emailService.sendReport("user@example.com", "pdf".getBytes(), "report.pdf");

        Assertions.assertFalse(sent);
        Mockito.verifyNoInteractions(mailSender);
    }

    @Test
    void shouldRejectSesVerificationWhenProviderIsNotSes() {
        JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
        EmailService emailService = new EmailService(
                mailSender,
                true,
                "no-reply@example.com",
                "smtp",
                null,
                "",
                ""
        );

        IllegalStateException ex = Assertions.assertThrows(
                IllegalStateException.class,
                () -> emailService.requestSesEmailVerification("user@example.com")
        );

        Assertions.assertTrue(ex.getMessage().contains("provider SES"));
    }

    @Test
    void shouldReturnPendingWhenSesVerificationExists() {
        JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
        SesClient sesClient = sesClientFor(request -> GetIdentityVerificationAttributesResponse.builder()
                .verificationAttributes(Map.of(
                        "user@example.com",
                        IdentityVerificationAttributes.builder()
                                .verificationStatus(VerificationStatus.PENDING)
                                .build()
                ))
                .build());

        EmailService emailService = new EmailService(
                mailSender,
                true,
                "no-reply@example.com",
                "ses",
                "eu-west-1",
                "key",
                "secret",
                sesClient
        );

        var status = emailService.getSesEmailVerificationStatus("user@example.com");

        Assertions.assertEquals("pending", status.status());
        Assertions.assertFalse(status.verified());
        Assertions.assertTrue(status.pending());
    }

    @Test
    void shouldReturnNotRequestedWhenSesVerificationDoesNotExist() {
        JavaMailSender mailSender = Mockito.mock(JavaMailSender.class);
        SesClient sesClient = sesClientFor(request -> GetIdentityVerificationAttributesResponse.builder()
                .verificationAttributes(Map.of())
                .build());

        EmailService emailService = new EmailService(
                mailSender,
                true,
                "no-reply@example.com",
                "ses",
                "eu-west-1",
                "key",
                "secret",
                sesClient
        );

        var status = emailService.getSesEmailVerificationStatus("user@example.com");

        Assertions.assertEquals("not-requested", status.status());
        Assertions.assertFalse(status.verified());
        Assertions.assertFalse(status.pending());
    }

    private SesClient sesClientFor(Function<GetIdentityVerificationAttributesRequest, GetIdentityVerificationAttributesResponse> handler) {
        return (SesClient) Proxy.newProxyInstance(
                SesClient.class.getClassLoader(),
                new Class[]{SesClient.class},
                (proxy, method, args) -> {
                    if ("getIdentityVerificationAttributes".equals(method.getName())) {
                        return handler.apply((GetIdentityVerificationAttributesRequest) args[0]);
                    }
                    if ("close".equals(method.getName())) {
                        return null;
                    }
                    if ("serviceName".equals(method.getName())) {
                        return "ses";
                    }
                    throw new UnsupportedOperationException("Method not supported in test: " + method.getName());
                }
        );
    }
}

