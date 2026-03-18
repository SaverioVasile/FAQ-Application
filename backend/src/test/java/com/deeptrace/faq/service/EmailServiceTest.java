package com.deeptrace.faq.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

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
}

