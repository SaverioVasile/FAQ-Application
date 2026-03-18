package com.deeptrace.faq.service;

import com.deeptrace.faq.model.Submission;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
public class PdfReportService {

    private static final Logger log = LoggerFactory.getLogger(PdfReportService.class);

    private static final String[] QUESTION_LABELS = {
            "Compilare assegni, pagare bollette, conti e fatture, tenere la contabilita",
            "Compilare moduli e bollettini",
            "Acquistare vestiti, prodotti per la casa, alimentari",
            "Eseguire/partecipare ad un gioco di abilita, attivita ricreative, hobbies",
            "Far bollire l'acqua, preparare il caffe, spegnere la caldaia",
            "Preparare un pasto completo ed equilibrato",
            "Rimanere informato degli eventi correnti",
            "Prestare attenzione, comprendere e discutere programmi/libri/articoli",
            "Ricordare appuntamenti, ricorrenze, festivita, farmaci",
            "Spostarsi e viaggiare all'esterno del quartiere"
    };

    private final boolean saveLocal;
    private final Path outputDir;

    public PdfReportService(@Value("${app.pdf.save-local:false}") boolean saveLocal,
                            @Value("${app.pdf.output-dir:./reports}") String outputDir) {
        this.saveLocal = saveLocal;
        this.outputDir = Path.of(outputDir).normalize();
    }


    public byte[] generateReport(Submission submission) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(outputStream);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {

            document.add(new Paragraph("Report Questionario FAQ").setBold().setFontSize(16));
            document.add(new Paragraph("Email paziente: " + submission.getPatientEmail()));
            document.add(new Paragraph("Compilatore: " + submission.getRespondentType() +
                    (submission.getRespondentOther() != null && !submission.getRespondentOther().isBlank()
                            ? " (" + submission.getRespondentOther() + ")"
                            : "")));
            document.add(new Paragraph("Data compilazione: " + DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    .withZone(ZoneId.systemDefault())
                    .format(submission.getSubmittedAt())));
            document.add(new Paragraph("Punteggio totale: " + submission.getTotalScore()).setBold());

            Table table = new Table(new float[]{7, 1});
            table.setWidth(UnitValue.createPercentValue(100));
            table.addHeaderCell(new Cell().add(new Paragraph("Domanda").setBold()));
            table.addHeaderCell(new Cell().add(new Paragraph("Punteggio").setBold()));

            int[] answers = submission.getAnswersArray();
            for (int i = 0; i < answers.length; i++) {
                table.addCell(new Cell().add(new Paragraph((i + 1) + ". " + QUESTION_LABELS[i])));
                table.addCell(new Cell().add(new Paragraph(String.valueOf(answers[i]))));
            }

            document.add(table);
        } catch (Exception ex) {
            throw new IllegalStateException("Errore durante la generazione del PDF", ex);
        }

        return outputStream.toByteArray();
    }

    public void saveReportIfEnabled(String filename, byte[] pdfBytes) {
        if (!saveLocal) {
            return;
        }

        try {
            Path filePath = outputDir.resolve(Objects.requireNonNull(filename, "filename must not be null"));
            Files.createDirectories(outputDir);
            Files.write(filePath, Objects.requireNonNull(pdfBytes, "pdfBytes must not be null"));
            log.info("PDF salvato localmente in {}", filePath.toAbsolutePath());
        } catch (Exception ex) {
            throw new IllegalStateException("Errore durante il salvataggio locale del PDF", ex);
        }
    }
}
