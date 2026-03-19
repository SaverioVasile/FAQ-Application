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
story.append(Paragraph("Benvenuto", heading_style))
story.append(Paragraph(
    "Questa guida ti spiega come usare l'applicazione per compilare il questionario FAQ "
    "(Functional Activities Questionnaire). L'app è disponibile sia da web (browser) che da mobile (iOS/Android con Expo Go).",
    body_style
))
story.append(Paragraph(
    "Il flusso principale è lo stesso su entrambe le versioni: compilazione del questionario, invio, "
    "consultazione dello storico e, quando disponibile, uso della sezione Admin per SES.",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 1: Main interface
story.append(Paragraph("Compilazione del Questionario", heading_style))
story.append(Paragraph(
    "<b>Passo 1: Inserisci i dati del paziente</b><br/>"
    "Nella sezione principale, inserisci l'indirizzo email del paziente. "
    "Questo campo è obbligatorio e riceverà il report PDF al termine della compilazione.",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Passo 2: Seleziona il compilatore</b><br/>"
    "Scegli chi sta compilando il questionario tra le opzioni:<br/>"
    "• <b>Paziente</b> - se è il paziente stesso<br/>"
    "• <b>Caregiver</b> - se è il caregiver/assistente<br/>"
    "• <b>Altro</b> - se vuoi specificare un'altra figura (ad esempio medico, infermiere, etc.)",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Passo 3: Rispondi alle 10 domande</b><br/>"
    "Compila tutte le domande usando la scala da 0 a 5, dove:<br/>"
    "• <b>0</b> = Normale, senza difficoltà<br/>"
    "• <b>1</b> = Normalmente, senza difficoltà, con qualche incertezza<br/>"
    "• <b>2</b> = Normalmente, con molta difficoltà<br/>"
    "• <b>3</b> = Non normalmente, con molta difficoltà; utente non è capace di svolgere compiti non abituali<br/>"
    "• <b>4</b> = Non normalmente, con molta difficoltà; utente non è capace di svolgere compiti abituali<br/>"
    "• <b>5</b> = Incapace di compiere il compito per qualsiasi motivo",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Passo 4: Invia il questionario</b><br/>"
    "Una volta compilate tutte le domande, clicca il pulsante <b>\"Invia questionario\"</b>. "
    "Il sistema calcolerà il punteggio totale e genererà un report PDF che sarà inviato all'email inserita.",
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
    "• <b>Storico</b>: elenco delle ultime submissioni con aggiornamento rapido<br/>"
    "• <b>Admin</b>: compare solo quando la verifica indirizzi SES è disponibile",
    body_style
))
story.append(Paragraph(
    "Se usi l'app da mobile, quindi, non devi imparare un flusso diverso: cambia soprattutto la navigazione, mentre i dati richiesti e il risultato finale restano gli stessi della versione web.",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 2: History
story.append(Paragraph("Visualizzazione dello Storico", heading_style))
story.append(Paragraph(
    "Nella sezione <b>\"Ultime sottomissioni\"</b> (o tab \"Storico\" su mobile), puoi consultare "
    "l'elenco dei questionari compilati. Vedrai i seguenti dettagli per ogni submissione:<br/>"
    "• <b>ID</b> - numero identificativo della submissione<br/>"
    "• <b>Email</b> - email del paziente<br/>"
    "• <b>Compilatore</b> - chi ha compilato il questionario<br/>"
    "• <b>Totale</b> - punteggio totale ottenuto<br/>"
    "• <b>Email inviata</b> - se il report è stato inviato per email<br/>"
    "• <b>Data</b> - quando è stata compilata",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Section 3: Admin - SES verification
story.append(Paragraph("Pannello Admin - Verifica Indirizzi Email (SES)", heading_style))
story.append(Paragraph(
    "<b>Quando appare questa sezione?</b><br/>"
    "La sezione admin per la verifica degli indirizzi email appare <b>solo</b> quando "
    "il sistema sta usando AWS SES per la gestione delle email. "
    "Quando SES non è attivo, questa sezione non sarà visibile né nella web app né nell'app mobile.",
    body_style
))
story.append(Spacer(1, 0.2*cm))

story.append(Paragraph(
    "<b>Come funziona</b><br/>"
    "AWS SES richiede la verifica di ogni indirizzo email prima di poter inviare email. "
    "Nel pannello Admin puoi gestire questa verifica:<br/><br/>"
    "1. <b>Inserisci l'indirizzo email</b> che vuoi registrare<br/>"
    "2. Clicca <b>\"Invia richiesta verifica\"</b><br/>"
    "3. AWS invierà una email di verifica all'indirizzo inserito<br/>"
    "4. L'utente riceverà un'email con un link di conferma<br/>"
    "5. Dopo aver cliccato il link, l'indirizzo sarà verificato e potrà ricevere email dal sistema",
    body_style
))
story.append(Spacer(1, 0.3*cm))

# Footer note
story.append(Paragraph(
    "<b>Nota importante:</b> Se il provider email è SMTP (es. Gmail), "
    "gli indirizzi email non richiedono verifica preliminare e il pannello Admin non sarà disponibile.",
    body_style
))

# Build PDF
doc.build(story)
print(f"✅ PDF creato: {pdf_path}")

