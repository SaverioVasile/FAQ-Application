package com.deeptrace.faq.service;

import com.deeptrace.faq.model.RespondentType;
import com.deeptrace.faq.model.Submission;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

class PdfReportServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldGenerateValidPdfContainingKeySubmissionData() throws Exception {
        PdfReportService service = new PdfReportService(false, tempDir.toString(), "Europe/Rome");
        Submission submission = buildSubmission();

        byte[] pdfBytes = service.generateReport(submission);

        Assertions.assertTrue(pdfBytes.length > 1000, "Il PDF generato dovrebbe avere contenuto");
        Assertions.assertEquals("%PDF", new String(pdfBytes, 0, 4));

        try (PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes));
             PdfDocument pdfDocument = new PdfDocument(reader)) {
            String firstPageText = PdfTextExtractor.getTextFromPage(pdfDocument.getPage(1));
            Assertions.assertTrue(firstPageText.contains("Report Questionario FAQ"));
            Assertions.assertTrue(firstPageText.contains("patient@example.com"));
            Assertions.assertTrue(firstPageText.contains("Punteggio totale: 21"));
        }
    }

    @Test
    void shouldSavePdfLocallyWhenEnabled() {
        PdfReportService service = new PdfReportService(true, tempDir.toString(), "Europe/Rome");
        byte[] pdfBytes = "fake-pdf-content".getBytes();

        service.saveReportIfEnabled("report-test.pdf", pdfBytes);

        Path savedFile = tempDir.resolve("report-test.pdf");
        Assertions.assertTrue(Files.exists(savedFile));
        Assertions.assertTrue(savedFile.toFile().length() > 0);
    }

    @Test
    void shouldNotSavePdfLocallyWhenDisabled() {
        PdfReportService service = new PdfReportService(false, tempDir.toString(), "Europe/Rome");

        service.saveReportIfEnabled("report-test.pdf", "fake-pdf-content".getBytes());

        Assertions.assertFalse(Files.exists(tempDir.resolve("report-test.pdf")));
    }

    private Submission buildSubmission() {
        Submission submission = new Submission();
        submission.setRespondentType(RespondentType.PAZIENTE);
        submission.setPatientEmail("patient@example.com");
        submission.setAnswersArray(new int[]{0, 1, 2, 3, 4, 5, 0, 1, 2, 3});
        submission.setTotalScore(21);
        submission.setSubmittedAt(Instant.parse("2026-03-18T09:00:00Z"));
        return submission;
    }
}

