#!/usr/bin/env python3
"""Generate user guide PDF for FAQ Questionnaire App"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors

# Create PDF
pdf_path = "Guida_Utente_FAQ_App.pdf"
doc = SimpleDocTemplate(pdf_path, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)

# Styles
styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#4f46e5'),
    spaceAfter=10,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold'
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=14,
    textColor=colors.HexColor('#1e293b'),
    spaceAfter=8,
    spaceBefore=8,
    fontName='Helvetica-Bold'
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['BodyText'],
    fontSize=11,
    textColor=colors.HexColor('#334155'),
    spaceAfter=6,
    alignment=TA_JUSTIFY,
    leading=16
)

# Build story
story = []

# Title
story.append(Paragraph("Guida Utente", title_style))
story.append(Paragraph("Applicazione Questionario FAQ", styles['Normal']))
story.append(Spacer(1, 0.5*cm))

# Introduction
story.append(Paragraph("Introduzione", heading_style))
story.append(Paragraph(
    "Questa guida spiega come usare l'applicazione per compilare il questionario FAQ "
    "(Functional Activities Questionnaire). L'app è disponibile sia da web (browser) che da mobile (iOS/Android con Expo Go).",
    body_style
))
story.append(Paragraph(
    "Il flusso principale è lo stesso su entrambe le versioni: compilazione del questionario, invio, "
    "consultazione dello storico e uso della sezione Admin quando è abilitato AWS SES come provider per l'invio delle email.",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 1: Main interface
story.append(Paragraph("Compilazione del Questionario", heading_style))
story.append(Paragraph(
    "<b>Passo 1: Dati del paziente</b><br/>"
    "Nella sezione principale, si inserisce l'indirizzo email del paziente. "
    "Questo campo è obbligatorio e verrà usato come indirizzo per inviare il report PDF al termine della compilazione.",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Passo 2: Selezione del soggetto</b><br/>"
    "Si seleziona chi sta compilando il questionario tra le opzioni:<br/>"
    "• <b>Paziente</b> - se è il paziente stesso<br/>"
    "• <b>Caregiver</b> - se è il caregiver/assistente<br/>"
    "• <b>Altro</b> - se si vuole specificare un'altra figura (ad esempio medico, infermiere, etc.)",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Passo 3: Compilazione delle 10 domande</b><br/>"
    "Si compilano tutte le domande usando la scala da 0 a 5, dove:<br/>"
    "• <b>0</b> = Attività svolta normalmente (autonomia completa)<br/>"
    "• <b>1</b> = Attività non svolta abitualmente, ma che il paziente sarebbe in grado di eseguire<br/>"
    "• <b>2</b> = Attività non svolta abitualmente e che, se eseguita, richiederebbe assistenza<br/>"
    "• <b>3</b> = Attività svolta in modo autonomo ma con difficoltà<br/>"
    "• <b>4</b> = Attività svolta solo con assistenza<br/>"
    "• <b>5</b> = Dipendenza completa",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Passo 4: Invio del questionario</b><br/>"
    "Una volta compilate tutte le domande, va selezionato il pulsante <b>\"Invia questionario\"</b>. "
    "Il sistema calcolerà il punteggio totale e genererà un report PDF che sarà inviato all'email inserita. "
    "In caso di indirizzo non verificato su SES, il questionario resta salvato e può essere inviato successivamente senza ricompilazione.",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 1b: Mobile usage
story.append(Paragraph("Uso da Mobile", heading_style))
story.append(Paragraph(
    "La versione mobile riprende le stesse funzionalità principali della versione web, ma organizzate in tab per una consultazione più comoda su smartphone e tablet.",
    body_style
))
story.append(Paragraph(
    "<b>Tab disponibili</b><br/>"
    "• <b>Questionario</b>: compilazione e invio del test FAQ<br/>"
    "• <b>Storico</b>: elenco delle ultime sottomissioni con paginazione e azione \"Reinvia PDF\"<br/>"
    "• <b>Admin</b>: gestione verifica SES e reinvio del report già compilato quando necessario",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 2: History
story.append(Paragraph("Visualizzazione dello Storico", heading_style))
story.append(Paragraph(
    "Nella sezione <b>\"Ultime sottomissioni\"</b> (o tab \"Storico\" su mobile), si può consultare "
    "l'elenco dei questionari compilati. Sono visibili i seguenti dettagli per ogni submissione:<br/>"
    "• <b>ID</b> - numero identificativo della submissione<br/>"
    "• <b>Email</b> - email del paziente<br/>"
    "• <b>Soggetto</b> - chi ha compilato il questionario<br/>"
    "• <b>Totale</b> - punteggio totale ottenuto<br/>"
    "• <b>Email inviata</b> - se il report è stato inviato per email<br/>"
    "• <b>Data</b> - quando è stata compilata",
    body_style
))
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph(
    "Ogni riga include il pulsante <b>\"Reinvia PDF\"</b>. Se l'indirizzo risulta non verificato su SES, "
    "la procedura guida verso la sezione Admin; dopo la verifica il report viene inviato senza dover reinserire il questionario.",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 3: Admin - SES verification
story.append(Paragraph("Pannello Admin - Verifica Indirizzi Email (SES)", heading_style))
story.append(Paragraph(
    "<b>Quando appare questa sezione?</b><br/>"
    "Le funzioni di verifica indirizzi email sono attive quando il sistema usa AWS SES "
    "(provider `ses` o SMTP SES). "
    "Nel frontend web si apre un popup contestuale in caso di errore di verifica; "
    "nell'app mobile la gestione è disponibile nella tab Admin.",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Come funziona</b><br/>"
    "AWS SES richiede la verifica di ogni indirizzo email prima di poter inviare email. "
    "Nel pannello Admin si può gestire questa verifica:<br/><br/>"
    "1. <b>Si inserisce l'indirizzo email</b> da registrare<br/>"
    "2. Viene selezionato <b>\"Invia richiesta verifica\"</b><br/>"
    "3. AWS invierà una email di verifica all'indirizzo inserito<br/>"
    "4. L'utente riceverà un'email con un link di conferma<br/>"
    "5. Dopo aver cliccato il link, l'indirizzo sarà verificato e potrà ricevere email dal sistema<br/>"
    "6. Il pulsante \"Aggiorna stato\" consente di riallineare lo stato e procedere al reinvio del report pendente",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Footer note
story.append(Paragraph(
    "<b>Nota importante:</b> Se il provider email è SMTP generico (es. Gmail), "
    "gli indirizzi email non richiedono verifica preliminare SES.",
    body_style
))

story.append(Spacer(1, 0.4*cm))
story.append(Paragraph("Accesso online", heading_style))
story.append(Paragraph(
    "L'applicazione è disponibile online al link:<br/>"
    "<b>http://deeptrace-backend-env.eba-huphpcvn.eu-west-1.elasticbeanstalk.com</b>",
    body_style
))
story.append(Paragraph(
    "Per una visualizzazione alternativa dei dati presenti sul database RDS si può usare anche:<br/>"
    "<b>http://deeptrace-backend-env.eba-huphpcvn.eu-west-1.elasticbeanstalk.com/api/submissions</b>",
    body_style
))

# Build PDF
doc.build(story)
print(f"✅ PDF creato: {pdf_path}")

