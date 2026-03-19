# FAQ Questionnaire App

Applicazione end-to-end per la compilazione del questionario FAQ DeepTrace:

- Compilazione questionario (10 domande, scala 0–5)
- Salvataggio su PostgreSQL con calcolo punteggio
- Generazione automatica report PDF
- Invio report via email (SMTP o AWS SES)
- Salvataggio locale opzionale dei PDF generati (anche con email disabilitata)
- Visualizzazione storico sottomissioni
- Pannello admin per verifica indirizzi email SES

---

## Struttura del progetto

```
/
├── backend/        Spring Boot 3 (Java 17)
├── frontend/       Vue 3 + Vite + Tailwind CSS
├── mobile/         React Native (Expo)
├── docs/           Documentazione tecnica
└── docker-compose.yml
```

---

## Prerequisiti

| Strumento | Versione minima |
|---|---|
| Docker + Docker Compose | qualsiasi versione recente |
| Java 17 | solo per esecuzione senza Docker |
| Maven 3.8+ | solo per esecuzione senza Docker |
| Node.js 20+ | solo per esecuzione senza Docker |

Note pratiche:

- esegui i comandi Docker dalla **root del progetto**, cioe' dalla cartella che contiene `docker-compose.yml`
- su macOS puoi usare **Docker Desktop** oppure **Colima**
- su Windows puoi usare **Docker Desktop** con PowerShell o CMD

---

## Avvio rapido (Docker Compose)

Apri un terminale nella root del progetto:

```bash
cd /percorso/al/progetto/Test
```

**1. Copia e configura il file delle variabili d'ambiente:**

macOS / Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Windows CMD:

```bat
copy .env.example .env
```

Apri `.env` e compila almeno le variabili obbligatorie (vedi sezione Configurazione).

**2. Avvia tutti i container:**

```bash
docker compose up --build
```

Questo comando va bene su macOS, Linux e Windows. Al primo avvio il backend viene compilato dentro il container, quindi il build puo' richiedere un po' di tempo.

Nota: in locale `docker-compose.yml` usa `backend/Dockerfile.local`; `backend/Dockerfile` resta dedicato al package di deploy per Elastic Beanstalk.

**3. Accedi all'app:**

| Servizio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |

Per fermare i container:

```bash
docker compose down
```

---

## Configurazione

Tutte le variabili si impostano nel file `.env` nella root del progetto.

### Database

Seleziona il provider con `APP_DB_PROVIDER`:

```dotenv
# Usa PostgreSQL locale (container Docker) — default
APP_DB_PROVIDER=local
APP_DB_LOCAL_URL=jdbc:postgresql://postgres:5432/faqdb
APP_DB_LOCAL_USERNAME=faq
APP_DB_LOCAL_PASSWORD=faq

# Oppure usa AWS RDS
APP_DB_PROVIDER=rds
APP_DB_RDS_URL=jdbc:postgresql://<rds-endpoint>:5432/<database>
APP_DB_RDS_USERNAME=<username>
APP_DB_RDS_PASSWORD=<password>
```

### Email

Seleziona il provider con `APP_MAIL_PROVIDER` e abilita l'invio con `APP_MAIL_ENABLED`:

```dotenv
# Disabilitato (default): il flusso funziona ma non invia email
APP_MAIL_ENABLED=false

# Abilitato con SMTP
APP_MAIL_ENABLED=true
APP_MAIL_PROVIDER=smtp
SPRING_MAIL_HOST=smtp.example.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=user@example.com
SPRING_MAIL_PASSWORD=secret

# Abilitato con AWS SES (API)
APP_MAIL_ENABLED=true
APP_MAIL_PROVIDER=ses
APP_MAIL_FROM=noreply@yourdomain.com
APP_MAIL_SES_REGION=eu-west-1
APP_MAIL_SES_ACCESS_KEY=<aws-access-key>
APP_MAIL_SES_SECRET_KEY=<aws-secret-key>
```

> Se `APP_MAIL_ENABLED=false`, i dati vengono comunque salvati e il PDF viene comunque generato in memoria.

### Salvataggio locale dei PDF

Puoi salvare il report PDF su disco anche quando l'invio email è disabilitato:

```dotenv
APP_PDF_SAVE_LOCAL=true
APP_PDF_OUTPUT_DIR=./reports
```

- `APP_PDF_SAVE_LOCAL=false` (default): nessun file PDF viene salvato localmente
- `APP_PDF_SAVE_LOCAL=true`: il backend salva i report nella cartella indicata da `APP_PDF_OUTPUT_DIR`

Con Docker Compose, il default container-side è `APP_PDF_OUTPUT_DIR=/tmp/faq-reports`.

### Timezone applicativa

Per evitare differenze tra orario host e container nella data riportata nel PDF:

```dotenv
APP_TIMEZONE=Europe/Rome
```

---

## Esecuzione senza Docker (opzionale)

**Backend:**
```bash
cd backend
mvn spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Su Windows i comandi restano gli stessi se usi PowerShell o un terminale compatibile.

**Test backend:**
```bash
cd backend
mvn test -s ../.mvn-settings-personal.xml
```

Copertura minima attuale lato backend:
- `ScoreServiceTest` (calcolo punteggio e validazione risposte)
- `EmailServiceTest` (dispatch SMTP/SES e mail disabled)
- `PdfReportServiceTest` (generazione PDF valida e salvataggio locale opzionale)

---

## API principali

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/api/submissions` | Invia questionario |
| GET | `/api/submissions` | Lista sottomissioni |
| GET | `/api/admin/mail-config` | Stato provider mail per UI admin |
| POST | `/api/admin/ses-verify-email` | Richiedi verifica email SES |

**Payload POST `/api/submissions`:**
```json
{
  "respondentType": "CAREGIVER",
  "respondentOther": null,
  "patientEmail": "paziente@example.com",
  "answers": [0, 1, 2, 3, 4, 5, 0, 1, 2, 3]
}
```

---

## Deploy AWS

Per il deploy su AWS (Elastic Beanstalk + S3 + RDS + SES) consulta [`docs/aws-migration.md`](docs/aws-migration.md).

### Backend su Elastic Beanstalk

Per Beanstalk il backend usa `backend/Dockerfile` e un jar gia' compilato.

Build del jar:

```bash
cd backend
mvn clean package
```

Creazione dello zip di deploy:

```bash
cd backend
bash package-beanstalk.sh
```

Il file generato e' `backend/backend-beanstalk.zip` e contiene:

- `Dockerfile`
- `target/faq-backend-0.0.1-SNAPSHOT.jar`

In sintesi:

- locale: `docker compose up --build`
- Elastic Beanstalk: `mvn clean package` + `bash package-beanstalk.sh`

