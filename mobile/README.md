# FAQ Mobile – Expo (React Native)

App mobile per la somministrazione del questionario FAQ (Functional Activities Questionnaire), sviluppata con **Expo** e **React Native**. Utilizza lo stesso backend del progetto principale.

## Struttura

```
mobile/
├── App.js                        # Entry point, navigazione a tab
├── app.json                      # Configurazione Expo
├── babel.config.js
├── package.json
└── src/
    ├── config.js                 # URL del backend
    ├── constants/
    │   └── questions.js          # Domande e legenda punteggio
    ├── services/
    │   └── api.js                # Chiamate HTTP al backend
    └── screens/
        ├── QuestionnaireScreen.js  # Form FAQ
        ├── SubmissionsScreen.js    # Storico sottomissioni
        └── AdminScreen.js          # Verifica SES + reinvio pending
```

## Prerequisiti

- [Node.js](https://nodejs.org/) >= 18
- [Expo](https://docs.expo.dev/get-started/installation/) (usato via `npx expo`)
- App **Expo Go** sul dispositivo mobile (iOS o Android)

## Avvio

```bash
cd mobile
npm install
cp .env.example .env
# Modifica .env se usi un dispositivo fisico (vedi sotto)
npx expo start --clear
```

Expo aprirà un QR code nel terminale o nel browser. Scansionalo con l'app **Expo Go** sul telefono.

## Configurazione URL backend

| Variabile | Descrizione |
|---|---|
| `EXPO_PUBLIC_API_TARGET` | `local` oppure `public` |
| `EXPO_PUBLIC_API_BASE_URL_LOCAL` | URL backend locale |
| `EXPO_PUBLIC_API_BASE_URL_PUBLIC` | URL backend pubblico |
| `EXPO_PUBLIC_API_BASE_URL` | Override diretto (opzionale, ha priorita') |

Nota: se lasci `EXPO_PUBLIC_API_TARGET` non valorizzato e imposti solo `EXPO_PUBLIC_API_BASE_URL_PUBLIC`, l'app usa automaticamente il target `public`.

Esempio rapido in `.env`:

```dotenv
EXPO_PUBLIC_API_TARGET=local
EXPO_PUBLIC_API_BASE_URL_LOCAL=http://192.168.1.20:8080
EXPO_PUBLIC_API_BASE_URL_PUBLIC=https://your-backend.example.com
```

Valori consigliati per `EXPO_PUBLIC_API_BASE_URL_LOCAL`:
- Dispositivo fisico (Expo Go): `http://<IP_LAN_DEL_PC>:8080`
- iOS Simulator: `http://localhost:8080`
- Android Emulator: `http://10.0.2.2:8080`

Per puntare all'istanza pubblica basta cambiare:

```dotenv
EXPO_PUBLIC_API_TARGET=public
```

Debug in-app (Expo Go):

- Compare un box `Debug API` in basso con `target`, `base URL` e ultime chiamate HTTP.
- Se non lo vuoi vedere: imposta `EXPO_PUBLIC_SHOW_DEBUG_OVERLAY=false`.
- Se cambi `.env`, riavvia Expo con cache pulita: `npx expo start --clear`.

Per trovare il tuo IP locale su macOS: `ipconfig getifaddr en0`

## Funzionalità

- **Tab "Questionario"**: compilazione FAQ con validazione, invio e messaggi di esito (`success` o `warning` se invio email fallisce)
- **Tab "Storico"**: elenco sottomissioni con paginazione (5 elementi), bottone sempre visibile `Reinvia PDF` e controlli SES prima del reinvio
- **Tab "Admin"**: gestione verifica email SES (invio richiesta, aggiorna stato, reinvio report già compilato quando verifica completata)
- In modalità non SES la tab Admin resta visibile ma informa che la funzionalità non è disponibile con la configurazione corrente

