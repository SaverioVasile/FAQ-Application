package com.deeptrace.faq.service;

import com.deeptrace.faq.dto.SubmissionRequest;
import com.deeptrace.faq.dto.SubmissionResponse;
import com.deeptrace.faq.dto.SubmissionSummaryResponse;
import com.deeptrace.faq.model.RespondentType;
import com.deeptrace.faq.model.Submission;
import com.deeptrace.faq.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);

    private final SubmissionRepository submissionRepository;
    private final ScoreService scoreService;
    private final PdfReportService pdfReportService;
    private final EmailService emailService;
    private final ZoneId appZoneId;

    public SubmissionService(SubmissionRepository submissionRepository,
                             ScoreService scoreService,
                             PdfReportService pdfReportService,
                             EmailService emailService,
                             @Value("${app.timezone:Europe/Rome}") String appTimezone) {
        this.submissionRepository = submissionRepository;
        this.scoreService = scoreService;
        this.pdfReportService = pdfReportService;
        this.emailService = emailService;
        this.appZoneId = ZoneId.of(appTimezone);
    }

    @Transactional
    public SubmissionResponse submit(SubmissionRequest request) {
        log.info("Ricevuta nuova submission per email={}", request.getPatientEmail());

        scoreService.validateAnswers(request.getAnswers());
        log.info("Validazione risposte completata per email={}", request.getPatientEmail());

        validateRespondent(request);
        log.info("Validazione tipo compilatore completata per email={}", request.getPatientEmail());

        Submission submission = new Submission();
        submission.setRespondentType(request.getRespondentType());
        submission.setRespondentOther(request.getRespondentOther());
        submission.setPatientEmail(request.getPatientEmail());

        int[] answers = request.getAnswers().stream().mapToInt(Integer::intValue).toArray();
        submission.setAnswersArray(answers);
        submission.setTotalScore(scoreService.calculateTotal(request.getAnswers()));
        submission.setEmailSent(false);

        Submission saved = submissionRepository.save(submission);
        log.info("Questionario salvato su DB con id={} e punteggio={}", saved.getId(), saved.getTotalScore());

        byte[] reportBytes = pdfReportService.generateReport(saved);
        String fileName = "report-faq-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(saved.getSubmittedAt().atZone(appZoneId)) + ".pdf";
        log.info("Report PDF generato per submission id={} con filename={}", saved.getId(), fileName);
        try {
            pdfReportService.saveReportIfEnabled(fileName, reportBytes);
        } catch (Exception ex) {
            log.warn("Impossibile salvare localmente il report PDF per submission id={}: {}", saved.getId(), ex.getMessage());
        }

        String message = "Questionario salvato correttamente.";
        try {
            boolean sent = emailService.sendReport(saved.getPatientEmail(), reportBytes, fileName);
            saved.setEmailSent(sent);
            if (!sent) {
                message = "Questionario salvato. Invio email disabilitato localmente (app.mail.enabled=false).";
                log.info("Questionario id={} salvato. Invio email disabilitato.", saved.getId());
            } else {
                log.info("Questionario id={} salvato e email inviata con successo.", saved.getId());
            }
        } catch (Exception ex) {
            log.error("Errore durante l'invio email per submission id={}", saved.getId(), ex);
            saved.setEmailSent(false);
            saved.setEmailError(ex.getMessage());
            message = "Questionario salvato, ma invio email fallito: " + ex.getMessage();
        }

        submissionRepository.save(saved);
        log.info("Stato finale submission id={} salvato. emailSent={}, message='{}'", saved.getId(), saved.getEmailSent(), message);
        return new SubmissionResponse(saved.getId(), saved.getTotalScore(), saved.getEmailSent(), message);
    }

    public List<SubmissionSummaryResponse> listLatest() {
        return submissionRepository.findTop50ByOrderBySubmittedAtDesc()
                .stream()
                .map(s -> new SubmissionSummaryResponse(
                        s.getId(),
                        s.getPatientEmail(),
                        s.getRespondentType(),
                        s.getTotalScore(),
                        java.util.Arrays.stream(s.getAnswersArray()).boxed().toList(),
                        s.getEmailSent(),
                        s.getSubmittedAt()
                ))
                .toList();
    }

    private void validateRespondent(SubmissionRequest request) {
        if (request.getRespondentType() == RespondentType.ALTRO
                && (request.getRespondentOther() == null || request.getRespondentOther().isBlank())) {
            throw new IllegalArgumentException("Se il compilatore e ALTRO, specificare il valore in respondentOther.");
        }
    }
}

